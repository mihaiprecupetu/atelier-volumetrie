# Starea implementării

## Prototip funcțional disponibil

Aplicația poate fi pornită local printr-un server static (de exemplu, extensia
VS Code Live Server sau `py -m http.server 8000`), fără backend propriu,
instalare de pachete ori comandă de build. Nu deschide direct `index.html` prin
`file://`: serviciul public de tile-uri OpenStreetMap poate răspunde cu HTTP
403 pentru cereri fără origin HTTP. Harta încarcă Leaflet și tile-uri
OpenStreetMap de pe internet; fără rețea, fallback-ul este introducerea
coordonatelor manuale.

Implementat:

- wizard în limba română pentru proiect, teren, reguli și variante;
- temă luminoasă/întunecată cu comutator, preferință salvată local și
  sincronizare cu tema sistemului până la alegerea manuală;
- desenarea conturului prin click pe hartă, mutarea vârfurilor prin drag,
  editarea coordonatelor numerice, ștergerea și anularea ultimului punct;
- validare WGS84, detectarea poligonului degenerat și a auto-intersecției;
- calcul local aproximativ al ariei pentru parcele mici, pe o proiecție locală
  equirectangulară;
- introducere POT, CUT și înălțime maximă, cu retrageri independente N/S/E/V
  configurate pentru fiecare variantă;
- selectarea a maximum două alinieri N/S/E/V sau NE/NV/SE/SV; generarea și
  amplasarea respectă fețele selectate și retragerile variantei;
- generarea automată a primei variante cu amprenta dreptunghiulară rotită
  aproximată ca maximă în zona construibilă, cu respectarea limitelor POT/CUT;
- opțiuni de acoperiș: fără acoperiș, terasă, o apă, două ape sau patru ape,
  cu pantă reglabilă pentru formele înclinate;
- vizualizare 2D a terenului, retragerilor și casei, respectiv axonometrie
  schematică 3D a casei așezate pe teren, cu comutare între moduri;
- variante cu amprentă configurabilă, regim P/P+N, rotație, retrageri proprii,
  acoperiș și tabel comparativ;
- autosalvare locală în browser, export/import JSON schema 1.

## Limite explicite ale prototipului

- Harta OSM este vizuală; digitizarea nu este limită cadastrală sau ridicare
  topografică. Utilizarea tile-urilor publice are termeni și limite; înainte de
  lansare/producție trebuie ales furnizorul potrivit și configurate cerințele
  de atribuire, cost și confidențialitate.
- Harta publică OpenStreetMap poate răspunde cu 403 dacă pagina este deschisă
  direct prin `file://`; folosește un server static local pe `http://localhost`.
- Coordonatele acceptate în prototip sunt WGS84 EPSG:4326. EPSG:3844/Stereo 70
  nu este încă implementat și importurile care îl specifică sunt respinse.
- Aria folosește aproximare locală; nu este calcul cadastral/geodezic oficial.
- Maximizarea eșantionează unghiul, raportul laturilor și poziția, apoi rafinează
  soluția. Nu garantează optimul geometric global; parcele concave, înguste sau
  retrageri complexe pot produce o soluție suboptimală ori „Neverificat”.
- Laturile oblice sunt încadrate după direcția cardinală dominantă a normalei
  exterioare. Nu există editare a unghiului sau amprentei prin drag, nici motor
  topologic exact pentru offset-uri și zone construibile multiple.
- Compararea prezintă starea agregată a variantei; încă nu există un panou
  explicativ cu starea detaliată pentru fiecare regulă.
- Modelul, inclusiv formele de acoperiș, este o schiță SVG, nu motor 3D WebGL/BIM;
  nu există navigare orbitabilă reală sau modificarea amprentei pe hartă.
- Salvarea automată folosește `localStorage`, nu IndexedDB. Exportul JSON
  trebuie folosit pentru backup/transfer.
- Harta, CDN-ul Leaflet și fonturile necesită internet. Introducerea manuală
  de coordonate rămâne disponibilă fără hartă.

## Următorii pași recomandați

1. Adăugarea și testarea conversiei CRS EPSG:4326 ↔ EPSG:3844 cu operație de
   datum verificată.
2. Înlocuirea căutării de poziționare discretă cu un motor topologic exact
   pentru retrageri, amprente concave și zone construibile multiple.
3. Migrarea la IndexedDB și adăugarea unei suite de teste automate/build.
4. Alegerea furnizorului cartografic de producție și validarea termenilor/API.
5. Extinderea editorului cu rotirea amprentei, poziționare interactivă și
   scenă 3D navigabilă.

## Verificare manuală

Deschide `tests/domain.test.html` pentru a rula testele browser ale logicii de
domeniu. Pentru fluxul complet, creați un proiect, desenați un poligon,
completați indicatorii, adăugați o variantă și exportați/importați proiectul.
