# Specificația funcțională

## 1. Stări proiect și navigare

Etapele sunt **Proiect**, **Teren**, **Reguli**, **Variante**, **Comparare**.
Utilizatorul poate reveni la o etapă anterioară. Fiecare etapă arată starea
completă, incompletă sau invalidă. Proiectul poate fi salvat incomplet, dar nu
se prezintă ca verificat.

Schimbarea terenului sau a regulilor invalidează/recalculează rezultatele care
depind de ele, fără să șteargă variantele.

## 2. Etapa Proiect

Intrări: nume obligatoriu, descriere opțională, date de creare și modificare,
unități de lucru (m, m²). Numele nu poate fi gol după eliminarea spațiilor de
la margini. Aplicația atribuie ID unic.

## 3. Etapa Teren

### Intrări

- CRS: WGS84 geografic (EPSG:4326) sau Stereo 70 (EPSG:3844);
- WGS84: câmpuri latitudine și longitudine în grade zecimale; Stereo 70:
  câmpuri X/Northing și Y/Easting, în metri, în ordinea axelor CRS;
- listă ordonată de coordonate și etichetă opțională pentru fiecare vârf;
- mod de creare geometrie: desenare pe hartă sau introducere/editare manuală;
- suprafață cadastrală/de referință opțională, în m²;
- proveniența coordonatelor, dată și note opționale;
- orientarea nordului opțională.

### Funcții

- adăugare, editare, eliminare și reordonare vârfuri;
- desenarea conturului pe o hartă interactivă prin plasarea succesivă a
  vârfurilor cu mouse-ul; încheiere prin butonul „Finalizează conturul” sau
  prin închiderea poligonului;
- mutarea unui vârf existent prin drag-and-drop, ștergerea lui și anularea/
  refacerea ultimei acțiuni;
- sincronizarea bidirecțională între vârfurile selectate pe hartă și tabelul
  de coordonate; după desen, coordonatele pot fi corectate numeric;
- zoom/pan și încadrarea conturului; căutarea unei adrese este opțională și
  depinde de serviciile furnizorului;
- confirmarea conturului înainte de utilizarea sa în calculele de arie și
  retrageri;
- import prin lipire a coordonatelor în formatul documentat;
- hartă contextuală furnizată prin adaptor (Google Maps sau furnizor
  echivalent), cu fallback la schiță plană și coordonate manuale dacă serviciul
  nu este configurat sau disponibil;
- afișarea atribuirii cartografice cerute de furnizor și a stării de încărcare/
  eroare; cheile necesare se configurează la deploy și nu sunt cerute/
  stocate în fișierul proiectului;
- afișare arie calculată separat de suprafața introdusă;
- avertizare la diferența dintre aria conturului și cea de referință;
- schimbarea CRS-ului nu reinterpretează tacit valorile: utilizatorul trebuie
  să confirme sau să convertească datele.
- punctele digitizate pe hartă se obțin ca WGS84; pentru proiect Stereo 70 se
  transformă explicit în EPSG:3844 și se afișează avertizarea privind precizia
  și caracterul orientativ;
- harta și coordonatele selectate vizual nu sunt prezentate ca ridicare
  topografică sau limită cadastrală.

### Validare

- minimum trei vârfuri distincte;
- WGS84: latitudine ∈ [-90, 90], longitudine ∈ [-180, 180];
- Stereo 70: coordonate finite și valide în domeniul/proiecția implementată;
- fără segmente zero, poligon degenerat sau auto-intersecție;
- validitatea CRS-ului și a geometriei confirmată înainte de calcule metrice.

## 4. Etapa Reguli urbanistice

Arhitectul introduce manual, după caz:

- POT maxim (%);
- CUT maxim (coeficient);
- înălțime maximă (m);
- număr maxim de niveluri (opțional);
- aria de referință POT/CUT: aria cadastrală furnizată sau aria calculată;
- metoda/nota privind aria desfășurată folosită la CUT;
- sursa: titlu/referință, dată, observații.

Retragerile Nord, Sud, Est și Vest sunt configurate separat în fiecare
variantă. Direcția unei laturi se deduce din direcția cardinală dominantă a
normalei sale exterioare; laturile oblice sunt aproximative.

În etapa Reguli, arhitectul poate selecta cel mult două alinieri dintre N, S,
E, V și colțurile NE, NV, SE, SV. O selecție de colț cere alinierea amprentei
la ambele laturi ale colțului. Alinierea înseamnă că fața casei este paralelă
cu latura selectată și se află la distanța retragerii introduse pentru acea
variantă. Dacă geometria parcelei nu permite alinierea aleasă, amplasarea este
marcată neverificată; aplicația nu ignoră selecția.

## 5. Etapa Variante

Configurarea inițială:

- prima variantă este generată automat la intrarea în această etapă; variante
  suplimentare pot fi adăugate manual, cu limita MVP de 20;
- nume distinctiv pentru fiecare variantă;
- regim P sau P+N, cu N întreg nenegativ;
- înălțime parter și înălțime tip etaj;
- aliniere la maximum două laturi/colțuri selectate la etapa Reguli;
- retrageri proprii N/S/E/V, opțional diferite pentru fiecare variantă;
- tipul acoperișului: fără, terasă, o apă, două ape sau patru ape; panta se
  configurează pentru acoperișurile înclinate;
- amprentă dreptunghiulară inițială căutată prin maximizare aproximativă,
  rotită în funcție de forma parcelei și limitată de retragerile, POT și CUT;
  dimensiunile și rotația se păstrează în proiect.

Fiecare variantă poate fi redenumită și ștearsă (cu confirmare). Amprenta se
editează numeric, iar poziția se recalculează automat după schimbarea
dimensiunilor sau retragerilor. Căutarea de maximizare este euristică, nu
garantează optimul geometric global. Schimbările actualizează scena și
rezultatele.

Stările unei variante:

- **în lucru**;
- **în limitele datelor introduse**;
- **depășire**;
- **neverificat**;
- **geometrie invalidă**.

MVP-ul suportă o amprentă poligonală simplă și un volum pe variantă; nu include
goluri, corpuri multiple sau configurații constructive.

## 6. Vizualizator 3D

- vedere de sus 2D și vedere axonometrică 3D, cu comutare;
- teren, linii orientative de retragere și amprentă diferențiate vizual;
- afișare/ascundere cote, niveluri și etichete;
- volum schematic extrudat pe niveluri, cu opțiuni de acoperiș fără acoperiș,
  terasă, o apă, două ape și patru ape;
- stare și valori accesibile textual, nu numai prin culoare.

În prototip, poziția și înălțimea sunt reprezentate schematic în SVG;
vizualizatorul nu este model BIM, nu permite navigarea camerei și nu descrie
topografie sau detalii constructive.

## 7. Comparare și raport

Pentru fiecare variantă se afișează regimul, numărul nivelurilor, înălțimea
estimată, aria amprentei, aria desfășurată estimată, POT, CUT și starea fiecărei
verificări. Unitățile, suprafața de referință și convenția CUT sunt vizibile.

Utilizatorul poate selecta varianta pentru scena 3D, reveni la editare sau
imprima raport sintetic. Raportul include sursele introduse, data și
avertismentul profesional.

## 8. Salvare, export și import

### Persistență locală

Autosave în IndexedDB după editare validă, cu stări „salvat local”, „salvare în
curs” și eroare. Eșecul storage/quota este explicit. Stocarea browserului nu
este backup.

### Export

Fișier UTF-8 JSON cu extensia `.volumetrie.json`, schema versionată și datele
necesare refacerii proiectului. Avertizează că fișierul poate include
coordonate exacte. Rezultatele derivate se pot recalcula.

### Import

- validează formatul, dimensiunea, tipurile, unitățile, CRS, referințele și
  geometria înainte de aplicare;
- nu execută scripturi sau HTML din date;
- versiunea incompatibilă/malformată nu schimbă proiectul curent;
- proiectul curent modificat se înlocuiește numai după confirmare;
- migrarea de schemă este explicită, raportată și nu modifică fișierul sursă;
- calculele derivate se recalculează după import.

## 9. Erori și mesaje

Mesajul identifică obiectul, câmpul, cauza și acțiunea recomandată. Exemple:

- „Poligonul se intersectează cu el însuși; verifică ordinea vârfurilor.”
- „Nu se poate calcula suprafața: verifică CRS-ul și valorile coordonatelor.”
- „CUT neverificat: lipsește aria de referință.”
- „Fișier invalid; proiectul curent a fost păstrat.”
- „Salvarea locală a eșuat; exportă proiectul pentru a evita pierderea datelor.”

## 10. Cerințe nonfuncționale și accesibilitate

- calcule deterministe pentru aceleași date și versiune de calcul;
- erorile geometrice nu se corectează în tăcere;
- suport de tastatură pentru operațiile principale și etichete/unități clare;
- stările nu se diferențiază exclusiv prin culoare;
- format JSON versionat și migrări testabile;
- aplicația statică funcționează fără API propriu; harta externă nu este
  obligatorie;
- interacțiunea rămâne funcțională pentru limita de 20 variante pe dispozitive
  desktop țintă.

## 11. Criterii de acceptare

- [ ] WGS84 și Stereo 70 sunt selectabile și păstrate cu CRS-ul în fișier.
- [ ] Utilizatorul poate desena perimetrul prin click-uri pe hartă, îl poate
  închide, muta și corecta numeric, iar coordonatele se sincronizează cu
  modelul terenului.
- [ ] Dacă furnizorul hărții eșuează sau nu este configurat, utilizatorul
  primește eroarea și coordonatele manuale/schița locală rămân disponibile.
- [ ] Interfața avertizează că digitizarea este aproximativă și nu certifică
  limita cadastrală.
- [ ] Geometria invalidă, CRS-ul nevalid și auto-intersecția sunt semnalate; nu
  produc rezultate de arie aparent valide.
- [ ] Suprafața geometrică și suprafața de referință sunt distincte.
- [ ] Retragerile se asociază laturilor și zona construibilă este calculată sau
  marcată explicit „neverificat”.
- [ ] Lipsa POT/CUT/înălțimii aplicabile duce la „neverificat”, nu la succes.
- [ ] Se pot crea variante P și P+N, configura înălțimi și edita amprenta.
- [ ] Fiecare variantă este redată 3D și comparată cu aceleași reguli.
- [ ] Modificarea unei intrări invalidează/recalculează rezultatele relevante.
- [ ] Export/import păstrează numele, CRS, coordonatele în ordinea lor,
  suprafața de referință, reguli și variante.
- [ ] Import invalid/incompatibil nu înlocuiește proiectul curent.
- [ ] Eșecul de autosalvare este vizibil; utilizatorul poate exporta manual.
- [ ] Raportul include parametrii sursă și avertismentul profesional.
