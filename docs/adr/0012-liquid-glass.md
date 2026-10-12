# ADR-0012: Linguaggio visivo "Liquid Glass" (iOS/macOS) per l'interfaccia

- **Data:** 2026-09-26
- **Stato:** Accettata
- **Task collegato:** — (lavoro di design/mockup, prima della Fase 0)

## Contesto

Dopo aver scelto la palette calda (terracotta su crema, titoli in sans-serif — variante "B1"), serviva decidere lo stile visivo definitivo dei mockup, coerente sia per iPhone sia per desktop, e stabilire anche una modalità scura prima di passare all'implementazione.

## Decisione

Adottare il linguaggio visivo "Liquid Glass" di Apple (iOS/macOS): superfici traslucide con blur/saturazione, riflessi speculari sui bordi, tab bar flottante su mobile e sidebar/modali in vetro su desktop — mantenendo la palette B1 (terracotta/crema) come colore d'accento invece dei colori di sistema iOS. Per la modalità scura, stessi materiali e componenti ma su superfici scure calde (`#1D1512`→`#170F0C`) con vetro `rgba(255,255,255,·)` e accento terracotta schiarito (`#E2925F`) per contrasto.

## Alternative considerate

- **Colori di sistema iOS nativi** (blu di sistema, superfici bianco/nero standard) — scartata: meno riconoscibile come identità propria dell'app rispetto alla palette calda già scelta.
- **Stile flat B1 senza materiali vetro** (versione precedente dei mockup) — scartata una volta deciso di puntare a un'estetica "app per iPhone" più recente e distintiva.

## Conseguenze

- L'implementazione dovrà usare `backdrop-filter`/`-webkit-backdrop-filter` (blur + saturate); da verificare il supporto e il costo prestazionale su dispositivi meno recenti, con fallback a superfici opache se necessario.
- Servono due set di token colore (chiaro/scuro) per superfici, testo, bordi e accento; per ora fissati solo su 2 schermate campione (Riepilogo e Movimenti mobile) — le altre 8 schermate vanno derivate con lo stesso schema quando si passa al codice, non sono ancora mockuppate in dark.
- **Aggiornamento (2026-10-12):** il campione è superato: tutte le schermate esistono ora anche in versione scura (vedi ADR-026 e `docs/design/mockups/README.md`).
- I mockup vivono nell'artifact Claude Design (non nel repository); questo ADR e il changelog sono il riferimento scritto della decisione.
