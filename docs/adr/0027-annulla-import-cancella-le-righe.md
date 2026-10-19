# ADR-0027: «Annulla questo import» cancella le righe e porta l'import a `undone`

- **Data:** 2026-10-17
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.5

## Contesto

L'esito dell'import offre «Annulla questo import». Le transazioni portano `import_id`; l'indice unico su `(household_id, import_hash)` garantisce l'idempotenza (ADR-009). Bisogna decidere cosa succede ai dati all'annullamento senza rompere né l'idempotenza né le metriche.

## Decisione

Si eliminano le transazioni con quell'`import_id` (mai quelle inserite a mano né quelle di altri import) e l'import passa a `status = 'undone'`, con i contatori intatti. Il check su `imports.status` ammette il nuovo valore.

## Alternative considerate

- **Soft delete delle transazioni** — scartata: l'hash resterebbe nell'indice unico e bloccherebbe il reimport dello stesso file, che è proprio il caso d'uso («ho scelto il conto sbagliato»); servirebbe cambiare il vincolo.
- **Cancellare anche la riga di `imports`** — scartata: si perderebbero log e metriche (§12) di un'operazione reale.

## Conseguenze

- Migrazione sul check di `status` (task 1.5). Il tipo `imports.status` in `database.types.ts` si rigenera.
- Le correzioni fatte dall'utente sulle righe cancellate vanno perse; le regole nate da quelle correzioni restano.
- **Solo chi ha caricato il file può annullare** (rivisto il 2026-10-19, prima era «l'utente o un admin»). Un admin che non ha caricato l'import non vede i movimenti privati dell'autore, quindi non li cancellerebbe, ma l'import risulterebbe `undone` con le righe ancora dentro e il reimport resterebbe bloccato dall'indice unico.
- L'annullamento è la funzione del database `undo_import` (migrazione `20261019140000`, `SECURITY INVOKER`): cancella le righe e porta l'import a `undone` in una sola transazione, e rifiuta chi non è l'autore. Nessuna policy nuova.
- Un import già `undone` non si può annullare di nuovo.
