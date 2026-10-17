# ADR-0031: Categorie personalizzabili, comportamento guidato dal `kind`

- **Data:** 2026-10-17
- **Stato:** Accettata
- **Task collegato:** §13.1 · 3.2c, 3.4b (precisa ADR-017)

## Contesto

L'ADR-017 permette di nascondere e aggiungere categorie. I mockup però indicavano «Trasferimento» come categoria «di sistema», e il seed (§6.1) ha nomi diversi da quelli dei mockup. Si vuole che le categorie siano della famiglia, non fisse nel codice.

## Decisione

Il seed è un punto di partenza. Ogni categoria si può rinominare, nascondere o aggiungere, scegliendone il `kind` (spesa, entrata, trasferimento, esclusa). Il comportamento (totali, budget, riga «Trasferiti ai familiari», destinatario) dipende solo dal `kind`, mai dal nome. «Nuova categoria» offre anche il tipo trasferimento.

## Alternative considerate

- **Categorie di sistema non modificabili** (es. «Trasferimento») — scartata: il codice dipenderebbe da un nome e la famiglia non potrebbe adattare il vocabolario.
- **Solo i nomi dei mockup** — scartata: meno granularità per budget e classificatore, e i mockup sono esempi.

## Conseguenze

- Nessuna riga di `src/` può riconoscere una categoria per nome; i test del riepilogo usano il `kind`.
- La rinomina non tocca `category_rules` (referenziano l'id) né lo storico.
- Il classificatore (§8.4) e il golden set (§9) lavorano sui nomi correnti: il prompt riceve l'elenco delle categorie non nascoste del nucleo, con il tipo.
- Un nucleo senza alcuna categoria di tipo trasferimento non può registrare trasferimenti: la UI lo dice e propone di crearla.
