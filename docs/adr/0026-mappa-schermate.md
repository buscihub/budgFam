# ADR-026 — Mappa delle schermate e punti d'accesso

**Stato:** Proposta · **Data:** 2026-10-11 · **Task coinvolti:** 0.7, 1.5, 2.3, 2.4, 2.5, 3.2, 3.2b, 3.2c, 3.4, 3.5

## Contesto
Dopo le schermate Conti (ADR-025) si è controllato che ogni funzione descritta negli ADR e in `DESIGN_DOC.md` avesse la sua schermata, per avere una visione completa dell'app prima di scrivere l'interfaccia. Mancavano riepilogo personale, dettaglio movimento, import oltre la scelta del conto, coda «Da rivedere», impostazioni, famiglia, accesso, installazione e stati vuoti/errore.

## Decisione
La navigazione resta a **tre voci** (Riepilogo, Movimenti, Cose da fare; ADR-013). Tutto il resto si raggiunge da un punto d'accesso preciso:

| Area | Punto d'accesso |
|---|---|
| Impostazioni (budget, categorie, conti, famiglia, installazione, esci) | iPhone: avatar in alto a destra nel Riepilogo. Mac: «Impostazioni» in fondo alla barra laterale |
| Famiglia e membri | Impostazioni → «Famiglia e membri»; su Mac anche la riga «4 persone» della barra laterale |
| Conti | Filtro di Movimenti → «Gestisci conti» (ADR-025), e Impostazioni → Conti |
| Da rivedere | Banner «N movimenti da rivedere» in Movimenti e nell'esito dell'import |
| Dettaglio movimento | Tocco su una riga di Movimenti |
| Trasferiti ai familiari | Riga sotto Entrate/Uscite nel Riepilogo |
| Installazione su iPhone | Impostazioni → «Installa su iPhone» |

Scelte di comportamento mostrate nei mockup:
- **Riepilogo**: interruttore «Famiglia / Personale». I trasferimenti tra familiari non entrano in entrate, uscite né budget e hanno una riga a parte. Il budget personale lo vede e lo modifica solo il proprietario; quello della famiglia solo gli amministratori.
- **Movimento**: la visibilità del singolo movimento segue il conto per impostazione predefinita e può essere cambiata in entrambe le direzioni (ADR-015); «Applica sempre questa regola» crea la regola esercente → categoria; la categoria «Trasferimento» chiede il destinatario (`transfer_member_id`).
- **Import**: il formato riconosciuto va confermato; l'anteprima mostra pronti, da rivedere e duplicati prima di scrivere; l'esito offre «Annulla questo import»; se la categorizzazione non risponde i movimenti entrano senza categoria e finiscono in «Da rivedere».
- **Famiglia**: inviti con link monouso da 24 ore e ruolo scelto prima; solo l'amministratore principale promuove, riporta a membro ed elimina la famiglia (ADR-016).
- **Categorie**: le categorie si nascondono senza perdere i movimenti; «Trasferimento» è di sistema; una categoria «esclusa» (es. «B&B») resta fuori da totali e budget (ADR-017).

## Conseguenze
- Nessuna quarta voce in navigazione: l'app resta semplice per chi la usa poco.
- Le schermate di accesso, famiglia e installazione non hanno ancora una decisione tecnica collegata oltre agli ADR citati.
- Da aggiornare a mano in `DESIGN_DOC.md`: §5.3 (elenco schermate) e la tabella ADR di §14.
- Mockup in `docs/design/mockups/` (136 file, chiari e scuri).
