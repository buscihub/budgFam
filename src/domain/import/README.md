# domain/import

Rilevamento del formato bancario, parser, normalizzazione descrizioni/importi, deduplica.

Codice puro (vedi `CLAUDE.md` §Regole non negoziabili, punto 3): niente import da `next`, `@supabase/*`, `@anthropic-ai/*`. Riceve dati (es. il testo di un CSV) e restituisce dati (movimenti normalizzati), quindi si testa senza mock.

## Deduplica (`dedup.ts`)

`computeImportHashes` dà a ogni movimento l'`importHash` (§8.3, ADR-009): `(account_id, id della banca)` se la riga ha un id, altrimenti `(account_id, data, importo, descrizione, n-esima occorrenza nel file)`. Gli hash sono salvati nel database: **il formato dell'input dell'hash è un contratto**, cambiarlo fa ricreare tutti i movimenti al reimport. Il test «golden» in `dedup.test.ts` lo blocca.
