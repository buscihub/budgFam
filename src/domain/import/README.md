# domain/import

Rilevamento del formato bancario, parser, normalizzazione descrizioni/importi, deduplica.

Codice puro (vedi `CLAUDE.md` §Regole non negoziabili, punto 3): niente import da `next`, `@supabase/*`, `@anthropic-ai/*`. Riceve dati (es. il testo di un CSV) e restituisce dati (movimenti normalizzati), quindi si testa senza mock.
