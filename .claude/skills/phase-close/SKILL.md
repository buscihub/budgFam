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
5. **Diario di studio.** Aggiungi a `study/build_pdf.py` un capitolo sulla fase appena chiusa: teoria, riferimenti al codice reale (file e funzioni), domande da colloquio con risposta. Rigenera il PDF con `python3 study/build_pdf.py` dentro un venv con `reportlab`. `study/` non è su Git: è materiale personale, non documentazione del progetto, quindi non va committato né citato nel CHANGELOG.
6. **Consegna.** Riepilogo in italiano e proposta di commit e PR, come in `/task-close`.
