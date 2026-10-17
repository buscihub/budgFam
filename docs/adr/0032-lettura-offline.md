# ADR-0032: Lettura offline con service worker

- **Data:** 2026-10-17
- **Stato:** Accettata (i dettagli si fissano nel task 3.5d)
- **Task collegato:** §13.1 · 3.5, 3.5d

## Contesto

La schermata «Offline» mostra l'ultimo riepilogo scaricato con la nota «puoi guardare i dati già scaricati; aggiungere, importare e modificare serve la connessione». Sono dati finanziari su un telefono, dietro una sessione per utente.

## Decisione

Il service worker mette in cache la shell dell'app e i dati dell'ultimo riepilogo letto; tutto ciò che scrive richiede la connessione. La cache si svuota al logout.

## Alternative considerate

- **Solo shell e messaggio «Sei offline»** — scartata: meno utile e il mockup promette l'ultimo riepilogo.
- **Scrittura offline con coda di sincronizzazione** — scartata: conflitti e idempotenza fuori proporzione per quattro utenti; restano fuori scope.

## Conseguenze

- Da fissare nel task 3.5d: cosa si mette in cache (solo risposte GET del riepilogo), la durata, e come impedire che la cache serva i dati di un utente a un altro sullo stesso dispositivo (chiave per utente, svuotamento al logout).
- Va indicato nell'interfaccia «Ultimo aggiornamento…» (già nel mockup).
- La schermata «Installa» non promette notifiche (Q3: non farci affidamento).
- Un test end-to-end (Fase 3) verifica logout → cache vuota.
