# ADR-0022: Funzione `create_household` (`security definer`) con regola «un solo nucleo»

- **Data:** 2026-10-07
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.7b

## Contesto

ADR-014 ha lasciato `households` e `members` senza policy INSERT: il primo admin non può passare dalle policy, che richiedono già di essere membro. Serve un punto di ingresso controllato per creare il nucleo. Inoltre il prodotto è per una sola famiglia (§2) e l'AI all'import costa denaro: un estraneo che trova l'app non deve poter aprire un nucleo proprio.

## Decisione

Funzione Postgres `create_household(household_name, member_name)`, `security definer`, con `search_path` fissato, eseguibile solo dal ruolo `authenticated`. In una transazione: verifica utente e nomi, rifiuta se esiste già un nucleo, inserisce nucleo (`owner_id` = chiamante), primo membro `admin` e categorie seed (§6.1). Un advisory lock serializza le chiamate concorrenti.

## Alternative considerate

- **Service role lato server nell'app** — scartata: porta nel codice una chiave che bypassa la RLS (regola 6 di CLAUDE.md) per un'operazione che il database sa fare da solo e testare.
- **Policy INSERT permissive su `households`/`members`** — scartata: riapre la finestra di sicurezza descritta in ADR-014.
- **Indice unico che impone un solo nucleo** — scartata: il modello dati deve poter reggere più nuclei (§2); la restrizione è di prodotto, quindi sta nella funzione e si toglie in un punto.
- **Seed delle categorie nel codice dell'app** — scartata: due scritture separate possono lasciare un nucleo senza categorie se la seconda fallisce.

## Conseguenze

- Il seed delle categorie vive in SQL (fonte unica, atomica con la creazione); un test ne verifica contenuto e `kind` rispetto al §6.1.
- Per aprire un secondo nucleo in futuro basta togliere il controllo nella funzione.
- Chi si registra con un nucleo già esistente non può fare nulla finché non esistono gli inviti (0.7c): è voluto.
