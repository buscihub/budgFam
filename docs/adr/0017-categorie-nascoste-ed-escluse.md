# ADR-0017: Categorie nascoste e `kind = 'excluded'`

- **Data:** 2026-10-06
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.5b (risolve Q5, Q6)

## Contesto

Le categorie devono essere personalizzabili (aggiungere, nascondere). I movimenti del B&B, che passano dagli stessi conti, devono restare importati ma fuori da riepiloghi e budget.

## Decisione

`categories.is_hidden boolean`: una categoria nascosta sparisce dai selettori e dall'elenco inviato al classificatore, ma resta sui movimenti esistenti. Nuovo valore `kind = 'excluded'` per le categorie fuori dai riepiloghi (seed: «B&B»).

## Alternative considerate

- **Eliminare le categorie** — scartata: `transactions.category_id` le referenzia e si perderebbe lo storico.
- **Flag `excluded_from_totals` separato** — scartata: `kind` già governa come una categoria entra nei totali; un valore in più è più coerente di un secondo asse.
- **Conto dedicato al B&B** — scartata: i movimenti passano dagli stessi conti.

## Conseguenze

- Migrazione sul check di `kind` e nuova colonna; riepiloghi e budget filtrano `kind <> 'excluded'`.
- Il seed delle categorie (§6.1) vive nell'onboarding (0.7).
