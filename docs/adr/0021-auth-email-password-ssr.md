# ADR-0021: Email + password, sessione con `@supabase/ssr`, `getUser()` come controllo autorevole

- **Data:** 2026-10-06
- **Stato:** Accettata
- **Task collegato:** §13.1 · 0.7a

## Contesto

Servono login e sessione per quattro persone, tutte su iPhone con l'app installata sulla schermata home (Q3), con diversa confidenza con la tecnologia. Next.js 16 rende la sessione disponibile nei Server Components e nelle Server Actions tramite cookie; il file `middleware` si chiama ora `proxy`.

## Decisione

- Accesso con **email e password** (Supabase Auth), registrazione con le stesse credenziali; minimo 8 caratteri.
- Sessione nei cookie gestita da `@supabase/ssr`, solo dentro `src/data/` (regola 2 di CLAUDE.md).
- Due livelli di controllo: il **proxy** aggiorna i cookie e fa un reindirizzamento _ottimistico_ (solo lettura della sessione, nessuna query al database); il **Data Access Layer** (`getCurrentUser`, `requireUser`) usa `supabase.auth.getUser()`, che verifica il token con il server Auth, ed è l'unico controllo su cui ci si affida.

## Alternative considerate

- **Link magico** — scartata: su iPhone il link apre Safari e non la PWA installata, quindi la sessione finisce nel contesto sbagliato.
- **Codice a 6 cifre via email** — scartata: ogni accesso richiede una email (limiti d'invio del piano gratuito) e un passaggio in più per chi è meno pratico.
- **Affidarsi solo al cookie (`getClaims`/`getSession`)** — scartata: non rileva un utente eliminato o un token revocato fino alla scadenza.
- **Solo proxy** — scartata: la documentazione di Next.js lo sconsiglia come unica difesa (non copre le Server Actions chiamate direttamente).

## Conseguenze

- Il reset della password e la conferma email in produzione richiedono l'invio di email: rimandati al task 3.5b, prima del deploy.
- `getUser()` fa una chiamata di rete per richiesta protetta: accettabile per quattro utenti, da rivedere solo se diventasse un problema misurato.
- Gli errori di login sono generici: non rivelano se un'email è registrata.
