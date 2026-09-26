# data

Unico punto di accesso al database (vedi `CLAUDE.md` §Regole non negoziabili, punto 2). Componenti e route in `src/app/` non usano mai direttamente il client Supabase: passano da qui.

Vive qui anche il client Anthropic lato server (`ANTHROPIC_API_KEY`, mai `NEXT_PUBLIC_`).
