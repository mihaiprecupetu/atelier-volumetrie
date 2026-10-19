# Volumetrie

Aplicație web pentru arhitecți, dedicată configurării unui teren și explorării
variantelor de volumetrie 3D care se încadrează în parametrii urbanistici
introduși de utilizator.

> **Stadiu:** prototip funcțional local-first. Limitările și funcțiile
> implementate sunt descrise în [starea implementării](docs/IMPLEMENTATION_STATUS.md).

## Documentație

- [Index documentație](docs/README.md)
- [Specificația produsului](docs/PRODUCT_SPEC.md)
- [Specificația funcțională](docs/FUNCTIONAL_SPEC.md)
- [Fluxuri UX](docs/UX_FLOWS.md)
- [Reguli de domeniu și calcule](docs/DOMAIN_RULES.md)
- [Modelul de date și formatul proiectului](docs/DATA_MODEL.md)
- [Arhitectura tehnică](docs/ARCHITECTURE.md)
- [Securitate și confidențialitate](docs/SECURITY_PRIVACY.md)
- [Plan de livrare](docs/ROADMAP.md)
- [Decizii și ipoteze](docs/DECISIONS.md)
- [Starea implementării](docs/IMPLEMENTATION_STATUS.md)
- [Teste de domeniu în browser](tests/domain.test.html)

## Pe scurt

Arhitectul configurează mai întâi proiectul și terenul, apoi regulile
urbanistice, apoi una sau mai multe variante de volumetrie. Terenul poate fi
introdus în WGS84 (latitudine/longitudine) sau în Stereo 70 (EPSG:3844).
Fiecare variantă are amprentă, regim P/P+N, retrageri N/S/E/V independente,
model 3D schematic și opțiuni de acoperiș. Prima variantă este generată cu o
amprentă rotită, maximizată aproximativ în parcela rămasă, cu afișare 2D sau
axonometrică 3D. La etapa Reguli se pot selecta maximum două aliniamente pe
laturi cardinale sau colțuri.
Rezultatele sunt estimări, nu certificări
urbanistice sau cadastrale. Conturul terenului poate fi desenat cu mouse-ul pe
o hartă web sau introdus prin coordonate.

Aplicația este planificată ca web app local-first, fără backend propriu.
Proiectele pot fi exportate într-un fișier JSON versionat și importate ulterior.
Stocarea în browser este convenabilă, dar fișierul exportat este mecanismul
portabil de păstrare.

## Pornire prototip

Deschide proiectul în VS Code și pornește-l printr-un server static local (de
exemplu, extensia **Live Server**: click dreapta pe `index.html` → **Open with
Live Server**), apoi accesează adresa `http://localhost` afișată de extensie.
Alternativ, din directorul proiectului rulează `py -m http.server 8000` și
deschide `http://localhost:8000`. Nu deschide direct `index.html` cu schema
`file://`: serviciul public de tile-uri OpenStreetMap poate răspunde cu HTTP
403 când cererea nu are un origin web HTTP. Harta și fonturile au nevoie de
conexiune internet; dacă harta tot nu este disponibilă, punctele se pot
introduce manual. Serverul servește doar fișiere statice și nu este un backend
al aplicației; nu este necesar build step. Detaliile și limitările implementate
sunt în [starea implementării](docs/IMPLEMENTATION_STATUS.md).
Interfața oferă temă luminoasă și întunecată, urmează preferința sistemului la
prima deschidere și păstrează local tema aleasă.

## Limitări

Nu există motor oficial de interpretare legislativă, integrare cadastrală, BIM
sau documentație pentru autorizare. Orice rezultat trebuie verificat de
arhitect față de documentele și reglementările aplicabile proiectului.
