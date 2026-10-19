# Changelog — budgFam

Diario di cosa è stato fatto, in ordine cronologico (più recente in cima). **Non spiega il perché** delle scelte tecniche — quello sta negli ADR (`docs/adr/`) — registra **cosa è cambiato e quando**.

Una riga per task chiuso (§13.1 di `DESIGN_DOC.md`): data, task, cosa è cambiato, link alla pull request se c'è.

---

## Fase 1 · Primo import

### 2026-10-19 — Correzioni di 1.5 dopo la revisione: annullo import solo per chi l'ha caricato, atomico

- ADR-027 rivisto: «Annulla questo import» è consentito solo a chi ha caricato il file (prima anche a un admin, che però non vede i movimenti privati dell'autore: l'import risultava `undone` con le righe ancora dentro).
- Migrazione `20261019140000_undo_import.sql`: funzione `undo_import` (`SECURITY INVOKER`), cancellazione delle righe e stato `undone` in una sola transazione; tipi rigenerati.
- `runImport`: se l'ultima scrittura fallisce, le righe appena inserite vengono tolte e l'import passa a `failed` (prima restava `processing`). La pagina dell'esito segnala un annullo non riuscito.
- Test: `tests/rls/undo-import.test.ts` (8 casi: solo l'autore, righe di altri import e manuali intatte, già annullato, stati non annullabili, altro nucleo, utente non autenticato).
- Migrazione `20261019150000_imports_hardening.sql`: `imports` come le altre tabelle (ADR-019): update solo del caricatore e solo su `status`, `error` e contatori; insert solo a proprio nome e per un proprio conto. `change_account_visibility` rifiuta parametri nulli e blocca la riga del conto.
- Migrazione `20261019160000_transactions_delete_visibility.sql`: la policy di cancellazione dei movimenti ammetteva a un admin anche i privati altrui con un `delete` senza condizione (il test lo ha mostrato: 4 righe cancellate su 2 visibili). Ora l'admin cancella solo i condivisi.
- Test RLS nuovi: scritture su `imports` per ruolo e colonna, `ON CONFLICT DO NOTHING` sull'hash (reimport e reimport dopo annullo), delete senza condizione, parametri nulli e movimenti di altri in `change_account_visibility`; 212 test RLS in tutto.
- ADR-036 (ritorno alla pagina di partenza, mese dei movimenti, limiti dell'import) e §7 aggiornato.

### 2026-10-19 — Task 1.6b: Riepilogo, scelta del mese

- Il Riepilogo legge `?mese=YYYY-MM` (mese mancante o non valido = mese corrente in Europe/Rome) e ha le frecce ‹ › come la lista movimenti; la freccia avanti si ferma sul mese corrente. Lo stato vuoto dice il mese («Nessun movimento condiviso a gennaio 2025»).
- Barra del mese condivisa: componente `MonthBar` (`src/app/(app)/month-bar.tsx`) usato da Riepilogo e dalla lista movimenti, al posto di due stili quasi uguali. §5.3 e §13.1 aggiornati.
- Nessun cambiamento ai totali: restano i movimenti condivisi (vista «Famiglia»; la vista «Personale» è 3.2b). Verificato con le fixture: gennaio 2025 dà entrate 226,88 €; le uscite sono 366,82 € e non 371,82 € perché un movimento da 5,00 € di quel conto è privato per scelta.

### 2026-10-19 — Task 1.5c: «Conti» al posto di «Movimenti» nella barra di navigazione

- Decisione in ADR-035 (sostituisce in parte ADR-025 e ADR-026); §5.3 e §13.1 di `DESIGN_DOC.md` riallineati, nota nel README dei mockup (gli snapshot mostrano ancora la voce Movimenti).
- Barra: Riepilogo · Conti · Cose da fare; «Conti» resta attiva anche su `/movimenti/*`. L'elenco Conti ha la riga «Tutti i movimenti» (`/movimenti`) e ogni conto apre la sua pagina `/conti/[id]` con i movimenti del mese; la lista mensile è un componente condiviso (`transactions-view.tsx`).
- Aggiunta di movimenti (a mano o import) dalla pagina del conto, con conto e formato già scelti, o da «Tutti i movimenti», con il conto da scegliere. Dai conti in contanti non si offre l'import. Chiudere, annullare e salvare tornano alla pagina di partenza (`?da=`, controllato da `safeNextPath`/`returnPath`).
- Dopo aver aggiunto un movimento o importato un file si apre il mese del movimento, non quello da cui si partiva; un mese vuoto propone «Vai a» l'ultimo mese con movimenti (`latestBefore`).
- Impostazioni del conto (`/conti/[id]/modifica`, solo proprietario): nome, formato del file e visibilità privato/condiviso con anteprima e le tre opzioni di ADR-015 (solo da ora, da una data, tutto lo storico). Il form non perde più i valori digitati quando il salvataggio è rifiutato.
- Migrazione `20261019120000_change_account_visibility.sql`: funzione `change_account_visibility` (`SECURITY INVOKER`) che cambia conto e movimenti in una sola transazione; tipi rigenerati in `src/data/database.types.ts`.
- Test: 21 nuovi unitari (`updateAccountSchema`, `visibility`, `transactionsHref` con `basePath`, `returnPath`, `withMonthParam`) e 10 RLS in `tests/rls/account-visibility.test.ts`.

### 2026-10-19 — Task 1.5: pagina Importa con anteprima, deduplica e annullamento

- Migrazione `20261018100000_imports_status_undone.sql`: lo stato `undone` per `imports.status` (ADR-027).
- Preset dei formati banca in `src/domain/import/presets.ts` (Revolut, Trade Republic; ADR-028), `prepareImport` (parse → normalizza → hash) e `splitNewAndDuplicates` in `src/domain/import/`; `NormalizedTransaction` porta anche `rawDescription` (serve a `transactions.raw_description`, non entra nell'hash).
- `src/data/imports.ts`: anteprima senza scrivere, import con `upsert … ignoreDuplicates` su `(household_id, import_hash)`, esito e annullamento (cancella le righe dell'import e porta lo stato a `undone`).
- Flusso `/movimenti/importa`: conto, file, formato riconosciuto, anteprima con nuovi e già presenti, conferma, esito con «Annulla questo import». I movimenti entrano senza categoria. Il file resta selezionato fra anteprima e conferma (i dati si inviano a mano, perché React 19 svuota il form dopo un'azione).
- Test: unitari per preset, `prepareImport` e `splitNewAndDuplicates` (reimport = tutto già presente); `tests/rls/imports.test.ts` per stato, unicità dell'hash e annullamento.

### 2026-10-18 — Task 1.5b: guscio a tre voci, Movimenti per mese, dettaglio e inserimento manuale

- Migrazione per la colonna `transactions.note` (nota sul movimento); tipi rigenerati in `src/data/database.types.ts`.
- Guscio dell'app a tre voci nello stile dei mockup (Liquid Glass, ADR-012, ADR-034): fogli di stile e token in `src/app/styles/`, CSS Modules per le schermate, icone in `src/app/icons.tsx`. Ridisegnate le pagine Movimenti, Riepilogo e Conti.
- Movimenti: lista di un mese alla volta (‹ › per cambiare mese, predefinito il mese corrente in Europe/Rome), filtri per conto, categoria e «da rivedere». Dettaglio movimento con categoria, nota, visibilità (con «Torna a seguire il conto», campo `followAccount`) ed eliminazione. Inserimento manuale dal «+».
- Importi digitati con il punto come separatore decimale: `12.50` diventa 1250 centesimi, e `12,50` dà lo stesso valore. Le descrizioni sono mostrate in Title Case; il valore salvato non cambia.
- Chip delle categorie più usate (fino a quattro, per direzione del movimento); a parità d'uso l'ordine è alfabetico. La scelta di una categoria avviene in un popover nella stessa pagina.
- «Nuovo conto» è una schermata (`/conti/nuovo`) che torna a `/conti` dopo il salvataggio; il percorso di ritorno passa da `safeNextPath` (`src/domain/navigation/`), che accetta solo percorsi interni con un alfabeto ristretto (rifiuta `//x`, `/\x`, schemi).
- Il form del dettaglio invia la visibilità solo al proprietario del movimento: per gli altri il campo non viene toccato.
- Test: nuovi test unitari in `src/domain/transactions/` (categorie, descrizioni, filtri da URL, mesi, schemi, display) e in `src/domain/navigation/`; suite complessiva a 182 test unitari e 172 test RLS verdi.

### 2026-10-17 — Task 1.5a: creazione ed eliminazione base dei conti

- Migrazione `supabase/migrations/20261017120000_accounts_creation_deletion.sql`: `accounts.bank_format` da `jsonb` a `text` (identificatore di preset); vincolo «il conto cassa non ha formato»; unique `(owner_id, lower(name))`; `account_id` nullable con `on delete set null` su `transactions` e `imports`; trigger che cancella i movimenti privati del conto eliminato (ADR-033). Tipi rigenerati in `src/data/database.types.ts`.
- `src/domain/accounts/schemas.ts` (Zod, puro): validazione di nome, tipo, visibilità e formato; test in `schemas.test.ts` (7 casi).
- `src/data/accounts.ts`: creazione ed eliminazione dei conti, unico accesso al DB per la feature.
- Pagina `/conti` (`src/app/(app)/conti/`): form «Nuovo conto» e eliminazione con pagina di conferma.
- `tests/rls/account-deletion.test.ts`: 15 casi RLS sull'eliminazione (movimenti privati cancellati, condivisi conservati senza conto, admin che non distrugge i privati altrui, membro che non può eliminare) e sui vincoli nuovi.

### 2026-10-17 — Incoerenze mockup/specifica risolte (solo decisioni, nessun codice)

- Decisioni: categorie personalizzabili guidate dal `kind` (ADR-031); nota sul movimento (`transactions.note`); lettura offline (ADR-032); `bank_format` come identificatore di preset (ADR-028); «Annulla import» cancella le righe, stato `undone` (ADR-027); rimozione membro senza cancellazioni (ADR-029); budget valido finché non cambia (ADR-030). ADR-025 e ADR-026 accettate.
- `DESIGN_DOC.md`: §5.3, §6 (`bank_format`, `imports.status`, `transactions.note`, `categories.kind`), §6.1, §7, §8.1, §13.1 (nuovi 1.5b, 2.5b, 3.5d, 3.5e; 1.5 ridimensionato, 1.5a, 3.2, 3.3, 3.4c precisati), tabella ADR §14.
- README dei mockup: sezione «Differenze note rispetto alla specifica».

### 2026-10-12 — Documentazione allineata ai mockup

- `DESIGN_DOC.md`: §5.3 con tutte le schermate (7 aree), tabella §14 con ADR-025 e ADR-026 (Proposta), nota «da decidere» sul preset di formato in `accounts.bank_format` (§6), nuovi task 1.5a (creazione base dei conti), 3.4c (famiglia e membri), 3.5c (impostazioni e stati vuoti/offline/errore); 1.5 ampliato.
- ADR-012: nota che il campione dark è superato. ADR-025/026 restano «Proposta» fino a decisione.

### 2026-10-11 — Mockup: tutte le schermate dell'app, chiare e scure (Claude Design)

- Verificate le schermate rispetto a ADR e `DESIGN_DOC.md` e disegnate quelle mancanti: Riepilogo con vista Famiglia/Personale e «Trasferiti ai familiari» (ADR-018); dettaglio movimento (categoria, «applica sempre questa regola», visibilità del singolo movimento, destinatario del trasferimento); import completo (formato riconosciuto, anteprima con contatori, esito, annulla import, errori file e categorizzazione, coda «Da rivedere»); impostazioni, budget famiglia e personale, categorie (nascoste, «B&B» esclusa); famiglia e membri (inviti da 24 ore, ruoli, amministratore principale); accesso, registrazione, password, crea la famiglia, unisciti con invito; installazione su iPhone; stati vuoti, offline ed errore.
- Aggiunta la versione scura di tutte le schermate, comprese quelle esistenti (Aggiungi, Task, Conti su desktop).
- Eliminate le 5 esplorazioni di stile (`Main`, `Style-B`, `Style-B1`, `Style-B2`, `Style-C`): l'esito è già in ADR-012. Canvas riordinato per area (chiaro sopra, scuro sotto).
- 136 file in `docs/design/mockups/`; README riscritto. `docs/adr/0026-mappa-schermate.md` (Proposta). `DESIGN_DOC.md` non ancora aggiornato (§5.3 schermate, tabella ADR §14).

### 2026-10-10 — Mockup: schermata Conti (Claude Design)

- Disegnata la schermata **Conti** (mobile chiaro e scuro, desktop): elenco «I miei conti» / «Condivisi dalla famiglia» (sola lettura, col proprietario), creazione e modifica (sheet su mobile, pannello su desktop) con nome, tipo, visibilità e formato file, stato vuoto, anteprima del cambio di visibilità (ADR-015), caso contanti (nessun formato, nessun import).
- Disegnato il passo «scegli il conto» di Aggiungi → Importa file, con scelta del formato per i conti nati senza e «Nuovo conto» che non esce dall'import. Accesso a Conti dal filtro di Movimenti («Gestisci conti»), nessuna quarta voce in navigazione.
- Aggiornate Movimenti (mobile, mobile scuro, desktop) e Aggiungi movimento (mobile, desktop): nomi dei conti, filtro per conto, conto e visibilità del movimento che seguono il conto; un movimento condiviso di un conto privato mostra solo l'autore.
- 24 file in `docs/design/mockups/` (19 nuovi, 5 aggiornati); README aggiornato. `docs/adr/0025-schermata-conti.md` (Proposta). `DESIGN_DOC.md` non ancora aggiornato (§5.3 schermate, §6 `accounts`, §8.1 formati, §14 tabella ADR).

### 2026-10-10 — Task 1.4: hash di deduplica con indice di occorrenza

- `src/domain/import/dedup.ts` (`computeImportHashes`, puro, SHA-256 via `node:crypto`): calcola `importHash` per ogni movimento. Con id esterno della banca (`externalId`) l'hash è `hash(account_id, id_esterno)`; senza, `hash(account_id, data, importo, descrizione, n-esima occorrenza)`, così due caffè identici restano due movimenti e il reimport dello stesso file produce gli stessi hash.
- `src/domain/import/types.ts`: nuovo tipo `HashedTransaction` (movimento normalizzato + `importHash`).
- `docs/adr/0009-hash-con-indice-di-occorrenza.md`: ADR-009 (hash con indice di occorrenza, id della banca se presente); aggiornati §8.3 e la riga ADR-009 in `docs/DESIGN_DOC.md`.
- `src/domain/import/README.md` aggiornato con la nuova funzione.
- Test Vitest `dedup.test.ts` (19 casi, incluso un test golden che fissa il formato dell'input dell'hash, perché gli hash sono persistiti in `transactions.import_hash`). Lint, typecheck e test verdi (85 test in totale).

### 2026-10-10 — Task 1.3: normalizzazione descrizioni e importi, adattamento Trade Republic ([#21](https://github.com/buscihub/budgFam/pull/21))

- `src/domain/import/normalize.ts` (puro): `normalizeDescription` (maiuscole, IBAN e codici numerici di 6+ cifre rimossi, spazi compattati, idempotente), `parseAmountToCents` (importi con virgola o punto decimale e separatore delle migliaia, in centesimi interi), `toRomeDate` (istante UTC → data `Europe/Rome`), `normalizeTransactions` (→ `NormalizedTransaction[]`).
- `src/domain/import/parse.ts`: usa il parser importi di `normalize.ts`; supporta la colonna importo `sum` (importo netto = amount + fee + tax, cella vuota = 0), `descriptionMode: 'firstNonEmpty'`, `ISO_DATETIME_UTC` come formato data, e i campi opzionali `externalIdColumn` e `kindColumn` (letti e passati ai movimenti come `externalId` e `kind`, senza ancora usarli).
- `src/domain/import/types.ts`: estesi `BankFormat` (campi additivi, ADR-024) e `ParsedTransaction`; nuovo tipo `NormalizedTransaction`.
- `fixtures/trade-republic-2026.csv`: fixture anonimizzata di Trade Republic (copre commissioni, imposte, data UTC a cavallo di mezzanotte).
- Test Vitest: `normalize.test.ts` (20 casi) e `parse.test.ts` esteso con il caso Trade Republic e la somma di celle non valide. Lint, typecheck e test verdi (66 test in totale).

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
- ADR-015, 016, 017, 018 → _Accettata_; nuovo **ADR-019** (colonne immutabili con grant).

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
