# domain/classify

Motore di regole, orchestrazione della classificazione AI, soglie di confidenza.

Codice puro (vedi `CLAUDE.md` §Regole non negoziabili, punto 3): niente import da `next`, `@supabase/*`, `@anthropic-ai/*`. La chiamata effettiva al modello Anthropic vive in `src/data/`; qui c'è solo la logica che decide cosa chiedere e come interpretare la risposta.
