# Specificația produsului

## 1. Scop

Volumetrie este o aplicație web de studiu preliminar pentru arhitecți. Aplicația
le permite să definească un teren prin coordonate geografice sau proiectate,
să introducă indicatorii urbanistici și retragerile cunoscute și să creeze mai
multe propuneri de volumetrie 3D. Rezultatele pot fi comparate și proiectul
poate fi exportat/importat ca fișier.

Aplicația sprijină explorarea de concept; nu înlocuiește documentația
cadastrală, certificatul de urbanism, interpretarea reglementărilor,
proiectarea tehnică sau verificarea arhitectului.

## 2. Problema și valoarea oferită

Compararea manuală a unor variante de amplasare, POT, CUT și înălțime este
repetitivă, iar relația dintre intrările urbanistice și forma rezultată poate
fi dificil de urmărit. Produsul centralizează ipotezele și le leagă de o scenă
3D schematică și de indicatori recalculați.

## 3. Utilizatori

### Principal: arhitect

- definește conturul unui teren și sistemul său de coordonate;
- introduce regulile relevante și proveniența lor;
- creează un număr ales de variante P/P+N;
- ajustează amprente și înălțimi, apoi compară rezultatele;
- păstrează și transferă proiectul prin fișier.

### Secundar: beneficiar sau colaborator

Poate consulta un raport sau fișier oferit de arhitect. Colaborarea simultană
și conturile nu sunt incluse în MVP.

## 4. Obiective

1. Flux ghidat: proiect → teren → reguli → variante → comparare.
2. Reprezentare 3D ușor de înțeles pentru fiecare variantă.
3. Trasabilitate: valorile afișate pot fi urmărite la datele introduse și la
   convenția de calcul.
4. Import/export repetabil fără pierderi de intrări sau variante.
5. Funcționare fără backend propriu și fără transmiterea implicită a
   proiectului către un serviciu extern.

## 5. Domeniul MVP

### Inclus

- UI web în română, responsive, optimizată pentru desktop;
- wizard de configurare și proiect incomplet salvabil;
- introducere manuală a coordonatelor WGS84 și Stereo 70 (EPSG:3844);
- desenarea conturului terenului pe o hartă web prin click-uri cu mouse-ul,
  mutarea/ștergerea vârfurilor și editarea ulterioară a coordonatelor;
- adaptor pentru un furnizor de hărți (Google Maps sau alternativă), cu
  furnizorul concret ales după verificarea termenilor, costurilor și
  confidențialității;
- validarea geometriei și calculul orientativ al suprafeței;
- suprafață de referință introdusă de utilizator, distinctă de aria calculată;
- introducerea POT, CUT, înălțimii și retragerilor pe laturi;
- variante de volumetrie cu amprentă, niveluri și înălțimi editabile;
- scenă 3D schematică, comparare tabulară și raport imprimabil;
- autosalvare locală și fișier JSON versionat pentru export/import.

### Exclus

- backend, conturi, sincronizare sau colaborare în timp real;
- extragerea limitelor cadastrale din coordonate sau dintr-un serviciu extern;
- motor de interpretare automată a PUG/PUZ, certificat de urbanism ori legi;
- garanția încadrării juridice, cadastrale sau de autorizare;
- model de teren cu pantă/cote altimetrice în MVP;
- BIM/IFC, DWG/DXF, detalii constructive, structură, instalații;
- generare automată optimizată sau proiectare arhitecturală autonomă;
- randare fotorealistă.

## 6. Principii

- **Date explicite:** regulile nu sunt presupuse sau deduse automat.
- **Control profesional:** arhitectul decide și verifică.
- **Avertizare, nu certificare:** rezultatele spun „în limitele datelor
  introduse”, nu „legal” sau „conform”.
- **Local-first:** proiectele sunt păstrate de utilizator; exportul este
  mecanismul portabil.
- **Eșec explicit:** geometria nevalidă și calculele indisponibile nu produc
  rezultate prezentate drept valide.
- **CRS vizibil:** fiecare coordonată, calcul și conversie păstrează CRS-ul și
  proveniența.

## 7. Indicatori de succes

- Un utilizator poate configura terenul, regulile și prima variantă prin fluxul
  ghidat.
- Toate variantele afișează 3D, intrări și rezultate separate pe verificări.
- Importul unui export recreează intrările, ordinea punctelor și variantele.
- Erorile de import și stocare sunt vizibile, iar proiectul curent nu se pierde
  în urma unui import invalid.
- Rezultatele incomplete sunt marcate „neverificat”.

## 8. Riscuri

- Conversia între CRS greșit declarat poate distorsiona forma și suprafața.
- Coordonatele de cadastru/topografie și aria din contur nu sunt neapărat
  identice cu suprafața juridică de referință.
- Definiția suprafețelor pentru POT/CUT poate depinde de reglementări și
  convenții proiectuale.
- Geometria concavă și retragerile care se intersectează necesită algoritmi
  topologici robusti.
- Stocarea browserului nu este backup și poate fi ștearsă.
- Hărțile externe pot primi metadate de rețea și zona vizualizată.
- Desenarea pe o hartă de bază poate fi interpretată greșit ca delimitare
  cadastrală exactă; interfața și raportul trebuie să precizeze caracterul
  orientativ al digitizării.

## 9. Ipoteze inițiale

- Un proiect are un teren 2D și un număr limitat de variante; limita de MVP
  propusă este 20.
- Se acceptă WGS84 EPSG:4326 și Stereo 70 EPSG:3844, cu CRS stocat explicit.
- Suprafața oficială introdusă manual poate fi aleasă ca bază POT/CUT.
- Modelul volumetric este extrudare schematică pe niveluri, cu acoperiș
  configurabil: fără, terasă, o apă, două ape sau patru ape.
- Prima variantă pornește de la o amprentă rectangulară maximizată aproximativ,
  rotită pentru parcela definită, în limitele retragerilor, POT și CUT.
  Algoritmul este orientativ și nu garantează optimul geometric global.
- Harta este suport vizual pentru digitizare, nu sursă cadastrală; introducerea
  manuală a coordonatelor rămâne disponibilă fără furnizor.
- Nu există încă o cerință pentru export PDF specializat; raportul MVP se poate
  imprima din browser.

## 10. Avertisment profesional

În editor, comparație și raport se afișează: „Estimare de concept pe baza
datelor introduse. Nu reprezintă verificare cadastrală sau certificare de
conformitate urbanistică. Verifică CRS-ul, sursele și reglementările aplicabile
proiectului.”
