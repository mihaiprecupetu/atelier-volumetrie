# Reguli de domeniu și calcule

## 1. Principiu

Calculele sunt orientative și explicabile. Aplicația nu interpretează automat
reglementări românești și nu certifică încadrarea. Fiecare rezultat se leagă
de intrările, CRS-ul, aria de referință și convenția folosită.

## 2. Sisteme de coordonate

### WGS84

- CRS: EPSG:4326;
- intrare: latitudine și longitudine în grade zecimale;
- ordinea introdusă în fișier: latitudine, longitudine;
- validare: latitudine între -90 și 90, longitudine între -180 și 180.

### Stereo 70

- CRS: EPSG:3844;
- intrare în ordinea axelor CRS: X/Northing, apoi Y/Easting, în metri;
- aplicația trebuie să valideze domeniul rezonabil și să folosească o
  implementare testată a transformării/proiecției.

Fișierul păstrează CRS-ul sursă și ordinea axelor: pentru EPSG:4326
latitudine/longitudine, iar pentru EPSG:3844 Northing/Easting. Adaptoarele către
biblioteci geospațiale normalizează axele la convenția cerută de acea
bibliotecă; această conversie de ordine nu schimbă CRS-ul. Coordonatele nu se
reinterpretează prin simpla schimbare a etichetei CRS. Conversia CRS este
operație distinctă, cu confirmare și păstrarea provenienței. EPSG:3844 este
bazat pe Pulkovo 1942(58), deci transformarea către/din WGS84 trebuie să
folosească o operație de datum adecvată și să documenteze precizia disponibilă.
Software-ul nu dovedește că utilizatorul a ales CRS-ul corect sau operația
geodezică potrivită sursei.

## 3. Geometria terenului

- Vârfurile se păstrează în ordinea definită de utilizator; poligonul se
  închide implicit între ultimul și primul punct.
- Se validează minimum trei vârfuri distincte, segmente nenule, arie pozitivă,
  topologie simplă și CRS valid.
- Aria și distanțele se calculează în coordonate metrice, nu direct în grade.
- Pentru WGS84, geometria se proiectează într-un sistem metric adecvat
  localizării; pentru Stereo 70 se folosesc coordonatele metrice ale CRS-ului.
- Suprafața geometrică calculată se raportează separat de aria cadastrală
  introdusă manual. Cea din urmă poate fi folosită ca arie de referință pentru
  indicatori, cu etichetă explicită.
- Cazurile în afara ariei de utilizare a proiecției sau cele topologic
  ambigue se marchează „neverificat”/„invalid”, nu se repară tacit.

## 4. Retrageri și zonă construibilă

Fiecare variantă are retrageri independente Nord, Est, Sud și Vest. Direcția
fiecărei laturi este determinată din normala sa exterioară în raport cu nordul
geografic; pentru laturi oblice se alege direcția dominantă a normalei.

Regulile proiectului pot indica maximum două aliniamente din N, S, E, V, NE,
NV, SE și SV. O opțiune cardinală aliniază o față a amprentei paralel la latura
parcelei clasificată în direcția respectivă, iar o opțiune de colț aplică
alinierea simultan la cele două laturi cardinale ale colțului. Fața se
poziționează la retragerea acelei direcții pentru varianta curentă. Dacă nu
există o latură potrivită sau laturile alese nu permit o amprentă
rectangulară aliniată,
nu se forțează o poziție alternativă; rezultatul rămâne neverificat.

La generarea unei variante, aplicația caută un dreptunghi rotit cu arie cât mai
mare în parcela rămasă după retragerile acelei variante. Se respectă și limitele
POT/CUT introduse, folosind regimul de niveluri al variantei. Unghiul de
orientare și raportul laturilor sunt căutate prin eșantionare și rafinare
numerică; unghiurile compatibile cu alinierea selectată sunt aplicate exact,
iar rezultatul rămâne o aproximare, nu un optim geometric demonstrat.
Amprenta generată este rotită față de nord când forma terenului o justifică și
poate fi ajustată ulterior din dimensiunile numerice.

Terenul, retragerile și amprenta se afișează în plan 2D, iar terenul și casa în
axonometrie schematică 3D. Dacă nu se găsește o poziție, aplicația raportează
„Neverificat”, nu afirmă că terenul este imposibil de construit. Geometria
concavă, laturile oblice și zona construibilă discontinuă pot cauza rezultate
false-negative; rezultatul nu este verificare cadastrală sau legală.

Acoperișul variantei poate lipsi, poate fi terasă (0 ape), o apă, două ape sau
patru ape. Pentru acoperișurile înclinate se introduce panta (5–60°), iar
înălțimea la coamă/coastă se adaugă la înălțimea totală comparată cu limita
introdusă. Reprezentarea este schematică.

## 5. POT și CUT

Notații:

- `A_ref`: aria terenului selectată ca referință, în m²;
- `A_amprenta`: aria proiectată a amprentei, în m²;
- `A_desfasurata`: suma ariilor nivelurilor conform metodei selectate, în m²;
- `POT_max`: POT maxim introdus, în procente;
- `CUT_max`: CUT maxim introdus, coeficient fără unitate.

Formule orientative:

- `POT calculat (%) = 100 × A_amprenta / A_ref`
- `CUT calculat = A_desfasurata / A_ref`
- depășire POT dacă POT calculat > POT maxim;
- depășire CUT dacă CUT calculat > CUT maxim.

`A_ref` trebuie să fie pozitivă și explicit aleasă. Dacă se folosește aria
calculată din poligon, aceasta este marcată ca estimată; dacă arhitectul a
introdus o arie oficială/de referință, se păstrează separat sursa ei.

## 6. Aria desfășurată și înălțime

Definiția ariei luate în calcul la CUT poate depinde de reglementările și
convențiile proiectului. MVP-ul oferă o metodă transparentă: suma ariilor
nivelurilor deasupra cotei de referință, fără excluderi automate pentru
subsoluri, balcoane, terase, spații tehnice sau alte categorii. Arhitectul
poate furniza o corecție documentată, iar rezultatul rămâne estimativ.

Regim:

- `P` = parter, un nivel;
- `P+N` = parter plus N etaje, unde N este întreg nenegativ.

Înălțimea schematică este suma înălțimilor configurate pe niveluri. Nu include
automat atic, coamă, parapet, cote de teren sau alte elemente decât dacă sunt
definite în model. Înălțimea se compară cu limita introdusă doar cu această
convenție afișată.

## 7. Stări și rotunjire

- **În limitele datelor introduse:** verificarea are intrări complete și nu
  depășește pragul.
- **Depășire:** verificarea are intrări complete și depășește pragul.
- **Neverificat:** lipsesc date sau geometria/algoritmul nu permit concluzia.
- **Invalid:** valoare sau geometrie imposibilă.

Starea agregată a variantei nu poate fi „în limite” dacă o regulă relevantă
este neverificată. Calculele păstrează precizia internă și rotunjesc numai la
afișare. Se afișează unitățile și rotunjirea nu se interpretează ca precizie a
sursei.
