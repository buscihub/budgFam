# ADR-0023: Creare un invito è un INSERT ordinario; solo `accept_invite` è `security definer`

- **Data:** 2026-10-08
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.7c

## Contesto

ADR-022 ha introdotto `create_household` come funzione `security definer` perché chi la chiama non è ancora membro di nessun nucleo: nessuna policy RLS può permettergli l'inserimento. Scrivendo gli inviti (tabella `invites`, funzione `accept_invite`) si poneva la stessa domanda per entrambe le operazioni: creare un invito e accettarlo.

## Decisione

Solo **accettare** un invito ha il problema di ADR-022 (chi accetta non è membro). **Creare** un invito no: chi lo fa è già admin del nucleo, quindi una policy RLS ordinaria (`is_admin(household_id)`) basta. `invites` ha quindi policy normali (select/insert/delete, tutte admin-only) più una `with check` sull'insert che blocca scadenze superiori alle 24h decise col prodotto, e che impedisce di pre-marcare un invito come già usato; solo `accept_invite` resta `security definer`, sul modello di `create_household`.

La select è **admin-only**, non member-only: un codice d'invito valido è a tutti gli effetti una password temporanea, non un'informazione che ogni membro del nucleo deve vedere.

## Alternative considerate

- **`security definer` anche per creare l'invito** (funzione `create_invite`, come `create_household`) — scartata: avrebbe nascosto dentro una funzione una regola (admin-only) che una policy ordinaria già esprime in una riga, rendendo i test RLS meno diretti (stesso argomento di ADR-019 contro il passare tutte le scritture da funzioni `security definer`).
- **Select member-only invece di admin-only** — scartata: un membro che non deve gestire inviti non ha motivo di leggere un codice che, se letto, equivale a poter invitare chiunque al suo posto.

## Conseguenze

- Generare un invito resta testabile con lo stesso stile delle altre tabelle (`as(ADMIN, …)` / `denied(...)`), senza bisogno di simulare il cambio di ruolo a metà transazione come per `asOnEmptyInstance`.
- Solo `accept_invite` richiede quel pattern nei test (si seeda l'invito come `service`, poi si passa al ruolo `authenticated` dell'invitato nella stessa transazione).
- Se in futuro un membro ordinario dovrà generare inviti, basta cambiare `is_admin` in `is_member` nella policy insert — non serve toccare nessuna funzione.
