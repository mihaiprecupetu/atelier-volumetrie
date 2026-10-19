# Securitate și confidențialitate

## 1. Date

Proiectele pot include coordonate exacte, geometria și dimensiunea terenului,
precum și note despre client sau investiție. Acestea pot fi sensibile chiar
fără nume de persoană.

## 2. Principii MVP

- fără cont, backend propriu sau upload automat;
- stocare locală numai pentru autosalvare;
- export inițiat de utilizator și avertizare privind coordonatele;
- importul este tratat ca date neîncredere;
- nu se execută cod, HTML sau expresii din fișier;
- logurile nu conțin coordonate exacte sau conținut integral al proiectului;
- dependențele geospațiale/3D sunt verificate pentru licență și actualizări.

## 3. Import sigur

Importatorul limitează mărimea fișierului și complexitatea (număr de vârfuri,
variante, adâncimea structurii), validează schema, tipurile, unitățile, CRS-ul,
valorile finite, referințele și geometria. Nu folosește `eval` sau injectare
HTML. Eșecul de parsare nu modifică proiectul activ.

## 4. Stocare și rețea

În prototip, `localStorage` poate fi șters de browser, profil sau utilizator și
nu este backup. Erorile de quota și permisiune sunt raportate. Funcția de digitizare pe hartă
încarcă date de la un furnizor extern (Google Maps sau alternativă), care poate
primi adresa IP, zona vizualizată și cereri de tile/API. UI-ul informează
utilizatorul înainte de folosire și oferă continuarea fără hartă prin coordonate
introduse manual/schiță locală. Termenii furnizorului, retenția și atribuirea
cartografică se verifică înainte de lansare. Servirea aplicației de producție
folosește HTTPS. Prototipul încarcă și Leaflet/fonturi din CDN-uri externe;
acestea transmit furnizorului metadatele obișnuite de rețea și necesită acces
internet.

## 5. Măsuri de implementare

- escaping text și interfață fără HTML brut din proiect;
- Content Security Policy restrictivă la hosting, unde este posibil;
- fără secrete de servicii în bundle;
- cheile publice ale hărții sunt restricționate pe origine, API și cote;
- monitorizarea consumului API previne costuri neașteptate; cheia client nu
  trebuie tratată drept secret;
- cheile furnizorului nu se includ în exportul proiectului; atribuirea și
  termenii cartografici sunt respectați în hartă și în raport, după caz;
- ștergere/resetare cu confirmare;
- crash reporting/telemetrie dezactivate implicit; orice adăugare cere decizie
  explicită și informare.

Acestea sunt cerințe de proiectare, nu un audit de securitate sau o garanție
asupra securității dispozitivului utilizatorului.
