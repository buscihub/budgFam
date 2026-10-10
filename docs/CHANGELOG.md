# Changelog — budgFam

Diario di cosa è stato fatto, in ordine cronologico (più recente in cima). **Non spiega il perché** delle scelte tecniche — quello sta negli ADR (`docs/adr/`) — registra **cosa è cambiato e quando**.

Una riga per task chiuso (§13.1 di `DESIGN_DOC.md`): data, task, cosa è cambiato, link alla pull request se c'è.

---

## Fase 1 · Primo import

### 2026-10-10 — Task 1.2: parser deterministico guidato da `BankFormat`
- `src/domain/import/types.ts`: tipi condivisi della pipeline (`BankFormat`, `ParsedTransaction`, `ParseResult`) — un unico posto per il contratto dati tra parsing (1.2), normalizzazione (1.3) e deduplica (1.4), invece di uno per file. `dateFormat` esteso a `"MMM D, YYYY"` (Revolut usa `"Jan 2, 2025"`, mese testuale — non previsto nell'enum originale, aggiunto prima del codice).
- `src/domain/import/parse.ts` (`parseBankCsv`, puro): CSV → `ParsedTransaction[]` (data ISO, descrizione grezza, importo in centesimi con segno). Tokenizing CSV con `csv-parse` (solo per il quoting, non per la logica di business); importo spogliato di qualunque simbolo valuta invece di aggiungere un campo dedicato al `BankFormat`.
- Regola di fine-dati: la prima riga dopo l'ultima transazione valida (es. `Total,,,...`) è considerata footer e ignorata (`skippedRows`); una riga non valida **in mezzo** ai dati fa invece fallire tutto il parsing (`ok: false` con l'indice di riga), per non perdere movimenti veri in silenzio.
- 10 test Vitest: fixture Revolut completa, formati data (`MMM D, YYYY`, `DD/MM/YYYY`), separatore delle migliaia, modalità `split` dare/avere, CSV con virgole quotate, riga centrale non valida, footer finale.
- Scritto da Claude su richiesta di Federico, dopo revisione e approvazione dell'interfaccia proposta (regola "le parti centrali le scrivo io" di CLAUDE.md).

### 2026-10-09 — Task 1.1: fixture anonimizzata Revolut
- `fixtures/revolut-personal-eur-2025-01.csv`: un mese di movimenti del conto "Personal Account (EUR)", struttura reale dell'estratto conto Revolut (sezione "Transaction statement": `Date, Description, Category, Money in/out, Balance, Tax withheld, Other taxes, Fees`).
- Anonimizzata da un estratto reale: nomi di persone sostituiti con nomi finti, importi e saldo ricalcolati da zero (consistenti riga per riga: saldo[n] = saldo[n-1] + importo[n]); nomi di esercenti (Amazon, iliad, ecc.) lasciati reali perché non sono dati personali.
- Scope: solo la tabella movimenti del conto corrente EUR. Escluse le sezioni di riepilogo saldi, investimenti e crypto dell'estratto consolidato Revolut — non sono movimenti bancari da importare nel budget (§8 del DESIGN_DOC parla solo di CSV banca).
- Varietà di casi coperta per il parser (1.2): spesa con commissione (piano Metal), bonifico in/out verso persone, deposito Apple Pay, rimborso, prelievo ATM con fee, cambio valuta, trasferimento interno tra "pocket", reward.

### 2026-10-09 — Task 1.6: riepilogo mensile
- `src/domain/budget/monthly-summary.ts` (`computeMonthlySummary`, puro, testato): entrate, uscite, saldo e totale per categoria in centesimi interi; esclude le categorie `kind = 'excluded'` (ADR-017) e `kind = 'transfer'`, che per §6.1 non entrano in Entrate/Uscite (la riga per destinatario resta nel task 3.4b, fuori scope qui); i movimenti senza categoria confluiscono in una riga "Non categorizzato".
- `src/data/transactions.ts` (`getMonthlySummary`, `getCurrentMonthRome`): legge le transazioni `visibility = 'shared'` del mese per il nucleo corrente (mese corrente in fuso `Europe/Rome` di default) e le passa al dominio.
- Pagina `/riepilogo` (Server Component): entrate, uscite, saldo e tabella per categoria, testo in italiano.
- 8 nuovi test Vitest sul dominio (mese vuoto, solo entrate, solo uscite, categorie escluse/transfer ignorate, non categorizzati, ordinamento).

### 2026-10-09 — Manutenzione: Fase 0 chiusa, diario di studio personale
- Tutti i task 0.1→0.9 chiusi, CI verde, isolamento tra nuclei dimostrato dai test RLS: **Fase 0 · Fondamenta chiusa**. Aggiornata la riga "Fase corrente" in `docs/DESIGN_DOC.md` §13 e in `CLAUDE.md`.
- Aggiunta `study/`: un diario di studio personale in PDF (`study/budgFam-studio.pdf`, generato da `study/build_pdf.py`) che spiega a livello teorico, con riferimenti al codice reale, cosa è stato fatto — non è documentazione del progetto, vive fuori da `docs/` e non è su Git (`.gitignore`). `CLAUDE.md` aggiornato con la regola: si aggiorna con un capitolo nuovo a fine di ogni fase, non a ogni task.

## Fase 0 · Fondamenta

### 2026-10-08 — Task 0.8: GitHub Actions
- `.github/workflows/ci.yml`, due job: `lint-typecheck-unit` (lint, build, typecheck, `pnpm test`) e `migrations-and-rls` (`supabase start` su un runner effimero — applica tutte le migrazioni da zero, una fallita blocca qui — poi `pnpm test:rls`); entrambi su push a `main` e su ogni pull request.
- Verificato in locale lo stesso percorso di un runner CI (`supabase stop --no-backup` poi `supabase start` da zero, `pnpm install --frozen-lockfile`), ma la prima esecuzione reale su GitHub ha trovato due problemi che la simulazione locale non poteva vedere: `pnpm/action-setup` andava in conflitto con `packageManager` di `package.json` (bastava non passargli una versione), e `tsc --noEmit` da solo falliva su `LayoutProps` perché Next.js 16 genera i tipi delle route durante `next build`/`next dev`, non con `tsc` isolato — risolto anteponendo `pnpm build` a `pnpm typecheck`. Entrambi i job sono verdi sulla PR.

### 2026-10-08 — Task 0.9: README minimo
- `README.md`: cos'è il progetto, prerequisiti, avvio in locale, comandi, limite di sicurezza noto (l'admin Supabase scavalca la RLS), struttura del repository. `.env.example` era già completo dal task 0.7a, nessuna modifica.
- Tolto da `CLAUDE.md` il placeholder "da completare a fine Fase 0" sui comandi: ora elenca solo quelli reali (`pnpm test:e2e`/Playwright non esiste ancora, rimandato alla Fase 3).

### 2026-10-08 — Task 0.7c: inviti con link monouso
- Tabella `invites` (codice a 256 bit, scadenza 24h, uso singolo) con RLS admin-only su select/insert/delete; `with check` sull'insert impedisce di superare le 24h o di pre-marcare un invito come usato. Solo **creare** un invito resta un INSERT ordinario: solo **accettarlo** usa la funzione `security definer` `accept_invite(invite_code, member_name)` — **ADR-023**.
- `src/data/invites.ts` (`createInvite`/`acceptInvite`), schemi Zod in `src/domain/household/schemas.ts`, pagina `/invite/[code]` per accettare, form admin-only nella home per generarne uno (ruolo scelto da chi invita, link assoluto costruito da `x-forwarded-proto`/`host`).
- 22 nuovi test RLS dedicati (`tests/rls/invites.test.ts`, policy + funzione; `tests/rls/invites-smoke.test.ts`, end-to-end attraverso l'API reale Auth→PostgREST→Postgres) più la sweep di isolamento tra nuclei estesa alla nuova tabella; 8 unit sugli schemi Zod. Verificato a mano con `psql` prima di scrivere i test automatici. `pnpm build` genera correttamente `/invite/[code]` come route dinamica.
- `docs/DESIGN_DOC.md` §6 e §7 aggiornati con la tabella `invites` e la logica di accettazione.

### 2026-10-07 — Task 0.7b: onboarding «crea nucleo» e categorie seed ([#11](https://github.com/buscihub/budgFam/pull/11))
- Funzione `create_household(household_name, member_name)` (`security definer`, solo `authenticated`): crea nucleo, primo admin e le 24 categorie del §6.1 in un'unica transazione; rifiuta se esiste già un nucleo; chiamate concorrenti serializzate con advisory lock — **ADR-022** (chiude il gap di ADR-014).
- Pagina `/onboarding` e `requireMembership()` (`src/data/households.ts`): chi è loggato ma senza nucleo viene mandato lì; la home mostra nome e famiglia.
- 13 nuovi test RLS (`tests/rls/create-household.test.ts`), 3 unit (schema Zod); verificata a mano la concorrenza (due creazioni simultanee → una sola riuscita) e il flusso reale con uno script (9/9).
- I file di test RLS ora girano in sequenza (`fileParallelism: false`): un test era fallito una volta senza motivo riproducibile, causa più probabile un deadlock tra file paralleli che svuotano e scrivono lo stesso database; dopo la modifica 8 esecuzioni consecutive verdi (ipotesi, non dimostrata).

### 2026-10-06 — Task 0.7a: sessione, login, logout, pagina protetta ([#10](https://github.com/buscihub/budgFam/pull/10))
- Registrazione, login e logout con email + password (Supabase Auth, `@supabase/ssr`); pagina `/` protetta; `proxy.ts` con redirect ottimistico e `getCurrentUser()`/`requireUser()` (basati su `getUser()`) come controllo autorevole — **ADR-021**.
- Nuovo `src/data/auth.ts`, `src/data/supabase/{server,proxy}.ts`, `src/data/env.ts`; schemi Zod in `src/domain/auth/` con test; password minima 8 caratteri (anche in `supabase/config.toml`); `.env.example`.
- Task 0.7 spezzato in 0.7a/0.7b/0.7c; aggiunto 3.5b (reset password e conferma email prima del deploy).
- Verificato con uno script sul flusso reale (registrazione, login, logout, errori generici, redirect) e con `pnpm build`.

### 2026-10-06 — Task 0.6: test di integrazione RLS ([#9](https://github.com/buscihub/budgFam/pull/9))
- Aggiunti 116 test in `tests/rls/` (`pnpm test:rls`): matrice di accesso del §7 per tutte le 9 tabelle, isolamento tra nuclei, utente senza nucleo e anonimo, vincoli (idempotenza, `kind`, budget), più 3 smoke test via API con utenti veri.
- Errori verificati per SQLSTATE e messaggio; ogni test in una transazione annullata. Controllato rompendo di proposito policy e grant: i test se ne accorgono (**ADR-020**).
- Config separata `vitest.rls.config.ts`: `pnpm test` non richiede Docker.

### 2026-10-06 — Task 0.5b: schema e RLS per conti personali, admin principale, budget personali ([#8](https://github.com/buscihub/budgFam/pull/8))
- Migrazione di schema: `households.owner_id`, `accounts.owner_id`/`visibility`, `categories.is_hidden` e `kind 'excluded'`, `transactions.visibility_overridden`/`transfer_member_id` (default `visibility` → `private`), `budgets.id`/`member_id` con indice unico.
- Migrazione RLS: funzioni `is_owner`/`owns_account`; policy nuove per `accounts`, `members`, `households` (delete solo principale), `budgets` (familiari/personali) e insert di `transactions` solo sui propri conti; colonne immutabili (`owner_id`, `account_id`…) protette con grant a livello di colonna.
- Verificato con 46 casi in `psql` (due nuclei, cinque utenti); diventeranno i test automatici del task 0.6. Primo `src/data/database.types.ts` generato.
- ADR-015, 016, 017, 018 → *Accettata*; nuovo **ADR-019** (colonne immutabili con grant).

### 2026-10-06 — Specifica: rimossa la valutazione di PersonalOS e le scelte preliminari
- Dal DESIGN_DOC tolti §3.1-3.3 (confronto tra strumenti, guida PersonalOS di terzi, Opzione A vs B) e la fonte nel §18; il §3 ora è la sola «Decisione» (app essenziale, Fase 1 e 2). Ripuliti i riferimenti nel §5.1, nel §7 e in ADR-001 (rititolato).

### 2026-10-06 — Domande aperte Q1-Q7 risolte ([#7](https://github.com/buscihub/budgFam/pull/7))
- Registrate le risposte nel §17 del DESIGN_DOC (banche Revolut/UniCredit/Findomestic/Trade Republic, contanti con inserimento rapido, iPhone, privato di default con conti personali/condivisi, B&B come categoria di esclusione, categorie seed in §6.1, budget familiari agli admin).
- Proposti **ADR-015** (conti personali/condivisi), **ADR-016** (admin multipli con principale) e **ADR-017** (categorie nascoste, `excluded`); aggiunto il task 0.5b per la migrazione. Nessun codice toccato.
- Aggiunti **ADR-018** (vista Personale e budget personali) e, in ADR-015, regole per i trasferimenti ai familiari e per il cambio di visibilità di un conto; task 3.2 spezzato in 3.2/3.2b/3.2c, aggiunto 3.4b.
- Decisioni di dettaglio registrate: la vista Personale include tutti i movimenti dei propri conti (privati e condivisi); i trasferimenti ai familiari sono una riga a parte, quelli inviati restano fuori dalle uscite e quelli ricevuti contano come entrata personale; un bonifico a un esterno è una normale uscita; il cambio di visibilità di un conto chiede se estendere allo storico (mai sulle scelte esplicite).

### 2026-09-29 — Manutenzione: documentazione spostata in docs/
- Spostati `DESIGN_DOC.md`, `CHANGELOG.md` e `design/mockups/` sotto `docs/` (root: solo codice + `CLAUDE.md`, che resta lì perché Claude Code lo carica automaticamente da quella posizione).
- Aggiornati i riferimenti ai nuovi percorsi in `CLAUDE.md`, `docs/DESIGN_DOC.md`, `eslint.config.mjs`, `.prettierignore`. I riferimenti storici nelle voci già scritte di questo changelog e negli ADR restano invariati (raccontano lo stato di allora).

### 2026-09-26 — Task 0.5: Funzioni is_member/is_admin e policy RLS
- Aggiunte le funzioni `security definer` `is_member`/`is_admin` (§7) e attivata RLS su tutte le 9 tabelle, con policy select/insert/update/delete derivate dalla matrice di accesso del §7.
- Verificato manualmente con `psql` (due nuclei, tre utenti) che: un membro non vede nulla del nucleo altrui, non vede i movimenti privati di un altro membro, non può cancellare un movimento condiviso che non possiede e di cui non è admin, e non può inserirsi in un nucleo come membro senza essere admin. Test automatizzati arrivano nel task 0.6.
- Scoperto un gap di bootstrap: `households`/`members` non possono ancora avere una riga inserita da un utente autenticato normale (nessun admin esiste finché non esiste la prima riga in `members`) — documentato in **ADR-014**, risolto dall'onboarding del task 0.7.

### 2026-09-26 — Task 0.4: Supabase locale + prima migrazione
- `supabase init`; Supabase locale avviato su Docker.
- Prima migrazione (`supabase/migrations/20260926161938_initial_schema.sql`) con le 9 tabelle del §6 (households, members, accounts, categories, imports, transactions, category_rules, budgets, tasks), copiate fedelmente dallo schema normativo.
- Verificato con `supabase db reset` e ispezione diretta di Postgres (`\dt`, `\d transactions`) che tabelle, tipi, `unique`, `check` e foreign key corrispondono al §6.
- Nessuna policy RLS ancora: arriva nel task 0.5.

### 2026-09-26 — Task 0.3: Vitest + primo test sul dominio
- Configurato Vitest (`vitest.config.ts`, ambiente `node`) e aggiunto lo script `test`.
- Scritta `src/domain/budget/format-currency.ts` (`formatCents`), che converte centesimi interi in una stringa euro con `Intl.NumberFormat('it-IT', ...)`.
- Scoperto e documentato nei test un comportamento non ovvio di `Intl.NumberFormat` per `it-IT`: raggruppa le migliaia solo da 5 cifre in su (regola CLDR "min2") e usa uno spazio non-breaking prima di "€".
- Aggiunto `"type": "module"` a `package.json` per eliminare il warning di Vitest sul caricamento ESM/CommonJS di `vitest.config.ts`.

### 2026-09-26 — Task 0.2: Struttura src/domain, src/data, src/app
- Spostato `app/` in `src/app/`; aggiornato l'alias TypeScript `@/*` per puntare a `src/*`.
- Create `src/domain/import/`, `src/domain/classify/`, `src/domain/budget/`, `src/data/` con un README per cartella che ne spiega lo scopo e i vincoli (CLAUDE.md §Regole non negoziabili).
- Aggiunta una regola ESLint (`no-restricted-imports`, scoped su `src/domain/**`) che blocca import da `next`, `@supabase/*`, `@anthropic-ai/*`; verificato che un import reale da `next/server` fa fallire il lint.

### 2026-09-26 — Task 0.1: Scaffolding Next.js
- Creato il progetto Next.js (App Router, TypeScript strict con `noUncheckedIndexedAccess`) con `create-next-app`, gestito con pnpm.
- Configurati ESLint (`eslint-config-next` + `eslint-config-prettier`) e Prettier; script `lint`, `typecheck`, `build`.
- Aggiunto hook pre-commit (Husky + lint-staged) che lancia `eslint --fix`/`prettier --write` sui file staged; verificato che blocca un commit con un errore reale (`react-hooks/rules-of-hooks`).
- Rimossa la pagina/asset di default di `create-next-app`, sostituita con un placeholder minimo.
- Repository Git inizializzato e pubblicato su GitHub (`buscihub/budgFam`, privato).

## Pianificazione (prima della Fase 0)

### 2026-09-26 — Mockup delle schermate (Claude Design)
- Prototipate su Claude Design le schermate Riepilogo, Movimenti, Cose da fare (mobile e desktop), esplorando 3 direzioni di stile (A minimale, B caldo, C dati densi) e scegliendo la palette calda di B con titoli in sans-serif ("B1").
- Unificate "Movimenti" e "Importa" in un'unica schermata con azione "+" (manuale o import file); navigazione da 4 a 3 voci. Aggiornato il §5.3 di `DESIGN_DOC.md`. Vedi **ADR-013**.
- Rifatte tutte le schermate in stile "Liquid Glass" (Apple, iOS/macOS) sulla palette B1, con un primo campione di modalità scura (Riepilogo e Movimenti mobile). Vedi **ADR-012**.
- Aggiunta la schermata mancante "Aggiungi attività" (mobile e desktop).
- Creati `docs/adr/0012-liquid-glass.md` e `docs/adr/0013-unificazione-movimenti-importa.md`.
- Salvata in `design/mockups/` un'istantanea statica (HTML autonomo) delle 17 schermate/esplorazioni, per consultarle senza riaprire Claude Design; l'originale modificabile resta l'artifact.
- `DESIGN_DOC.md` → v0.4.

### 2026-09-26 — Processo di documentazione
- Definito come si aggiornano insieme `DESIGN_DOC.md`, gli ADR, questo changelog e `CLAUDE.md` (vedi `DESIGN_DOC.md` → "Come si tiene aggiornata la documentazione").
- Aggiunti `docs/adr/TEMPLATE.md` e questo file.
- `DESIGN_DOC.md` → v0.3.

### 2026-09-25 — Documento di progetto e istruzioni per Claude Code
- Creato `DESIGN_DOC.md` v0.1: confronto tra strade possibili (foglio, app di terzi, ibrido, app propria), valutazione della guida PersonalOS, confronto Opzione A vs Opzione B, decisione per l'Opzione B.
- `DESIGN_DOC.md` → v0.2: sezione "Come usare questo documento", regole non negoziabili (§4.1), architettura, schema del database completo, correzione delle policy RLS (funzioni `security definer` per evitare la ricorsione su `members`), pipeline di import, tabella di marcia divisa in task per fase, domande aperte.
- Creato `CLAUDE.md`: istruzioni operative per Claude Code (come lavorare insieme, regole non negoziabili in sintesi, stack, comandi).
- Rimosso il PDF della guida PersonalOS dalla cartella del progetto: materiale di terzi, non necessario al progetto una volta trascritto quanto serviva nel documento.
