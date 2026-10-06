# ADR-0016: Admin multipli con un admin principale

- **Data:** 2026-10-06
- **Stato:** Proposta
- **Task collegato:** §13.1 · 0.5b (risolve Q7)

## Contesto

Servono più admin (budget, categorie, gestione membri), ma una sola persona deve poter fare le azioni irreversibili. Il ruolo `admin` in `members` è già assegnabile a più membri.

## Decisione

`households.owner_id` indica l'admin principale. `is_admin()` resta invariata. Solo il principale promuove/declassa admin, trasferisce il ruolo ed elimina il nucleo.

## Alternative considerate

- **Terzo ruolo `owner` in `members`** — scartata: obbliga a rivedere `is_admin()` e ogni policy che la usa, e non garantisce l'unicità del principale senza un vincolo in più.

## Conseguenze

- Migrazione: `households.owner_id not null`; l'onboarding (0.7) lo imposta al creatore.
- Il principale deve restare admin: da imporre con un test RLS.
