# ADR-0030: Il budget vale finché non viene cambiato

- **Data:** 2026-10-17
- **Stato:** Accettata
- **Task collegato:** §13.1 · 3.2, 3.2b

## Contesto

`budgets` ha una riga per categoria e mese (`month` = primo del mese). I mockup dicono «Vale da settembre 2026»: cosa succede a ottobre, se nessuno ha toccato nulla?

## Decisione

Il budget di una categoria per un mese è la riga con il `month` più recente tra quelle con `month` ≤ quel mese. Modificarlo crea una riga con `month` = mese corrente; i mesi passati non cambiano.

## Alternative considerate

- **Copia esplicita ogni mese** — scartata: serve un job o un'azione all'apertura del mese, e un mese senza budget se nessuno apre l'app.

## Conseguenze

- Nessuna modifica allo schema. La selezione «riga più recente ≤ mese» vive in `src/data` e il calcolo del confronto in `src/domain/budget`, con test (mese senza riga, riga futura ignorata, cambio a metà storico).
- Azzerare una categoria è una riga con `limit_cents = 0`, non l'assenza di riga.
