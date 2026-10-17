# ADR-0028: `accounts.bank_format` è l'identificatore di un preset nel codice

- **Data:** 2026-10-17
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.5a, 2.3, 3.1

## Contesto

Il parser è guidato da un `BankFormat` dichiarativo (§8.1, ADR-024). Il conto deve ricordare quale formato usare, e l'interfaccia (ADR-025) mostra «Revolut», «Trade Republic», «Lo scelgo all'import». Lo schema aveva un `jsonb` senza nome.

## Decisione

`accounts.bank_format` è un `text` con l'identificatore del preset (`'revolut'`, `'trade_republic'`, … , `'auto'`); `null` finché non scelto; i conti `cash` non lo hanno (check). I preset sono oggetti `BankFormat` nel codice, versionati e coperti da test sulle fixture. Una mappatura scoperta dall'AI e confermata dall'utente (task 2.3) si salva in una tabella a parte, che il task 2.3 definisce.

## Alternative considerate

- **`jsonb` con l'intera mappatura sul conto** — scartata: il formato diventerebbe un dato non testato, duplicato su ogni conto, e un errore di mappatura non avrebbe fixture che lo prenda.
- **Chiave dentro il `jsonb`** — scartata: complica i vincoli e le query per nulla, visto che il preset è un valore semplice.

## Conseguenze

- Migrazione nel task 1.5a: da `jsonb` a `text`; nessun dato da convertire (nessun conto reale ancora).
- Aggiungere una banca = nuovo preset + fixture + test, senza migrazione se il check non elenca i valori (da scegliere in 1.5a: check elenco o validazione in `src/domain`).
- «auto» resta un segnaposto fino al task 2.3.
