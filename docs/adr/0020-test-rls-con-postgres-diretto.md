# ADR-0020: Test RLS con Postgres diretto (`SET ROLE`) più smoke test via API

- **Data:** 2026-10-06
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.6

## Contesto

La regola 8 di CLAUDE.md vuole ogni tabella con RLS **e test**, e il §7 chiede di coprire ogni riga della matrice di accesso. Servono molti casi (utenti diversi × tabelle × operazioni), veloci da eseguire in locale e in CI, che distinguano *perché* una scrittura fallisce.

## Decisione

La matrice si testa con Vitest collegandosi direttamente a Postgres (`pg`): ogni test simula l'utente con `set local role authenticated` e i claims JWT, dentro una transazione che finisce sempre in `rollback`. Le fixture si inseriscono una volta per run come `postgres`. Gli errori si verificano per **SQLSTATE e messaggio** (RLS, privilegio, unique, check). Tre **smoke test** con `supabase-js` e utenti veri (Auth → PostgREST → Postgres) provano la catena completa fino a `auth.uid()`.

## Alternative considerate

- **Solo `supabase-js` con utenti veri** — scartata: creare e autenticare utenti per ogni caso è lento, le fixture sono complicate e PostgREST nasconde il motivo dell'errore.
- **pgTAP (test in SQL dentro il database)** — scartata: altro linguaggio e altro strumento rispetto allo stack (TypeScript/Vitest), più difficile da leggere e integrare in CI.
- **Mock delle policy** — scartata: non verificherebbe le policy reali.

## Conseguenze

- `pnpm test:rls` richiede `supabase start`; `pnpm test` (unit) resta indipendente da Docker (`vitest.rls.config.ts` separato).
- I test rifiutano di partire se il database non è locale (cancellano e riscrivono dati).
- Le chiavi non stanno nel repository: si leggono da `supabase status`.
- Verificato che i test falliscano rompendo di proposito una policy o un grant (policy `accounts_select` aperta, grant su `transactions.owner_id`, `members_delete` e `budgets_select` indeboliti).
