# Fluxuri UX

## 1. Principii

Wizard-ul ordonează configurarea, dar etapele completate rămân editabile.
Proiectul incomplet poate fi salvat, însă starea lui este vizibilă. Acțiunile
și verificările au mesaje explicite; utilizatorul nu trebuie să deducă dacă
datele au fost salvate sau dacă un calcul a fost omis.

## 2. Creare proiect și configurare teren

1. Pagina de start oferă **Proiect nou** și **Importă proiect**.
2. La proiect nou, utilizatorul completează numele și opțional descrierea.
3. În etapa Teren alege **Desenează pe hartă** sau **Introdu coordonate**.
4. În modul hartă, utilizatorul navighează/face zoom la amplasament și
   plasează succesiv vârfurile parcelei cu click-uri; finalizează conturul din
   buton sau prin închiderea poligonului.
5. Utilizatorul poate trage un vârf pentru a-l repoziționa, șterge puncte,
   anula/reface acțiuni și edita orice coordonată numeric.
6. Harta și tabelul coordonatelor se actualizează împreună; aplicația validează
   CRS-ul și geometria și afișează vârfurile numerotate.
7. Dacă harta nu se încarcă, utilizatorul primește eroarea și poate continua
   cu introducere numerică și schița locală.
8. Interfața precizează că digitizarea vizuală este orientativă, nu delimitare
   cadastrală.
9. Utilizatorul confirmă CRS-ul de stocare WGS84 sau Stereo 70; pentru Stereo
   70, sistemul transformă explicit coordonatele și indică precizia disponibilă.
10. Interfața arată exemplele de format și unitățile CRS-ului selectat.
11. Utilizatorul poate reordona coordonatele și le poate corecta numeric.
12. Schița și validarea se actualizează. Erorile apar lângă punctele implicate.
13. Se prezintă aria calculată și, separat, aria cadastrală/de referință dacă
   utilizatorul a introdus-o.
14. La schimbarea CRS-ului se cere confirmarea conversiei sau reintroducerii;
   valorile nu sunt reinterpretate fără acord.
15. Utilizatorul confirmă laturile parcelei și orientarea înainte de configurarea
   retragerilor.

## 3. Configurare reguli

1. Utilizatorul adaugă POT, CUT, înălțime și niveluri maxime după
   documentele sale.
2. Selectează maximum două aliniamente: N/S/E/V sau unul dintre colțurile
   NE/NV/SE/SV. O opțiune de colț aliniază casa la ambele laturi ale sale.
3. Alege suprafața de referință pentru POT/CUT.
4. Notează sursa și convenția de arie desfășurată.
5. Interfața arată care rezultate vor fi verificabile și care rămân
   „neverificat”.

## 4. Configurare și editare variante

1. La intrarea în etapă, aplicația generează prima variantă cu o amprentă
   dreptunghiulară maximizată aproximativ și rotită pe parcelă, limitată de
   retrageri și de POT/CUT introduse.
2. Arhitectul poate adăuga variante și definește regimul fiecăreia (P/P+N),
   retragerile N/S/E/V proprii, tipul acoperișului și panta.
3. Aplicația caută o amplasare fezabilă pentru dimensiunile fiecărei amprente,
   respectând alinierile de proiect și retragerile proprii variantei.
4. Se selectează o variantă; vizualizatorul comută între planul 2D și axonometria
   3D a terenului cu amprenta casei.
5. Utilizatorul modifică numeric amprenta, regimul și înălțimile; poziția se
   recalculează automat.
6. Rezultatele se recalculează și afișează stări separate pe reguli, inclusiv
   înălțimea acoperișului.
7. Utilizatorul poate duplica varianta pentru a explora o alternativă.
8. O depășire blochează doar declararea încadrării; nu blochează salvarea
   proiectului.

## 5. Comparare

1. Utilizatorul deschide tabelul cu toate variantele.
2. Sortează/vizualizează valorile și stările POT, CUT, retrageri și înălțime.
3. Selectează o variantă pentru a o vedea 3D.
4. Poate reveni la editare sau imprima raportul cu intrările și avertismente.

## 6. Export/import

### Export

1. Acțiunea **Exportă proiectul** oferă nume de fișier.
2. Dacă există coordonate, se afișează avertizarea privind sensibilitatea lor.
3. Browserul descarcă JSON; interfața confirmă exportul, fără a confunda acesta
   cu autosalvarea locală.

### Import

1. Utilizatorul selectează fișierul proiect.
2. Aplicația îl validează într-o stare temporară.
3. Dacă proiectul activ are modificări, utilizatorul confirmă înlocuirea și
   poate exporta versiunea curentă.
4. Fișierul mai vechi poate fi migrat cu rezumat; versiunea viitoare
   incompatibilă este respinsă.
5. După import, rezultatele derivate sunt recalculate.

## 7. Layout

Desktop: navigare/variante în panou lateral, scena în centru și proprietăți/
rezultate contextual. Ecranele înguste folosesc panouri/taburi și păstrează
toate funcțiile importante accesibile.

## 8. Feedback de eroare și stare

- **Incomplet:** listă de câmpuri lipsă; se poate salva ca draft.
- **Invalid:** mesaj lângă intrare și păstrarea valorilor pentru corectare.
- **Neverificat:** explicația datelor lipsă sau limitei algoritmului.
- **Depășire:** valoare, prag și diferență afișate împreună.
- **Salvare eșuată:** avertizare persistentă și export manual disponibil.
- **Import eșuat:** motivul respingerii; proiectul activ rămâne nemodificat.

În editor, comparație și raport rămâne vizibil avertismentul de estimare
profesională definit în specificația produsului.
