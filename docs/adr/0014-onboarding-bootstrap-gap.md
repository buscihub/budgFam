# ADR-0014: Nessuna policy INSERT su households/members finché non esiste l'onboarding

- **Data:** 2026-09-26
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.5

## Contesto

Il task 0.5 scrive le policy RLS di tutte le tabelle del §6 seguendo la matrice del §7. Per `households` e `members`, però, c'è un problema di bootstrap: le policy usano `is_member()`/`is_admin()`, che verificano l'esistenza di una riga in `members`. Il **primo** membro di un nucleo nuovo (il suo admin) non può soddisfare quella condizione, perché quella riga è esattamente quella che si sta cercando di creare — nessun utente autenticato può quindi diventare il primo admin di un nucleo tramite una policy RLS ordinaria.

La creazione di un nucleo e del suo primo membro è compito dell'onboarding ("crea nucleo" / "unisciti con invito", task 0.7), non ancora scritto in questo task.

## Decisione

Per ora `households` e `members` **non hanno una policy INSERT** per il ruolo `authenticated`: con RLS attiva e nessuna policy che lo permetta, l'inserimento è negato di default a chiunque non sia `postgres`/service role. La creazione di nuclei e membri resterà bloccata per gli utenti finali finché il task 0.7 non introduce una funzione `security definer` (o un'azione server con la service role) dedicata all'onboarding, che potrà bypassare questo vincolo in modo controllato.

## Alternative considerate

- **Policy INSERT permissiva temporanea** (es. chiunque autenticato può creare un nucleo/membro) — scartata: lascerebbe una finestra reale in cui qualsiasi utente autenticato potrebbe aggiungersi a un nucleo altrui, cioè esattamente il buco di sicurezza che l'RLS deve evitare. Il costo di aspettare il task 0.7 è nullo (nessun utente reale usa ancora l'app).
- **Funzione di onboarding scritta subito, dentro il task 0.5** — scartata: mescolerebbe la migrazione delle policy RLS (task 0.5) con l'autenticazione/onboarding (task 0.7), rendendo la PR più difficile da rivedere isolatamente, contro l'indicazione di CLAUDE.md di procedere a piccoli passi.

## Conseguenze

- Il task 0.6 (test di integrazione RLS) dovrà creare nuclei e membri di test **come `postgres`/service role** (bypassando RLS), non simulando un utente autenticato che si registra da solo — è così che verranno scritte le fixture di test.
- Il task 0.7 deve esplicitamente risolvere questo gap: la funzione di onboarding sarà `security definer` (o userà la service role lato server) per poter inserire la prima riga in `households` e `members` senza violare le policy appena scritte.
