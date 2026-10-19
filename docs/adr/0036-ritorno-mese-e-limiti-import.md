# ADR-0036: Ritorno alla pagina di partenza, mese dei movimenti e limiti dell'import

- **Data:** 2026-10-19
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.5, 1.5c

## Contesto

Aggiungere un movimento, importare un file e aprire il dettaglio si raggiungono da più punti (la pagina di un conto, «Tutti i movimenti»). Chiudere o salvare deve riportare dove si era, e un movimento datato in un mese diverso da quello mostrato non si vedrebbe. Nell'import restano poi da fissare alcuni dettagli tecnici emersi nella revisione: dimensione del file, codifica, dove vive il formato scelto, ordine delle scritture nelle impostazioni del conto.

## Decisione

- **Ritorno:** le pagine di aggiunta, import, dettaglio e impostazioni del conto ricevono `?da=<percorso>`; si torna lì alla chiusura, all'annullo e al salvataggio. Il valore passa da `safeNextPath`/`returnPath` (solo percorsi interni, alfabeto ristretto); se manca o non è valido si torna a «Tutti i movimenti» (`/movimenti`), per le impostazioni a `/conti`.
- **Mese:** dopo aver aggiunto un movimento si apre il mese della sua data; dopo un import, il mese del movimento più recente tra quelli importati (`withMonthParam`, `lastBookedOn`). Se un mese è vuoto ma ce n'è uno precedente con movimenti (con gli stessi filtri), la pagina propone di andarci (`latestBefore`: una query in più, solo a lista vuota).
- **File di import:** massimo 1 MB, il limite predefinito delle Server Action, controllato dal server con un messaggio in italiano. La codifica è quella del preset (`latin1` si legge come `windows-1252`). Il file non si conserva: l'anteprima non scrive nulla e alla conferma il client lo reinvia; il server rifà parse, normalizzazione e hash, quindi non si fida dell'anteprima.
- **Formato scelto all'import:** se il conto non ha un formato, la scelta vale solo per quell'import e non si salva sul conto (coerente con ADR-028: il formato del conto si cambia dalle impostazioni).
- **Impostazioni del conto:** si salvano prima nome e formato, poi la visibilità con la funzione atomica `change_account_visibility`. Se la seconda parte fallisce l'errore lo dice («nome e formato sono stati salvati»); riprovare completa l'operazione.

## Alternative considerate

- **`Referer` o cookie per ricordare la pagina di partenza** — scartata: inaffidabile (assente o ridotto dai browser) e nascosto; un parametro nell'URL si vede, si testa e si può mettere nei preferiti.
- **Tornare sempre alla lista del mese corrente** — scartata: un movimento o un import di mesi passati sparirebbe dalla vista dopo il salvataggio.
- **Conservare il file caricato** (Storage o tabella di appoggio) — scartata: dati bancari a riposo senza motivo, più superficie; un CSV è piccolo e si reinvia.
- **Salvare sul conto il formato scelto all'import** — scartata: scelta silenziosa che cambia il conto; il formato si cambia dove si impostano i conti.
- **Una sola funzione SQL per tutte le impostazioni del conto** — rimandata: nome e formato sono due colonne dello stesso conto e riprovare è innocuo; la visibilità invece tocca anche i movimenti e giustifica la transazione.

## Conseguenze

- Ogni link verso queste pagine deve passare `da`; senza, si ripiega su `/movimenti` o `/conti`.
- File oltre 1 MB sono rifiutati: per estratti conto più grandi servirà un altro canale (da decidere quando capita).
- Salvare le impostazioni del conto non è un'unica transazione: l'errore parziale è esplicito.
