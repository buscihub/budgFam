# ADR-009: Hash di deduplica con indice di occorrenza, o id della banca se presente

- **Data:** 2026-10-10
- **Stato:** Accettata
- **Task collegato:** §13.1 · 1.4

## Contesto

Reimportare lo stesso estratto non deve creare doppioni (regola 4.1.9), ma due movimenti identici (due caffè da 1,20 € lo stesso giorno) sono due movimenti veri e non vanno fusi. Alcune banche (Trade Republic) danno un id univoco per riga; altre (Revolut) no. L'ADR-024 aveva rimandato a questo task l'uso di `externalIdColumn`.

## Decisione

L'`import_hash` è lo SHA-256 (`node:crypto`) di:

- `(account_id, id_esterno)` se la riga ha un id della banca;
- altrimenti `(account_id, booked_on, amount_cents, descrizione_normalizzata, n)`, dove `n` conta le occorrenze della stessa chiave nel file, a partire da 0.

La forma è parte dell'input dell'hash, quindi le due non collidono. L'`account_id` è quello della carta da cui si importa il file.

## Alternative considerate

- **Solo tupla + `n`, ignorando l'id** — scartata: lascia il limite noto dei file sovrapposti anche dove la banca fornisce un id, e rende inutile `externalIdColumn`.
- **Id esterno dentro la tupla, senza `n`** — scartata: se la banca cambia il formato dell'id, ogni reimport crea doppioni su tutti i campi.
- **Id esterno solo come controllo di conflitto** — scartata: più logica e una colonna in più, per lo stesso risultato.
- **Hash non crittografico (FNV e simili)** — scartata: una collisione perderebbe un movimento, contro la regola 4.1.9.
- **WebCrypto asincrono** — scartata per ora: l'hash serve lato server; il dominio resta sincrono. Si rivede in 1.5 se servirà nel browser.

## Conseguenze

- Per le banche con id i file sovrapposti sono sicuri; senza id resta il limite noto del §8.3, coperto da test.
- Ipotesi da verificare con un export reale: l'id non viene riusato né rigenerato. Gli id delle fixture sono finti.
- Importare un file nella sezione sbagliata cambia `account_id` e quindi gli hash: la conferma del conto prima dell'import è del task 1.5.
- Da valutare in 1.5: un controllo in anteprima per i file con tutte righe nuove ma date e importi già presenti.
- L'id esterno viene ripulito con `trim()` prima dell'hash; un id vuoto o di soli spazi conta come assente. Cambiarlo dopo i primi import altera gli hash.
- Un id ripetuto nello stesso file dà lo stesso hash: il vincolo `unique` scarta la seconda riga in silenzio. Con id univoci della banca non dovrebbe accadere; se accade è un file anomalo, da segnalare in anteprima (da valutare in 1.5).
