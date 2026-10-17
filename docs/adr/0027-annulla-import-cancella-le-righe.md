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
- La RLS di eliminazione su `transactions` («proprietario o admin») basta; l'annullamento passa dal server e controlla che l'import sia dell'utente o che l'utente sia admin.
- Un import già `undone` non si può annullare di nuovo.
