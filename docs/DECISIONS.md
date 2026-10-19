# Decizii și ipoteze

Alegerile de mai jos definesc MVP-ul și pot fi revizuite înaintea implementării.
Schimbările care afectează fișierul de proiect trebuie versionate.

| ID | Decizie | Motiv / efect |
|---|---|---|
| D-01 | Piață-țintă: România; UI și documente în română | Contextul solicitării |
| D-02 | Aplicație web fără backend propriu | Preferința de produs; proiectul rămâne local |
| D-03 | Indicatori și retrageri introduse manual | Fără sursă legislativă oficială/automatizată definită |
| D-04 | Fără certificare cadastrală sau de conformitate | Produsul este instrument de concept |
| D-05 | Suport coordonate WGS84 EPSG:4326 și Stereo 70 EPSG:3844, cu ordinea axelor specifică CRS | Cerință confirmată; CRS se păstrează explicit, adaptoarele normalizează axele |
| D-06 | Conversia CRS este operație explicită, nu schimbare de etichetă | Evită reinterpretarea coordonatelor |
| D-07 | Teren 2D, un singur poligon în MVP | Limitează geometria inițială |
| D-08 | Variante 3D schematice P/P+N, fără BIM | Satisface explorarea volumetrică |
| D-09 | Proiect JSON versionat pentru export/import | Transfer portabil fără backend |
| D-10 | Autosalvare locală IndexedDB propusă | Comoditate; exportul rămâne backup-ul explicit |
| D-11 | Desenarea perimetrului pe hartă este funcție MVP; furnizorul (Google Maps sau alternativă) rămâne configurabil | Cerință nouă; coordonatele și schița manuală rămân fallback; alegerea furnizorului depinde de cost, licență și confidențialitate |
| D-12 | Maximum 20 variante propus pentru MVP | Limită inițială de performanță și lizibilitate |
| D-13 | React/TypeScript/Vite/Three.js ca stivă propusă | Potrivire pentru aplicație web 3D; necesită prototip |
| D-14 | Prototip inițial în HTML/CSS/JavaScript nativ, fără build step | Node.js nu este disponibil în mediul curent; permite livrarea și pornirea imediată ca aplicație statică |
| D-15 | Leaflet + tile-uri OSM pentru prototip | Hartă interactivă fără cheie; serviciul public OSM nu este garantat pentru utilizare comercială/scală |
| D-16 | Primul prototip acceptă doar WGS84; Stereo 70 rămâne indisponibil până la integrarea unei transformări testate | Evită conversiile geodezice aproximative și rezultate înșelătoare |
| D-17 | `localStorage` folosit în prototip, cu JSON exportabil | Simplitate inițială; IndexedDB rămâne direcția de producție dacă dimensiunea proiectelor o cere |

## Aspecte de confirmat înainte de utilizare profesională

1. Convențiile de axe și formatele acceptate pentru importul Stereo 70, inclusiv
   proveniența și transformările geodezice necesare.
2. Procedura de validare a coordonatelor și precizia urmărită pentru conversii.
3. Definiția suprafețelor luate în calcul la CUT și aria desfășurată.
4. Tratamentul subsolurilor, balcoanelor, teraselor, spațiilor tehnice și
   elementelor de înălțime.
5. Alegerea furnizorului de hartă, modelului de facturare, API-urilor necesare,
   condițiilor de afișare/atribuire și configurării cheii pentru mediile de
   dezvoltare/producție.
6. Dacă MVP-ul trebuie să includă topografie, PDF, CAD/BIM sau funcționare
   offline instalabilă.

Nicio valoare numerică ori geometrie calculată nu trebuie considerată valoare
oficială fără verificare față de documentele sursă și reglementările aplicabile.
