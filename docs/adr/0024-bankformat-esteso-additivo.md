# ADR-024: `BankFormat` esteso in modo additivo

- **Data:** 2026-10-10
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.3

## Contesto

Il `BankFormat` del §8.1 era stato disegnato sul solo Revolut. Il secondo formato reale, l'export di Trade Republic, non rientra:

- l'importo sul conto è `amount + fee + tax` (interessi 0,81 con imposta −0,21 → +0,60; commissione di 50 € con `amount` 0);
- la colonna `date` è la data **UTC**: un movimento delle 23:06 UTC del 16 è del 17 in Italia (regola 11);
- l'esercente sta in `name` per le carte e in `description` per i bonifici, e `description` finisce spesso con un `null` letterale;
- c'è un id univoco della banca (`transaction_id`) e un tipo (`BUY`, `CARD_TRANSACTION`…) che distingue spese da investimenti.

## Decisione

Estendere `BankFormat` solo con campi **nuovi o opzionali**: `amount.mode = "sum"`, `dateFormat = "ISO_DATETIME_UTC"` (convertito in `Europe/Rome`), `descriptionMode`, `externalIdColumn`, `kindColumn`. I formati esistenti non cambiano.

## Alternative considerate

- **Un parser dedicato per banca** — scartata: ogni nuova banca diventa codice, e il punto del §8.1 è che dopo la mappatura il parsing sia dato, non codice.
- **Pre-elaborare il file (es. sommare le colonne) prima del parser** — scartata: sposta la logica fuori dal formato salvato, quindi fuori dall'anteprima di conferma e dai test sul formato.
- **Usare solo `amount` e ignorare commissioni e imposte** — scartata: i totali non tornerebbero con l'estratto conto (criterio di uscita della Fase 1).

## Conseguenze

- Il parser e la normalizzazione restano funzioni pure, testate sulle fixture.
- `externalIdColumn` è solo letto e passato avanti: come usarlo nella deduplica (§8.3, ADR-009) si decide nel task 1.4, con la sua modifica al DESIGN_DOC.
- `kindColumn` è solo passato avanti: il suo uso nella classificazione (movimenti d'investimento fuori dai riepiloghi, come l'esclusione B&B) si decide nella Fase 2.
- Aperto: altri formati (UniCredit, Findomestic) possono richiedere altre estensioni.
