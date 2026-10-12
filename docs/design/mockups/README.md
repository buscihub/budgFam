# Mockup di budgFam — tutte le schermate

Esportazioni statiche (HTML autonomo, si aprono con un doppio click) dei mockup costruiti con Claude Design. Sono un **riferimento visivo**, non codice del prodotto. Stile "Liquid Glass" sulla palette B1 (ADR-012), testi in italiano, dati inventati. I link tra le schermate funzionano anche tra cartelle.

## Come è organizzata la cartella

Prima per dispositivo, poi per funzione:

```
iphone/   schermate mobile (390 × 844)
mac/      schermate desktop (1280 × 832)
  └─ <funzione>/   una cartella per area, uguale nei due dispositivi
```

Ogni schermata esiste in versione chiara (`Nome.html`) e scura (`Nome-Dark.html`), nella stessa cartella. La mappa dei collegamenti è in `docs/adr/0026-mappa-schermate.md`; le esplorazioni di stile iniziali sono state tolte (esito in ADR-012).

## Contenuto

### iPhone

- `iphone/01-accesso-e-primo-avvio/` — `Mobile-Accedi`, `Mobile-Crea-Famiglia`, `Mobile-Installa`, `Mobile-Invito-Scaduto`, `Mobile-Password-Reset`, `Mobile-Password-Reset-Inviato`, `Mobile-Registrati`, `Mobile-Unisciti`
- `iphone/02-riepilogo/` — `Mobile-Errore`, `Mobile-Offline`, `Mobile-Riepilogo`, `Mobile-Riepilogo-Personale`, `Mobile-Trasferiti`
- `iphone/03-movimenti/` — `Mobile-Filtri`, `Mobile-Movimenti`, `Mobile-Movimenti-Vuoto`, `Mobile-Movimento`, `Mobile-Movimento-Categoria`, `Mobile-Movimento-Condiviso`, `Mobile-Movimento-Trasferimento`
- `iphone/04-aggiungi-e-import/` — `Mobile-Aggiungi`, `Mobile-Aggiungi-Importa`, `Mobile-Aggiungi-Importa-Formato`, `Mobile-Aggiungi-Importa-Nuovo`, `Mobile-Import-Annulla`, `Mobile-Import-Anteprima`, `Mobile-Import-Errore-AI`, `Mobile-Import-Errore-File`, `Mobile-Import-Esito`, `Mobile-Import-Rilevato`
- `iphone/05-da-rivedere/` — `Mobile-Da-Rivedere`, `Mobile-Da-Rivedere-Vuoto`
- `iphone/06-conti/` — `Mobile-Conti`, `Mobile-Conti-Vuoto`, `Mobile-Conto-Contanti`, `Mobile-Conto-Modifica`, `Mobile-Conto-Nuovo`
- `iphone/07-impostazioni-budget-categorie/` — `Mobile-Budget-Famiglia`, `Mobile-Budget-Personale`, `Mobile-Categoria-Nuova`, `Mobile-Categorie`, `Mobile-Impostazioni`
- `iphone/08-famiglia-e-membri/` — `Mobile-Famiglia`, `Mobile-Invita`, `Mobile-Membro`
- `iphone/09-cose-da-fare/` — `Mobile-Aggiungi-Task`, `Mobile-Task`

### Mac

- `mac/01-accesso-e-primo-avvio/` — `Desktop-Accedi`
- `mac/02-riepilogo/` — `Desktop-Riepilogo`, `Desktop-Riepilogo-Personale`
- `mac/03-movimenti/` — `Desktop-Filtro-Conti`, `Desktop-Movimenti`, `Desktop-Movimento`, `Desktop-Movimento-Trasferimento`
- `mac/04-aggiungi-e-import/` — `Desktop-Aggiungi`, `Desktop-Aggiungi-Importa`, `Desktop-Aggiungi-Importa-Nuovo`, `Desktop-Import-Anteprima`
- `mac/05-da-rivedere/` — `Desktop-Da-Rivedere`
- `mac/06-conti/` — `Desktop-Conti`, `Desktop-Conti-Vuoto`, `Desktop-Conto-Modifica`, `Desktop-Conto-Nuovo`
- `mac/07-impostazioni-budget-categorie/` — `Desktop-Impostazioni-Budget`, `Desktop-Impostazioni-Categorie`
- `mac/08-famiglia-e-membri/` — `Desktop-Impostazioni-Famiglia`
- `mac/09-cose-da-fare/` — `Desktop-Aggiungi-Task`, `Desktop-Task`

## Modalità scura
Superfici `#1D1512`→`#170F0C`, vetro `rgba(255,255,255,·)`, accento `#E2925F`.

## Dove sono modificabili
L'originale **modificabile** è l'artifact Claude Design (canvas ordinato per area, chiaro sopra e scuro sotto). Questi file sono un'istantanea del 12 ottobre 2026: per cambiare un mockup si riparte dall'artifact.
