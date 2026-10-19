# Modelul de date și formatul proiectului

## 1. Principii

Proiectul este sursa de adevăr pentru coordonate, reguli și variante.
Rezultatele calculate sunt regenerabile și trebuie asociate versiunii
calculului. Importul nu execută conținut și nu modifică starea activă înainte
de validare.

În prototipul curent este implementat numai `EPSG:4326`. Modelul și validatorul
resping alte CRS-uri; Stereo 70 va deveni importabil doar după ce conversia
Pulkovo 1942(58) ↔ WGS84 este implementată și verificată cu date de referință.

## 2. Entități

### Proiect

- `format`: constantă `volumetrie-project`;
- `schemaVersion`: versiunea întreagă a formatului;
- `calculationVersion`: versiunea regulilor de calcul;
- `id`, `name`, `description`;
- `createdAt`, `updatedAt` în ISO 8601;
- `units`: lungime `m`, arie `m2`;
- `site`, `regulations`, `variants`.

### Teren

- `crs`: `EPSG:4326` sau `EPSG:3844`;
- `coordinateOrder`: `["latitude", "longitude"]` pentru EPSG:4326 sau
  `["northing", "easting"]` pentru EPSG:3844;
- `vertices`: listă ordonată
  `{ id, ordinate1, ordinate2, label? }`, cu semnificațiile definite de
  `coordinateOrder`;
- `geometryInputMethod`: `map` sau `manual`;
- `digitization`: metadate opționale `{ provider, capturedAt, note }`;
- EPSG:3844 folosește axele oficiale X/Northing apoi Y/Easting; adaptoarele la
  biblioteci care folosesc convenția easting/northing trebuie să normalizeze
  ordinea explicit, fără să schimbe CRS-ul;
- `referenceAreaM2`: opțional;
- `areaSource`: `calculated`, `survey` sau `user`;
- `orientation`, `source`, `notes`.

### Reguli

- `potMaxPercent`, `cutMax`, `maxHeightM`, `maxAboveGroundLevels`, opționale;
- `uniformSetbackM`: câmp legacy de compatibilitate la import; interfața nouă
  configurează retragerile individual la nivel de variantă;
- `alignmentSides`: maximum două valori dintre `N`, `S`, `E`, `V`, `NE`, `NV`,
  `SE`, `SV`; fiecare opțiune indică latura sau colțul la care amprenta se
  aliniază paralel, la retragerea variantei;
- `referenceAreaMode`: `survey` sau `calculated`;
- `floorAreaMethod` și eventuale corecții documentate;
- `source`: referință, dată și note.

### Variantă

- `id`, `name`, `status`;
- `widthM`, `depthM`, `rotationDegrees`: dimensiunile amprentei dreptunghiulare
  și unghiul față de nord în grade;
- `setbackDirections`: retrageri proprii `{ north, south, east, west }` în metri;
- `roofType`: `none`, `flat`, `mono`, `gable` sau `hip`;
- `roofPitchDeg`: pantă în grade pentru tipurile înclinate;
- `levels`: înălțime parter, înălțime tip etaj și număr de etaje;
- `roof`: `flat` în MVP;
- `grossFloorAreaOverrideM2` și justificare opționale;
- `notes`;
- `derived`: cache opțional asociat cu `calculationVersion`.

## 3. Exemplu de structură

```json
{
  "format": "volumetrie-project",
  "schemaVersion": 1,
  "calculationVersion": "1",
  "project": {
    "id": "uuid",
    "name": "Studiu parcelă",
    "description": "",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z",
    "units": { "length": "m", "area": "m2" },
    "site": {
      "crs": "EPSG:3844",
      "coordinateOrder": ["northing", "easting"],
      "vertices": [
        { "id": "v1", "ordinate1": 500000, "ordinate2": 500000, "label": "1" },
        { "id": "v2", "ordinate1": 500000, "ordinate2": 500020, "label": "2" },
        { "id": "v3", "ordinate1": 500015, "ordinate2": 500020, "label": "3" }
      ],
      "geometryInputMethod": "map",
      "digitization": {
        "provider": "configured-map-provider",
        "capturedAt": "2026-01-01T12:00:00.000Z",
        "note": "Digitizare orientativă; coordonatele au fost verificate."
      },
      "referenceAreaM2": null,
      "areaSource": "calculated",
      "source": "",
      "notes": ""
    },
    "regulations": {
      "potMaxPercent": null,
      "cutMax": null,
      "maxHeightM": null,
      "maxAboveGroundLevels": null,
      "referenceAreaMode": "calculated",
      "alignmentSides": ["NE"],
      "setbacks": [],
      "floorAreaMethod": "gross-level-sum-v1",
      "source": {}
    },
    "variants": [
      {
        "id": "variant-1",
        "name": "Varianta 01",
        "widthM": 12,
        "depthM": 9,
        "rotationDegrees": 18.5,
        "setbackDirections": {
          "north": 3,
          "south": 4,
          "east": 2,
          "west": 2
        },
        "roofType": "gable",
        "roofPitchDeg": 30,
        "upperFloors": 1,
        "groundFloorHeightM": 3,
        "typicalFloorHeightM": 2.8
      }
    ]
  }
}
```

Exemplul este schematic. Numele furnizorului și momentul digitizării sunt
metadate de proveniență; dalele, imaginile și token-urile furnizorului nu se
încorporează în proiectul exportat. Intrările lipsă lasă verificările respective
„neverificat”; exemplele de coordonate nu reprezintă un amplasament real.

## 4. Import, migrare și integritate

- parserul validează formatul, versiunea, dimensiunea, structura, numerele
  finite, unitățile, CRS-ul și referințele;
- limita de complexitate (vârfuri/variante) este aplicată înaintea calculelor;
- geometria se validează după parsare și înainte de înlocuirea proiectului;
- versiunea viitoare necunoscută este respinsă fără efect asupra proiectului
  curent;
- migrările se fac prin transformări explicite între versiuni; originalul nu
  se rescrie;
- cache-ul calculat se ignoră sau recalculează dacă versiunea nu corespunde;
- câmpurile necunoscute nu sunt executate; politica lor de păstrare/eliminare
  se documentează odată cu schema implementată.

## 5. Persistență

Prototipul păstrează proiectul activ local în `localStorage`; stocarea poate fi
ștearsă de browser și are cote mici. O evoluție de producție ar trebui să
migreze la IndexedDB cu operații atomice și tratarea erorilor de quota.
Exportul JSON este forma portabilă; o listă de mai multe proiecte locale nu
este cerință obligatorie MVP.

## 6. Sensibilitatea datelor

Fișierul poate conține coordonate exacte și note de proiect. Interfața avertizează
înainte de export și recomandă să nu se introducă date personale inutile.
