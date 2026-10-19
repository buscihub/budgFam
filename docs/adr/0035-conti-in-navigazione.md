# ADR-0035: «Conti» al posto di «Movimenti» nella navigazione

- **Data:** 2026-10-19
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.5c

## Contesto

La barra di navigazione ha tre voci: Riepilogo, Movimenti, Cose da fare (ADR-013). Conti si raggiunge solo dal filtro di Movimenti («Gestisci conti», ADR-025). Provando l'import è emerso che in famiglia i movimenti si guardano e si aggiungono quasi sempre **per conto**: la carta di ciascuno, il conto della madre che paga per tutti (ADR-015). Il conto è l'oggetto da cui si parte; l'elenco unico dei movimenti è la vista meno frequente.

## Decisione

La navigazione resta a **tre voci**: Riepilogo · **Conti** · Cose da fare. Conti elenca i conti, mio e condivisi dalla famiglia, e in cima una riga «Tutti i movimenti». Toccando un conto si apre la **pagina del conto** con i suoi movimenti del mese (stessa lista di Movimenti, con il conto fissato). «Tutti i movimenti» è la lista attuale, senza conto fissato e con il filtro per conto.

Si aggiunge un movimento (a mano o importando un file) da entrambe le viste. Dalla pagina del conto il conto è già scelto e l'import parte col suo formato (ADR-028); da «Tutti i movimenti» non c'è un conto preselezionato e va scelto, quindi ogni movimento resta collegato a un conto. I conti nuovi si creano solo da Conti, con il «+» in alto; resta «Nuovo conto» dentro l'import, che non fa uscire dal flusso (ADR-025). Le **impostazioni del conto** (nome e formato del file) si modificano dalla pagina del conto, solo dal proprietario; anche la **visibilità** (privato ↔ condiviso) si cambia da lì, con l'anteprima e le tre opzioni dell'ADR-015 (solo da ora, da una data, tutto lo storico; i movimenti con visibilità scelta a mano non cambiano mai). Questa parte del task 3.4 è anticipata in 1.5c; restano in 3.4 l'override per singolo movimento già fatto e il resto della UI.

## Alternative considerate

- **Quarta voce «Conti»**, accanto a Movimenti — scartata: riporta la barra a quattro voci, che l'ADR-013 aveva ridotto per semplicità; la lista «tutti» si raggiunge comunque da Conti.
- **Conti come scheda dentro Movimenti** — scartata: la gestione del conto (formato, eliminazione) resterebbe dietro un filtro, come oggi.
- **Sostituire «Cose da fare»** — scartata: è l'obiettivo O3; il task 3.3 arriva comunque.

## Conseguenze

- **Sostituisce in parte l'ADR-025** (accesso a Conti dal filtro di Movimenti) **e l'ADR-026** (tabella dei punti d'accesso: Conti passa alla barra di navigazione; il banner «Da rivedere» compare in «Tutti i movimenti» e nella pagina del conto). Il resto di entrambi resta valido.
- Le route `/movimenti/*` (lista «tutti», dettaglio, nuovo, importa) restano; cambiano la barra e i punti d'ingresso, e nasce `/conti/[id]`.
- Gli snapshot in `docs/design/mockups/` mostrano ancora la voce Movimenti nella barra: non si rigenerano (l'originale è su Claude Design).
- Il cambio di visibilità è una funzione del database, `change_account_visibility` (migrazione `20261019120000`), `SECURITY INVOKER`: gira come l'utente, quindi RLS e permessi di colonna restano quelli di prima, e conto e movimenti cambiano in una sola transazione. Nessuna policy nuova: la lista filtra già per `account_id` e la RLS decide cosa si vede. Un conto non visibile (privato di un altro) dà «non trovato».
