# ADR-0034: Design system in CSS: token, primitivi e CSS Modules

- **Data:** 2026-10-18
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.5b

## Contesto

L'ADR-012 fissa il linguaggio visivo (Liquid Glass sulla palette B1, chiaro e scuro) ma non dice come tradurlo in codice. Il primo codice di interfaccia (1.5a, 1.5b) usa CSS provvisorio. Le schermate sono poche e il progetto non ha una libreria di stile; un'altra famiglia di schermate (Importa, Impostazioni, Cose da fare) arriverà nelle fasi successive e deve riusare gli stessi materiali.

## Decisione

Variabili CSS per i token (colori, vetro, raggi, ombre) in `src/app/styles/tokens.css`, con la versione scura sotto `prefers-color-scheme: dark`; classi condivise per i materiali (`.glass-card`, `.glass-btn`, `.btn-primary`, `.pill`, `.chip`, `.segmented`, `.switch`) in `src/app/styles/glass.css`; il resto è CSS Modules accanto a ogni route. Font di sistema (`-apple-system`), come nei mockup. `backdrop-filter` con fallback opaco dove non è supportato.

## Alternative considerate

- **Tailwind** — scartata: una dipendenza e una toolchain nuove per una decina di schermate, e i mockup sono già scritti come CSS con variabili.
- **CSS-in-JS** (styled-components, Emotion) — scartata: peso a runtime e attrito coi Server Components.
- **Un solo `globals.css` per tutto** — scartata: i nomi di classe si scontrano man mano che cresce; il CSS Modules isola ogni schermata.
- **Interruttore chiaro/scuro nell'app** — scartata: la specifica non lo prevede; vale l'impostazione del telefono.

## Conseguenze

- Le schermate nuove riusano i primitivi senza ricopiare lo stile dei mockup.
- Il tema scuro vive in un solo punto (`tokens.css`).
- Si tolgono i font Geist da `layout.tsx`: meno richieste, aspetto nativo su iPhone.
- Da verificare su un iPhone vero il costo di `backdrop-filter` (già segnalato in ADR-012).
- Movimenti, Riepilogo e Conti sono ridisegnati sui mockup nel seguito del task 1.5b. Le pagine di accesso, onboarding, invito e la home restano con le classi `.auth-*`, ricolorate coi token, finché non verranno ridisegnate.
