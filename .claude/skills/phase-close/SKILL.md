---
name: phase-close
description: Chiude una fase della tabella di marcia (DESIGN_DOC §13). Verifica il criterio d'uscita, aggiorna la fase corrente e prepara il capitolo del diario di studio.
argument-hint: '[numero della fase, es. 1]'
disable-model-invocation: true
---

Chiudi la fase **$ARGUMENTS**. Una fase è chiusa solo quando tutti i suoi task sono spuntati e il criterio d'uscita è verificato.

1. **Task.** Leggi il blocco della fase nel §13.1 di `docs/DESIGN_DOC.md`. Se resta un task non spuntato, elencalo e fermati.
2. **Criterio d'uscita.** Leggi la riga "Uscita" della fase. Dimostra che è soddisfatto con qualcosa di verificabile (un test, un comando, un numero) e mostralo a Federico. Se non puoi verificarlo da solo (per esempio richiede dati reali), chiedi a lui la conferma.
3. **Coerenza.** Lancia `spec-reviewer` sul diff dell'intera fase per controllare che DESIGN_DOC, ADR e codice dicano la stessa cosa. Riporta i rilievi.
4. **Fase corrente.** Con l'ok di Federico aggiorna, insieme:
   - la riga "Fase corrente" in `docs/DESIGN_DOC.md` §13;
   - la sezione "Stato" di `CLAUDE.md`;
   - una voce in `docs/CHANGELOG.md` che registra la chiusura.
5. **Diario di studio.** Lancia l'agente `study-keeper` passandogli il numero della fase: aggiunge a `study/build_pdf.py` teoria, tabella dei task, domande da colloquio e mappa teoria → codice, poi rigenera il PDF. `study/` non è su Git: non va committato né citato nel CHANGELOG. Riporta a Federico il riepilogo dell'agente.
6. **Consegna.** Riepilogo in italiano e proposta di commit e PR, come in `/task-close`.
