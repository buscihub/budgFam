# budgFam

PWA multi-utente per il budget di famiglia e le cose da fare condivise. Specifica completa, decisioni e stato del progetto in [`docs/DESIGN_DOC.md`](docs/DESIGN_DOC.md); il diario di cosa è stato fatto in [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Prerequisiti

- Node.js (LTS), pnpm, Docker (per Supabase locale), [Supabase CLI](https://supabase.com/docs/guides/cli), GitHub CLI (`gh`, opzionale)
- Un account Supabase e uno GitHub per il deploy (non servono per lo sviluppo locale) — dettagli in [`docs/DESIGN_DOC.md` §15](docs/DESIGN_DOC.md#15-prerequisiti-e-account)

## Avvio in locale

```bash
pnpm install
supabase start                 # Postgres locale su Docker; applica tutte le migrazioni
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_SUPABASE_ANON_KEY <- "anon key" da `supabase status`
pnpm dev                       # http://localhost:3000
```

Non esiste ancora un utente: registrati dalla pagina di login, poi crea il nucleo dalla pagina di onboarding.

## Comandi

```
pnpm dev              # avvio locale
pnpm build             # build di produzione
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (unit, dominio puro — nessuna dipendenza da Supabase)
pnpm test:rls         # test di integrazione RLS (richiede `supabase start`)
supabase start        # Supabase locale (Docker)
supabase stop         # ferma lo stack locale
supabase db reset     # riapplica tutte le migrazioni da zero
supabase gen types typescript --local > src/data/database.types.ts
```

Prima di aprire una pull request: `pnpm lint`, `pnpm typecheck` e `pnpm test` devono passare; se la modifica tocca schema o policy, anche `pnpm test:rls`. La CI (`.github/workflows/ci.yml`) verifica tutto questo su ogni pull request.

## Limite di sicurezza noto

La sicurezza vive nel database (Row Level Security su ogni tabella, vedi [`docs/DESIGN_DOC.md` §7](docs/DESIGN_DOC.md#7-sicurezza-e-accessi-rls)): un utente non vede mai dati fuori dal proprio nucleo, né i movimenti privati altrui. **L'amministratore del progetto Supabase scavalca la RLS** e può leggere tutti i dati dal pannello: è un limite dichiarato, non un bug, e va detto ai membri della famiglia prima dell'uso reale.

## Struttura del progetto

```
src/domain/   logica pura (import, classify, budget) — testata senza mock
src/data/     unico punto di accesso al database
src/app/      UI e route Next.js
supabase/     schema e migrazioni versionate
tests/rls/    test di integrazione RLS (richiedono Supabase locale)
docs/         specifica, changelog, ADR, mockup
```
