# Plan de livrare

## Etapa 0 — Decizii și prototip geospațial

- evaluarea unei biblioteci pentru EPSG:4326 și EPSG:3844;
- compararea furnizorilor de hartă (inclusiv Google Maps și alternative) după
  termeni, prețuri, acoperire, chei/API, atribuire și confidențialitate;
- verificarea axelor/ordinii, reperelor de transformare și limitelor de precizie;
- prototip de poligon concav, retrageri intersectate și cazuri invalide;
- confirmarea metodei de aria desfășurată pentru raportarea CUT.

**Rezultat:** decizii tehnice și exemple de test geospațial.

## Etapa 1 — Schelet, proiect și fișiere

- configurare aplicație React/TypeScript;
- modelul tipizat și validarea schemei;
- proiect nou, navigare wizard și IndexedDB;
- export/import JSON, erori explicite și bază pentru migrare.

**Rezultat:** creare, autosalvare, export și import proiect.

## Etapa 2 — Teren, CRS și reguli

- formulare coordonate pentru ambele CRS-uri;
- hartă interactivă pentru desenarea perimetrului, plasarea și repoziționarea
  vârfurilor și sincronizarea cu formularul numeric;
- validare/conversie și schiță de teren;
- arii și suprafață de referință distincte;
- configurare retrageri, POT/CUT, înălțime și surse.

**Rezultat:** teren și reguli documentate, cu stări de validare explicite.
Digitizarea pe hartă este orientativă; introducerea numerică funcționează și
fără furnizorul cartografic.

## Etapa 3 — Variante și vizualizator

- configurare P/P+N și înălțimi;
- amprentă inițială și editare numerică/vizuală;
- scenă 3D schematică;
- calcule și stări pentru fiecare verificare.

**Rezultat:** flux end-to-end de explorare a variantelor.

## Etapa 4 — Comparare și calitate

- tabel comparativ și raport imprimabil;
- accesibilitate și mesaje de eroare;
- teste de regresie pentru calcule, CRS, import/migrare;
- verificări de performanță la limita inițială de 20 variante.

**Rezultat:** MVP pilotabil intern, cu avertismente profesionale.

## Posibile extensii, în afara MVP

- hartă offline sau surse de tile configurabile;
- raport PDF și export de imagini;
- teren cu pantă și cote altimetrice;
- corpuri multiple, acoperișuri și modele mai detaliate;
- CAD/BIM, conturi, sincronizare sau colaborare, fiecare cu specificație
  separată.

## Condiții de lansare

- criteriile obligatorii din specificația funcțională sunt satisfăcute;
- conversiile CRS și calculele au teste cu rezultate de referință;
- importul incompatibil nu pierde proiectul curent;
- „neverificat” nu este prezentat ca conformitate;
- limitele legale, cadastrale și de precizie sunt vizibile în UI/raport.
