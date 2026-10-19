# Arhitectură tehnică

## 1. Viziune

Aplicație web statică, client-only și local-first. UI-ul, calculele, scena 3D,
validarea fișierelor și IndexedDB rulează în browser. Nu există API sau
bază de date centrală în MVP. Utilizatorul transferă proiectele prin fișier
JSON versionat.

## 2. Implementare curentă și direcție tehnică

Prototipul funcțional curent este o aplicație statică fără build step:
HTML/CSS/JavaScript nativ, Leaflet încărcat din CDN pentru hartă, tile-uri
OpenStreetMap și SVG pentru volumetria schematică. Modelul și calculele rulează
în browser; datele se autosalvează în `localStorage` și se exportă/importă
JSON. Aceasta permite pornirea rapidă fără backend sau instalare Node.js, dar
nu este încă arhitectura țintă pentru o aplicație de producție.

## 3. Stivă propusă pentru evoluție

- React + TypeScript pentru UI;
- Vite pentru build și servire statică;
- Three.js, posibil prin `@react-three/fiber`, pentru vizualizare;
- bibliotecă geospațială matură pentru operații poligonale și transformări CRS;
- IndexedDB pentru autosalvarea proiectului;
- teste unitare de domeniu, teste de integrare pentru persistență/fișiere și
  teste UI pentru wizard.

Biblioteca geospațială exactă se selectează după evaluarea licenței,
transformărilor EPSG:4326 ↔ EPSG:3844, operațiilor de buffer/intersecție,
poligoanelor concave și preciziei. Transformarea coordonatelor trebuie să fie
testată cu repere cunoscute; nu se implementează formule aproximative ad-hoc.

## 4. Module logice

```text
src/
  app/                 structură, navigare, stare
  features/
    project/           creare, autosalvare, import/export
    site/              coordonate, CRS și parcelă
    regulations/       indicatori, retrageri și surse
    variants/          amprente și niveluri
    viewer/             vedere 2D/3D
    comparison/          indicatori și raport
  domain/
    model/              tipuri canonice și unități
    crs/                validare și conversii de coordonate
    geometry/           poligoane, distanțe și retrageri
    calculations/       POT, CUT, înălțime
    validation/         reguli și stări
  infrastructure/
    persistence/        repository IndexedDB
    files/              schema JSON, import/export, migrare
    maps/               adaptor hartă și furnizor configurabil
  shared/               componente și tratarea erorilor
```

Structura este orientativă. Logica de domeniu nu trebuie să depindă de React,
WebGL sau storage-ul browserului.

## 5. Flux de date

1. Formularele produc acțiuni tipizate.
2. Domeniul validează intrările, CRS-ul și geometria.
3. Transformările proiectează coordonatele în sistemul metric corect; CRS-ul și
   proveniența rămân în model.
4. Calculele produc rezultate versionate și stări explicite.
5. Vizualizatorul transformă geometria validată în mesh-uri, fără a recalcula
   indicatorii.
6. Repository-ul persistă proiectul prin tranzacții IndexedDB.
7. Exportatorul serializează schema publică versionată.
8. Importatorul validează/migrează într-un document temporar și abia apoi
   actualizează atomic proiectul activ cu confirmarea utilizatorului.

## 6. CRS și geometrie

- Intrarea WGS84 este geografică (EPSG:4326); aria și distanțele nu se
  calculează direct în grade.
- În fișier, WGS84 păstrează axele latitude/longitude, iar Stereo 70
  (EPSG:3844) păstrează ordinea CRS X/Northing, Y/Easting.
- Adaptorul geospațial normalizează axele la convenția bibliotecii și folosește
  o transformare de datum testată pentru Pulkovo 1942(58) ↔ WGS84; precizia și
  operația folosită sunt documentate.
- Transformările CRS sunt explicite, verificabile și nu schimbă eticheta fără
  conversia coordonatelor.
- Pentru scena 3D se folosește un reper local pentru a evita valori foarte mari.
- Poligoanele retragerilor/amprentelor sunt procesate de o bibliotecă testată.
- Dacă o transformare sau operație geometrică eșuează, rezultatul devine
  „neverificat” ori „invalid”; UI nu desenează o concluzie aparent validă.

## 7. UI și persistență

Documentul proiectului este sursa unică de adevăr. Starea efemeră (camera,
panouri deschise, selecție) este separată. Schimbările relevante invalidează
rezultatele dependente. Autosave-ul are stare vizibilă; eșecul nu este afișat
ca salvare reușită.

## 8. Scenă 3D

Scena arată teren, limite de retragere și volume extrudate pentru niveluri.
Conversia model-geometrie în mesh este separată de geometria domeniului.
Schimbarea camerei nu modifică proiectul; editarea amprentei trimite acțiuni
spre modelul canonic.

## 9. Servicii externe și hartă

Desenarea perimetrului pe o hartă face parte din fluxul de configurare,
printr-un adaptor înlocuibil pentru Google Maps sau un furnizor echivalent.
Furnizorul concret se alege după evaluarea termenilor, licenței, costurilor,
acoperirii regionale și confidențialității.

Adaptorul transformă evenimentele de click/drag în coordonate WGS84, care
intră în modelul canonic de geometrie. Dacă proiectul este în Stereo 70,
conversia în EPSG:3844 este explicită și efectuată de stratul CRS, nu de codul
UI al furnizorului. Desenarea pe hartă, tabelul de coordonate și schița 2D
folosesc aceleași vârfuri; harta nu devine sursa de adevăr a proiectului.

Cheile de API pentru hărți sunt identificatori publici în aplicațiile client
și trebuie restricționate la originile și API-urile necesare; nu se includ
secrete server-side în bundle. Dacă furnizorul cere cheie sau facturare,
configurarea necesară este documentată. Fără furnizor disponibil, introducerea
numerică și schița locală rămân funcționale. Furnizorul poate primi IP-ul și
locația vizualizată; politicile și atribuirea surselor sunt afișate conform
licenței. Proiectele nu sunt transmise către un API propriu.

## 10. Distribuție

Bundle-ul poate fi servit ca site static HTTPS. Hostingul livrează resurse, nu
proiecte. PWA/offline instalabil nu este presupus în MVP; necesită politică
separată de cache și actualizare.

## 11. Decizii cu impact

- Local-first evită backend-ul, dar nu oferă sincronizare sau backup.
- JSON lizibil ușurează transferul și cere import strict.
- Geometria și regulile sunt module de domeniu testabile independent de WebGL.
- CRS și conversia geodezică sunt funcții de bază, nu detalii de prezentare.
- Furnizorul cartografic este înlocuibil; digitizarea pe hartă este
  aproximativă și nu echivalează cu ridicare cadastrală.
