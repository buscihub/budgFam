# CLAUDE.md — budgFam

PWA multi-utente per il **budget di famiglia** e le **cose da fare condivise** (4 utenti: Federico, la madre, le sorelle). È anche un progetto portfolio per una candidatura da Software Engineer a Bending Spoons, quindi qualità del codice, decisioni motivate e test contano quanto le funzioni.

La specifica completa è in `docs/DESIGN_DOC.md`. È lunga e non viene caricata in automatico: prima di ogni task non banale leggi il §4.1, la riga del task nel §13.1 e le sezioni che quel task realizza (indice: `grep -n '^## \|^### ' docs/DESIGN_DOC.md`, poi leggi per intervalli di righe). `/task-start N.N` fa esattamente questo. Le sezioni normative (4.1, 5, 6, 7, 8, 10, 11, 13) sono vincolanti.

## Come lavorare con me (Federico)

- **Parla in italiano.** Codice, identificatori, commit e commenti nel codice in **inglese**; testi dell'interfaccia in italiano.
- **Passi piccoli.** Un task del §13.1 alla volta, come se fosse una PR: prima un piano breve (file toccati, approccio, test), poi il codice.
- **Un task, una sessione.** Si apre con `/task-start N.N`, si chiude con `/task-close N.N`; tra un task e l'altro si riparte con `/clear`.
- **Spiegami le scelte.** Devo saper difendere ogni riga a un colloquio. Per ogni pezzo non ovvio spiega il perché in due righe, e segnala le alternative scartate.
- **Le parti centrali le scrivo io.** Per parser (`src/domain/import`), deduplica e policy RLS: proponi interfaccia, test e approccio, poi chiedimi se le scrivo io o se procedi tu.
- **Non inventare le domande aperte** (DESIGN_DOC §17). Se un task dipende da Q1-Q7 senza risposta, fermati e chiedimi.
- **Non aggiungere funzioni fuori scope** (memoria semantica, note, salute, abitudini, briefing, collegamento diretto alle banche). Se ti sembra utile qualcosa di nuovo, proponilo e basta.
- **Se devi deviare dalla specifica:** prima proponi la modifica a `docs/DESIGN_DOC.md` (e l'ADR), poi il codice.

## Documentazione: cosa aggiornare e quando

Quattro documenti, compiti diversi (dettagli in `docs/DESIGN_DOC.md` → "Come si tiene aggiornata la documentazione"). Regola pratica: *cosa il sistema deve fare* → DESIGN_DOC (+ ADR se è una scelta tecnica); *cosa è successo* → CHANGELOG; *come lavoriamo insieme* → questo file. Tutta la documentazione (DESIGN_DOC, CHANGELOG, ADR, mockup) vive in `docs/`; solo `CLAUDE.md` resta nella root, perché Claude Code lo carica automaticamente da lì a inizio sessione.

**A fine di ogni task del §13.1:** `/task-close N.N`. Lancia i check, spunta la riga nel §13.1, aggiunge la voce al CHANGELOG e fa rivedere il diff. Un task non è chiuso finché `node scripts/check-task-docs.mjs --strict` non passa (gira anche in CI).

**Solo se il task ha comportato una decisione tecnica non ovvia** (una scelta con alternative reali, non l'esecuzione di qualcosa già deciso nel DESIGN_DOC): un ADR in `docs/adr/NNNN-titolo.md` da `docs/adr/TEMPLATE.md`, più la riga nella tabella di `docs/DESIGN_DOC.md` §14.

**Non fare mai il contrario:** codice prima, decisione dopo "giustificata" a posteriori. Se stai per scegliere qualcosa che il DESIGN_DOC non dice, fermati e proponimelo.

**A fine di ogni FASE** (quando l'ultimo task della fase è chiuso e il criterio d'uscita è verificato): `/phase-close N`. Aggiorna la fase corrente nel DESIGN_DOC §13 e nella sezione "Stato" qui sotto, e aggiunge un capitolo a `study/budgFam-studio.pdf`, il diario di studio personale. `study/` non è su Git: è materiale di apprendimento, non documentazione del progetto.

## Automazioni di Claude Code

Tutto in `.claude/`, versionato con il progetto.

- **Comandi** (`.claude/skills/`): `/task-start`, `/task-close`, `/phase-close`.
- **Agenti** (`.claude/agents/`): `doc-keeper` scrive la documentazione di fine task; `spec-reviewer` e `rls-reviewer` rivedono il diff in sola lettura. Li lancia `/task-close`, in parallelo. `study-keeper` aggiorna il diario di studio in `study/`; lo lancia `/phase-close`.
- **Permessi** (`.claude/settings.json`): le modifiche ai file sono accettate in automatico (`acceptEdits`); check, git locale e Supabase locale girano senza conferma; chiedono conferma le modifiche a `supabase/migrations/`, `git push` e l'apertura delle PR; `.env.local` non si legge; `supabase db push`, `supabase link`, push forzato e `git reset --hard` sono vietati.
- **Hook `Stop`**: `scripts/check-task-docs.mjs` blocca la chiusura del turno se il §13.1 ha righe doppie o un task spuntato senza voce nel CHANGELOG.

## Regole non negoziabili (sintesi di DESIGN_DOC §4.1)

1. Importi **sempre in centesimi interi**. Mai float per i soldi.
2. Accesso al DB **solo da `src/data/`**. Mai client Supabase in componenti o route.
3. `src/domain/` è **puro**: niente import da `next`, `@supabase/*`, `@anthropic-ai/*`.
4. **Mai chiamare il modello AI al caricamento di una pagina.** Solo da azioni esplicite. Output AI sempre validato con Zod.
5. Al modello vanno solo descrizione normalizzata, importo e segno. **Mai** IBAN, nomi, saldi, email.
6. `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` **solo lato server** (`import "server-only"`, mai `NEXT_PUBLIC_`).
7. Ogni modifica allo schema è una **migrazione** in `supabase/migrations/`, seguita da `supabase gen types`.
8. Ogni tabella ha **RLS attiva + test**. Le policy usano `is_member()` / `is_admin()` (evita la ricorsione su `members`).
9. Import **idempotente**: il reimport non crea doppioni né perde movimenti identici legittimi.
10. **Mai committare dati reali**: fixture, golden set e seed sono anonimizzati o finti.
11. Date contabili come `date`; conversioni in `Europe/Rome`.

## Stack

Next.js (App Router) · TypeScript strict · pnpm · Supabase (Postgres, Auth, RLS) con `@supabase/ssr` · Zod · Anthropic SDK (modello da `ANTHROPIC_MODEL`) · Vitest · Playwright · GitHub Actions · Vercel · PWA.

Se Next.js dà errori su API che "dovrebbero esserci", leggi prima `node_modules/next/dist/docs/`: le versioni recenti hanno cambiato API.

## Struttura

```
src/domain/   logica pura (import, classify, budget) — testata senza mock
src/data/     unico accesso al database
src/app/      UI e route, sottili
supabase/migrations/   tests/   evals/   fixtures/
docs/         DESIGN_DOC.md, CHANGELOG.md, adr/, design/mockups/
study/        diario di studio personale (PDF + script) — non su Git
```

## Comandi

```
pnpm dev              # avvio locale
pnpm build            # build di produzione
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (unit, dominio puro)
pnpm test:rls         # test di integrazione RLS (richiede `supabase start`)
supabase start        # Supabase locale (Docker)
supabase db reset     # riapplica tutte le migrazioni
supabase gen types typescript --local > src/data/database.types.ts
```

`pnpm test:e2e` (Playwright) non esiste ancora: arriva quando ci sarà una UI da testare end-to-end (Fase 3).

Prima di dire che un task è finito: `lint`, `typecheck` e `test` devono passare. Se hai toccato schema o policy, anche `test:rls`.

## Stato

Fase corrente: **2 · Classificazione** (DESIGN_DOC §13.1). Fase 0 · Fondamenta chiusa (CI verde, isolamento tra nuclei dimostrato dai test RLS). Fase 1 · Primo import chiusa (import CSV con anteprima, deduplica e annullo; conti; movimenti; riepilogo mensile). La verifica con un mese **reale** è rimandata: va fatta con un estratto vero in un conto condiviso, importato due volte, confrontando i totali del Riepilogo.

*(Questa riga si aggiorna solo quando cambia la fase, non a ogni task — vedi sopra.)*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
