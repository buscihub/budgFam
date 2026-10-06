# ADR-0018: Vista Personale e budget personali

- **Data:** 2026-10-06
- **Stato:** Proposta
- **Task collegato:** §13.1 · 0.5b, 3.2b

## Contesto

Oltre al budget familiare, ogni membro vuole il proprio. Chi paga la spesa di famiglia con la propria carta deve vederla comunque come una propria uscita.

## Decisione

Due lenti sugli stessi dati. **Famiglia** = movimenti condivisi di tutti; **Personale** = tutti i movimenti dei **propri conti** (`owner_id` = io), privati e condivisi. Un movimento condiviso pagato da me compare in entrambe, ma le viste non si sommano mai. `budgets` ottiene `member_id` nullabile: `null` = budget familiare (scrivono gli admin), valorizzato = personale (lo vede e lo modifica solo il proprietario). Le categorie sono quelle del nucleo, uguali per tutti.

## Alternative considerate

- **Vista Personale = solo i miei movimenti privati** — scartata: chi paga per la famiglia non vedrebbe quella spesa nel proprio budget, che risulterebbe sottostimato.
- **Categorie personali separate** — scartata: duplica l'elenco e complica classificatore e golden set senza un bisogno espresso.
- **Tabella `personal_budgets` separata** — scartata: stessa forma di `budgets`; una colonna è più semplice, a costo di un indice unico con `coalesce`.

## Conseguenze

- Migrazione: `budgets` passa da chiave primaria composta a `id` + indice unico (`coalesce(member_id, …)`); policy RLS distinte per budget familiari e personali, con test.
- La stessa spesa compare in due viste: la UI deve rendere chiaro che sono lenti diverse (mai un totale che le somma) e può marcare i movimenti condivisi nella vista Personale.
- **Trasferimenti nel riepilogo Personale:** quelli **inviati** a un familiare sono una riga a parte (come in Famiglia); quelli **ricevuti** da un familiare contano come **entrata**, perché sono soldi incassati. Così il budget personale di chi riceve la paghetta torna.
- Il task 3.2 è spezzato in 3.2, 3.2b, 3.2c per mantenere piccole le pull request.
