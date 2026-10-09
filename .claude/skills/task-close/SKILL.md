---
name: task-close
description: Chiude un task del §13.1. Lancia i check, poi in parallelo l'aggiornamento della documentazione e le revisioni in sola lettura, e prepara commit e PR.
argument-hint: '[id del task, es. 1.2]'
disable-model-invocation: true
---

Chiudi il task **$ARGUMENTS** del §13.1.

## 1. Check

Lancia `pnpm lint`, `pnpm typecheck` e `pnpm test`. Se il diff tocca `supabase/` o `tests/rls/`, anche `pnpm test:rls` (richiede `supabase start`). Se qualcosa fallisce, fermati qui: il task non è finito.

Se hai toccato una migrazione, rigenera i tipi con `supabase gen types typescript --local > src/data/database.types.ts`.

## 2. Documentazione e revisione, in parallelo

Lancia questi agenti **in un solo messaggio**, così lavorano insieme. A ciascuno passa l'id del task.

- `doc-keeper`: spunta la riga nel §13.1 e aggiunge la voce al CHANGELOG. È l'unico che scrive.
- `spec-reviewer`: confronta il diff con il §4.1 e con la specifica del task.
- `rls-reviewer`: solo se `git diff --name-only $(git merge-base HEAD origin/main) -- supabase/migrations/` non è vuoto.

## 3. Esito

- Se un revisore segnala una violazione, riportala a Federico con file e riga. Correggila tu solo se è fuori dalle parti centrali (parser, deduplica, policy RLS); altrimenti chiedi.
- Se `doc-keeper` o `spec-reviewer` segnalano una decisione tecnica senza ADR, non scriverlo di tua iniziativa: proponi a Federico il contenuto (contesto, decisione, alternative scartate, conseguenze). Con il suo ok, crea `docs/adr/NNNN-titolo.md` da `docs/adr/TEMPLATE.md` e aggiungi la riga alla tabella del §14.
- Rileggi la voce del CHANGELOG scritta da `doc-keeper` e correggila se è imprecisa.

## 4. Controllo finale

`node scripts/check-task-docs.mjs --strict` deve passare. È lo stesso controllo che gira in CI.

## 5. Consegna

Riepilogo in italiano: cosa è stato fatto, esito dei check, rilievi dei revisori e come sono stati risolti. Poi proponi:

- il messaggio di commit, in inglese, nello stile del repository (`feat($ARGUMENTS): …`);
- la descrizione della PR: cosa, perché, come è stato verificato.

Committa e fai push solo dopo la conferma di Federico. Se con questo task si chiude la fase, ricordagli `/phase-close`. Il task successivo si apre in una sessione pulita (`/clear`).
