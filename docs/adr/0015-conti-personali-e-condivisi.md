# ADR-0015: Conti personali/condivisi, visibilità ereditata dal conto con override per movimento

- **Data:** 2026-10-06
- **Stato:** Proposta
- **Task collegato:** §13.1 · 0.5b, 3.4 (risolve Q4)

## Contesto

In molte famiglie italiane i soldi passano da pochi conti: nel nostro caso quelli della madre, che compra per tutti ma anche per sé e distribuisce denaro ai figli. «Condiviso» non coincide quindi con «cointestato». Ogni membro deve poter registrare le proprie carte e indirizzarvi gli estratti conto. Il modello precedente aveva la visibilità solo sul movimento, con default `shared`.

## Decisione

`accounts` ottiene `owner_id` e `visibility` (default `private`). La visibilità del conto è il default dei suoi movimenti; ogni movimento può essere sovrascritto in entrambe le direzioni (anche condiviso su conto privato, es. la spesa per tutti pagata con la propria carta). Gli import si indirizzano a un conto.

## Alternative considerate

- **Visibilità solo per movimento, default `private`** — scartata: un riepilogo di famiglia vuoto finché qualcuno non condivide ogni riga, contro l'obiettivo di adozione (§1).
- **Visibilità solo per conto, senza override** — scartata: la madre non potrebbe marcare privato un acquisto personale su un conto condiviso, né qualcuno condividere la spesa di famiglia pagata con una carta privata.
- **Visibilità per movimento + regole di default per import** — scartata: stesso risultato con più parti mobili.

## Conseguenze

- Migrazione + policy `accounts` (select: condivisi + propri) e `transactions` aggiornate; test RLS: un movimento condiviso su conto privato è visibile al nucleo, il conto no.
- Un movimento condiviso su conto altrui non espone nome o saldo del conto: la UI deve gestire `account` assente (es. «Carta di Federico»).
- **Cambio di visibilità di un conto:** azione esplicita con **anteprima** («34 movimenti diventeranno visibili a 3 persone»). Opzioni: *solo da ora* (preselezionata), *da una data*, *tutto lo storico*. I movimenti con `visibility_overridden = true` non si toccano mai. Passando da condiviso a privato il messaggio avvisa che gli altri hanno già potuto leggere i dati.
- **Trasferimenti ai familiari** (es. madre → figlia, da conto condiviso a privato): categorie `kind = 'transfer'`, fuori da Uscite/Entrate, mostrate come riga a parte per destinatario (`transfer_member_id`, solo membri) e per motivo. Evita il doppio conteggio con le spese che il destinatario dichiara condivise. Alternative scartate: *sempre uscita* (doppio conteggio), *sempre ignorato* (la spesa privata finanziata sparisce), *abbinamento automatico delle due metà* (euristico, e la privacy impedisce di vedere entrambe). Un bonifico a una persona esterna è una normale uscita.
