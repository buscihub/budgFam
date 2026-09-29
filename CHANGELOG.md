# Changelog — budgFam

Diario di cosa è stato fatto, in ordine cronologico (più recente in cima). **Non spiega il perché** delle scelte tecniche — quello sta negli ADR (`docs/adr/`) — registra **cosa è cambiato e quando**.

Una riga per task chiuso (§13.1 di `DESIGN_DOC.md`): data, task, cosa è cambiato, link alla pull request se c'è.

---

## Fase 0 · Fondamenta

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
