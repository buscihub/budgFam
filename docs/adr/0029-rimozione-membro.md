# ADR-0029: Rimozione di un membro, i suoi dati restano alla famiglia

- **Data:** 2026-10-17
- **Stato:** Accettata
- **Task collegato:** §13.1 · 3.4c

## Contesto

Un admin può rimuovere una persona dalla famiglia. `accounts.owner_id` e `transactions.owner_id` puntano a `auth.users`, non a `members`, quindi la rimozione non cancella nulla da sola. Serve decidere cosa deve succedere, nel rispetto della promessa «gli altri non vedono i tuoi conti privati» (ADR-015).

## Decisione

Si elimina solo la riga in `members`. Conti e movimenti restano: quelli condivisi continuano a comparire nei riepiloghi; quelli privati restano nel database, invisibili a tutti, perché la RLS li lega a `owner_id` e chi non è più membro non passa `is_member`.

## Alternative considerate

- **Cancellare tutto ciò che è suo** — scartata: i riepiloghi dei mesi passati cambierebbero e la famiglia perderebbe movimenti condivisi.
- **Passare i conti a un admin** — scartata: l'admin vedrebbe anche i movimenti privati, contro la promessa di ADR-015.

## Conseguenze

- Chi è rimosso non può creare una famiglia nuova da sé: `create_household` rifiuta se un nucleo esiste (ADR-022). Rientra solo con un nuovo invito, e in quel caso ritrova i propri conti privati.
- Non si può rimuovere l'admin principale: prima si trasferisce il ruolo o si elimina la famiglia (ADR-016).
- Il test RLS va esteso: dopo la rimozione l'ex membro non legge più nulla e gli altri non leggono i suoi privati.
