# ADR-0033: Eliminando un conto restano solo i movimenti condivisi

- **Data:** 2026-10-17
- **Stato:** Accettata (2026-10-17)
- **Task collegato:** §13.1 · 1.5a

## Contesto

ADR-025 escludeva l'eliminazione dei conti dalla v1, ma un conto creato per sbaglio, o chiuso in banca, deve poter sparire. `transactions.account_id` e `imports.account_id` sono FK senza cascade: oggi il DB rifiuterebbe l'eliminazione di un conto con dati. I movimenti **condivisi** appartengono ai riepiloghi della famiglia (ADR-029 segue lo stesso principio per i membri); quelli **privati** sono dati personali del proprietario, legati a quel conto.

## Decisione

Eliminare un conto cancella i suoi movimenti **privati** e conserva quelli **condivisi**, che restano senza conto (`account_id` null). Vale la `visibility` del movimento, non quella del conto (ADR-015). I record in `imports` restano, con `account_id` null e i contatori intatti.

Implementazione: le due FK diventano nullable con `on delete set null`; un trigger `before delete` su `accounts`, **non** `security definer`, cancella i movimenti privati di quel conto. Poiché esegue con i permessi di chi elimina, la RLS decide cosa può cancellare: il proprietario elimina i propri privati; un admin che elimina un conto condiviso altrui non vede i privati del proprietario, quindi non li tocca. Quelli restano senza conto, visibili solo al proprietario.

## Alternative considerate

- **Eliminare solo conti vuoti** — scartata da Federico: non copre un conto chiuso con storico.
- **Cascade su tutti i movimenti** — scartata: i movimenti condivisi sparirebbero dai riepiloghi di tutta la famiglia.
- **Conservare anche i privati** — scartata da Federico: dati personali orfani, senza più il conto che dava loro un contesto.
- **Trigger `security definer`** — scartata: un admin potrebbe cancellare movimenti privati altrui che non può nemmeno leggere (ADR-015).

## Conseguenze

- `transactions.account_id` e `imports.account_id` nullable; nessuna policy RLS cambia (`owns_account` serve solo all'insert, e un movimento senza conto non si inserisce).
- La UI gestisce il movimento senza conto (già previsto da ADR-025 per i conti privati altrui): nessun nome del conto, niente segnaposto.
- Il reimport su un nuovo conto non crea doppioni: `import_hash` è unico per nucleo, non per conto.
- La conferma di eliminazione mostra quanti movimenti verranno cancellati (privati) e quanti resteranno (condivisi). L'azione non è reversibile.
- Il «tipo» del conto non si modifica (ADR-025); eliminare e ricreare non è un modo per cambiarlo se ci sono dati privati.
- Caso residuo: privati del proprietario rimasti orfani dopo l'eliminazione da parte di un admin; il proprietario può cancellarli a mano dalla lista Movimenti.
