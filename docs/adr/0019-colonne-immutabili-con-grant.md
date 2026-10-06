# ADR-0019: Colonne immutabili con grant a livello di colonna

- **Data:** 2026-10-06
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.5b

## Contesto

Le policy RLS decidono **quali righe** un utente può toccare, non **quali colonne** può cambiare: una `WITH CHECK` vede solo la riga nuova, quindi non può dire «questo campo non deve cambiare». Dove un membro può modificare una riga altrui (es. correggere la categoria di un movimento condiviso), un `UPDATE` poteva anche riassegnare `owner_id`, `account_id` o `household_id`: rubare un movimento, un conto, o far nominare principale un admin secondario (ADR-015, ADR-016).

## Decisione

Per ogni tabella con colonne di identità/proprietà si toglie `UPDATE` al ruolo `authenticated` e lo si ridà **solo sulle colonne modificabili** (`revoke update …` + `grant update (col, …)`), nella migrazione RLS del task 0.5b. Cambiare `owner_id` sarà possibile solo con una funzione `security definer` dedicata, quando servirà.

## Alternative considerate

- **Trigger `BEFORE UPDATE` che confronta vecchio e nuovo valore** — scartata: più codice da scrivere e testare, e la regola è nascosta in una funzione invece che visibile nei permessi della tabella.
- **Nessuna protezione, fidarsi del codice dell'app** — scartata: la sicurezza deve vivere nel database (§7); una query sbagliata o un client modificato non deve poter riassegnare i dati.
- **Far passare ogni scrittura da funzioni `security definer`** — scartata: sposta tutta la logica fuori dalle policy e rende i test RLS meno diretti.

## Conseguenze

- Aggiungere una colonna modificabile a queste tabelle richiede di aggiornare anche il `grant`, altrimenti l'`UPDATE` su quella colonna fallisce con *permission denied*: va ricordato nelle migrazioni future.
- I test RLS (0.6) devono coprire i tentativi di cambiare le colonne protette, controllando anche il tipo di errore.
- Il service role non è toccato: onboarding e funzioni di sistema continuano a funzionare.
