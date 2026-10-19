# ADR-0013: Unificazione delle schermate "Movimenti" e "Importa"

- **Data:** 2026-09-26
- **Stato:** Accettata; la visibilità di default dell'inserimento manuale è quella del conto (ADR-015), non «condivisa»
- **Task collegato:** — (lavoro di design/mockup, prima della Fase 0)

## Contesto

Il mockup iniziale aveva 4 schermate separate (Riepilogo, Movimenti, Importa, Cose da fare). Discutendo come inserire un movimento in contanti (che non ha un estratto conto da importare, quindi richiede inserimento manuale), è emerso che "Importa" era in parte un'azione (aggiungere un movimento) travestita da schermata a sé, invece di vivere dentro "Movimenti" dove concettualmente appartiene.

## Decisione

Unificare "Movimenti" e "Importa" in un'unica schermata: la lista dei movimenti con un solo pulsante "+" che apre "Aggiungi movimento", con due modalità — **Manuale** (conto, tipo entrata/uscita, importo, categoria, descrizione, data, visibilità condivisa/privata — di default condivisa, autore sempre l'utente loggato, nessun selettore) e **Importa file** (il flusso di caricamento estratto conto già esistente). Il banner "N movimenti da rivedere" resta in cima alla lista di Movimenti. La navigazione passa da 4 a 3 voci: Riepilogo · Movimenti · Cose da fare.

## Alternative considerate

- **Tenere Importa come schermata separata**, con l'aggiunta manuale come sua quarta opzione (accanto a Intesa/Poste/Contanti) — scartata: manteneva una voce di navigazione dedicata a un'azione, non a un contenuto.
- **Due pulsanti distinti** ("Aggiungi" e "Importa" sempre visibili in testata) invece di un "+" con menu — scartata in favore della soluzione più compatta con un solo punto d'ingresso.

## Conseguenze

- Il §5.3 di `DESIGN_DOC.md` è stato aggiornato per riflettere le 3 schermate principali invece di 4.
- In fase di implementazione, "Importa" non sarà più una route/pagina propria: la logica di upload/parsing va esposta come stato/azione dentro la route di Movimenti (o come route figlia raggiunta dal "+"), non come voce di primo livello.
- Il modello dati non cambia: un movimento manuale è una riga in `transactions` con `import_id` nullo, esattamente come già previsto.
