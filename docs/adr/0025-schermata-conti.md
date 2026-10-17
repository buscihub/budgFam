# ADR-0025: Schermata Conti, accesso da Movimenti e formato banca scelto dall'utente

- **Data:** 2026-10-10
- **Stato:** Accettata (2026-10-17)
- **Task collegato:** §13.1 · 1.5, 3.1, 3.4

## Contesto

Per importare un estratto conto bisogna scegliere il conto, ma nessuna schermata crea conti: l'ADR-015 li definisce nel modello, non nell'interfaccia. La navigazione ha 3 voci (ADR-013) e non deve crescere. I formati banca supportati per ora sono Revolut e Trade Republic; altri arriveranno con il rilevamento automatico (task 2.3).

## Decisione

Una schermata **Conti** con «I miei conti» e «Condivisi dalla famiglia» (questi ultimi in sola lettura, col nome del proprietario). Creazione e modifica in uno sheet su mobile e in un pannello laterale su desktop. Ci si arriva dal filtro per conto di **Movimenti** («Gestisci conti»), senza una quarta voce di navigazione; nel flusso Aggiungi → Importa file il pulsante «Nuovo conto» crea il conto **senza uscire dall'import**. Il formato banca si sceglie tra quelli supportati alla creazione, oppure al primo import se il conto è nato senza.

## Alternative considerate

- **Quarta voce nella barra di navigazione** — scartata: l'ADR-013 l'ha portata da 4 a 3 e i conti si toccano di rado.
- **Conti dentro un menu profilo/impostazioni** — rimandata: oggi non esiste un hub impostazioni; Conti potrà spostarcisi senza ridisegnarlo.
- **Pagina Conti senza scorciatoia nell'import** — scartata: obbliga a lasciare il flusso a metà.
- **Etichetta generica per il conto altrui nei movimenti condivisi (es. «Carta di Federico», ADR-015)** — scartata: anche il tipo di un conto privato è un dato suo. Gli altri vedono solo chi ha pagato.

## Conseguenze

- Il selettore dell'import elenca solo **i miei conti**; i contanti (`kind = 'cash'`) non hanno file da importare e non compaiono, né hanno formato (da imporre con un check).
- Il **tipo** del conto (`kind`) non si modifica dopo la creazione: un conto con import già fatti non può diventare «contanti». Si modificano nome, visibilità e formato; il formato nuovo vale dal prossimo import.
- Il **cambio di visibilità** usa l'anteprima dell'ADR-015: solo da ora (preselezionata), da una data, tutto lo storico; i movimenti con `visibility_overridden` non cambiano mai.
- Un movimento condiviso su un conto privato mostra agli altri solo l'autore: la riga di `accounts` è già nascosta dalla RLS, la UI deve gestire `account` assente e non mostrare né nome né tipo né un segnaposto.
- `accounts.bank_format` diventa l'identificatore del preset («revolut», «trade_republic», «auto»): vedi ADR-028. La migrazione è nel task 1.5a.
- **Da decidere:** nome unico per proprietario (`unique (owner_id, lower(name))`); nessuna eliminazione di conti nella v1.
- «Ultimo import» si ricava da `imports` (massimo `created_at` con `status = 'done'` per conto), non è denormalizzato; un indice su `(account_id, created_at)` evita la scansione.
- Il passo «scegli il conto» del task 1.5 dipende da questa schermata: la creazione di base dei conti va anticipata rispetto a 3.1/3.4.
