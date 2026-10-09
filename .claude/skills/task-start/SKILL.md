---
name: task-start
description: Apre un task del §13.1 di docs/DESIGN_DOC.md. Legge solo le sezioni di specifica necessarie, controlla le domande aperte e propone il piano, poi si ferma prima di scrivere codice.
argument-hint: '[id del task, es. 1.2]'
disable-model-invocation: true
---

Apri il task **$ARGUMENTS** del §13.1. Non scrivere codice in questo turno: l'obiettivo è un piano che Federico approva.

1. **Stato del repository.** `git status --short` e `git branch --show-current`. Se ci sono modifiche non committate o sei su un branch di un altro task, segnalalo e fermati.
2. **Il task.** Trova la riga con `grep -n '^- \[.\] $ARGUMENTS ' docs/DESIGN_DOC.md`. Se non esiste, è già spuntata o compare due volte, fermati e dillo.
3. **La specifica, a sezioni.** `docs/DESIGN_DOC.md` è lungo: non leggerlo intero. Prendi l'indice con `grep -n '^## \|^### ' docs/DESIGN_DOC.md` e leggi per intervalli di righe:
   - sempre il §4.1 (regole non negoziabili);
   - le sezioni che il task realizza (per esempio §8.1-8.3 per l'import, §6 e §7 per schema e policy);
   - gli ADR in `docs/adr/` citati da quelle sezioni.
4. **Domande aperte.** Se la riga del task o le sezioni lette citano una domanda del §17, controllane lo stato. Se non è risolta, fermati e chiedi a Federico: non inventare la risposta.
5. **Parti centrali.** Se il task tocca il parser (`src/domain/import`), la deduplica o le policy RLS, proponi interfaccia, test e approccio, poi chiedi a Federico se le scrive lui o se procedi tu.
6. **Scelte non coperte.** Se serve una decisione tecnica che il DESIGN_DOC non prende, proponi prima la modifica al DESIGN_DOC e l'ADR. Il codice viene dopo.
7. **Il piano.** Breve, in italiano:
   - nome del branch (`feat/<id>-<slug>`, da `main` aggiornato);
   - file da creare o toccare;
   - approccio, con il perché in due righe e le alternative scartate;
   - test da scrivere;
   - check da lanciare alla fine.

Poi fermati e aspetta l'approvazione. A lavoro finito il task si chiude con `/task-close $ARGUMENTS`.
