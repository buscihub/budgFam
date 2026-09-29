# Mockup di budgFam — schermate statiche

Queste sono esportazioni statiche (HTML autonomo, apribile con un doppio click nel browser) dei mockup costruiti con Claude Design. Sono un **riferimento visivo**, non codice del prodotto: niente di qui va importato o riusato nell'app reale.

## Esplorazione dello stile (3 direzioni iniziali)

- `Main.html` — direzione A, minimale
- `Style-B.html` — direzione B, calda (palette scelta)
- `Style-C.html` — direzione C, dati densi
- `Style-B1.html` / `Style-B2.html` — due alternative per il font dei titoli sulla palette B (scelta: B1, titoli in sans-serif)

## Schermate finali — stile "Liquid Glass" sulla palette B1 (ADR-012)

Mobile (iPhone):
- `Mobile-Riepilogo.html`
- `Mobile-Movimenti.html` (include l'azione "+", vedi ADR-013)
- `Mobile-Aggiungi.html` (aggiungi movimento: manuale o import file)
- `Mobile-Task.html` (Cose da fare)
- `Mobile-Aggiungi-Task.html` (nuova attività)

Desktop:
- `Desktop-Riepilogo.html`
- `Desktop-Movimenti.html`
- `Desktop-Aggiungi.html`
- `Desktop-Task.html`
- `Desktop-Aggiungi-Task.html`

## Modalità scura — campione

- `Mobile-Riepilogo-Dark.html`
- `Mobile-Movimenti-Dark.html`

Fissano la palette scura (superfici `#1D1512`→`#170F0C`, vetro `rgba(255,255,255,·)`, accento `#E2925F`); le altre schermate in dark si derivano con lo stesso schema quando si passa al codice.

## Dove sono modificabili

L'originale **modificabile** resta l'artifact Claude Design (Design Component, con canvas e riquadri collegabili). Questi file sono un'istantanea congelata al 26 settembre 2026, utile per guardarli senza aprire Claude — per cambiare davvero un mockup si riparte dall'artifact.
