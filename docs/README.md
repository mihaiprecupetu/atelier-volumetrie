# Documentația Volumetrie

Documentația este în limba română și descrie un MVP pentru arhitecți din
România. „Volumetrie” este numele de lucru.

## Ordine recomandată

1. [Specificația produsului](PRODUCT_SPEC.md) — scop, public și limite.
2. [Specificația funcțională](FUNCTIONAL_SPEC.md) — comportament și criterii
   de acceptare.
3. [Fluxuri UX](UX_FLOWS.md) — configurarea proiectului și activitățile
   principale.
4. [Reguli de domeniu](DOMAIN_RULES.md) — coordonate, geometrii și calcule.
5. [Modelul de date](DATA_MODEL.md) — formatul portabil al proiectului.
6. [Arhitectura](ARCHITECTURE.md) — componente și fluxuri tehnice.
7. [Securitate și confidențialitate](SECURITY_PRIVACY.md) — date locale și
   import de fișiere.
8. [Plan de livrare](ROADMAP.md) — etape și condiții de acceptare.
9. [Decizii](DECISIONS.md) — alegeri confirmate și ipoteze de revizuit.
10. [Starea implementării](IMPLEMENTATION_STATUS.md) — funcții disponibile și
    limitări cunoscute ale prototipului.

## Termeni

- **Proiect**: teren, reguli, variante și surse/observații aferente.
- **Teren / parcelă**: poligonul descris prin coordonate într-un CRS declarat.
- **Retragere**: distanță minimă introdusă față de laturile selectate.
- **Amprentă**: poligonul construcției văzut în plan.
- **Volumetrie**: model 3D schematic de tip extrudare; nu este BIM.
- **Variantă**: o amprentă și un regim de niveluri comparate cu datele
  proiectului.
- **CRS**: sistem de referință al coordonatelor.

## Convenții de stare

Rezultatele folosesc stări distincte: **în limitele datelor introduse**,
**depășire**, **neverificat** și **invalid**. „În limitele datelor introduse”
nu reprezintă certificare de conformitate cu legislația.
