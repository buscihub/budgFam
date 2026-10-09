# budgFam — Documento di progetto

> **App di famiglia per budget e cose da fare**
> Autore: Federico Busciglio · Stato: **Bozza v0.4** · Ultimo aggiornamento: 26 settembre 2026

---

## Come usare questo documento

Questo documento è la **specifica di riferimento** del progetto. È scritto per due lettori: le persone (revisori, colloqui) e **Claude Code**, che lo usa come contesto di sviluppo tramite `CLAUDE.md`.

**Come leggere le sezioni:**

| Tipo | Sezioni | Significato |
|---|---|---|
| **Normative** | 4.1, 5, 6, 7, 8, 10, 11, 13 | Descrivono come il sistema **deve** essere. Il codice deve rispettarle; se serve deviare, prima si aggiorna questo documento (e l'ADR relativo), poi il codice. |
| **Contesto** | 1, 2, 3 | Spiegano perché si è arrivati qui. Le decisioni prese non si riaprono senza un motivo nuovo. |
| **Aperte** | 17 | Domande senza risposta. **Non inventare risposte**: se un task dipende da una domanda aperta, chiedere all'autore. |

**Parole chiave:** **DEVE** / **NON DEVE** = vincolo obbligatorio. **DOVREBBE** = scelta di default, derogabile con motivazione scritta. **PUÒ** = facoltativo.

**Glossario (italiano → identificatori nel codice):**

| Termine | Nel codice | Significato |
|---|---|---|
| Nucleo familiare | `household` | Il gruppo che condivide i dati |
| Membro | `member` | Persona appartenente a un nucleo, con ruolo `admin` o `member` |
| Conto | `account` | Conto corrente, carta o "contanti" |
| Movimento | `transaction` | Singola entrata o uscita |
| Import | `import` (batch) | Un caricamento di file estratto conto |
| Regola | `category_rule` | Pattern → categoria, appresa dalle correzioni |
| Cosa da fare | `task` | Attività condivisa con responsabile e scadenza |
| Da rivedere | `needs_review` | Movimento con classificazione a bassa confidenza |

Codice, identificatori, commit e commenti nel codice: **inglese**. Interfaccia utente e documentazione di progetto: **italiano**.

### Come si tiene aggiornata la documentazione

Quattro documenti, ciascuno con un compito preciso. Si aggiornano **insieme al codice, nella stessa pull request** — non è un lavoro a parte da fare "quando c'è tempo".

| Documento | Cosa contiene | Quando si aggiorna |
|---|---|---|
| **DESIGN_DOC.md** (questo file) | La specifica: cosa il sistema **deve** fare e come | Solo quando **cambia una decisione**: nuova scelta di stack, deviazione da una regola del §4.1, una domanda del §17 che riceve risposta. Mai per il solo fatto di aver scritto codice |
| **`docs/adr/NNNN-titolo.md`** | Il perché di una decisione tecnica non ovvia: contesto, alternative scartate, conseguenze | Ogni volta che si aggiunge o si cambia una riga della tabella al §14. Un file per decisione (template in `docs/adr/TEMPLATE.md`), mezza pagina |
| **`CHANGELOG.md`** | Il diario di cosa è stato fatto, task per task. Un log, non una spiegazione | A ogni task chiuso del §13.1: una riga con data, task, cosa è cambiato, link alla PR se c'è |
| **CLAUDE.md** | Istruzioni operative per Claude Code: come lavorare insieme, comandi, stato attuale | Solo quando cambiano le regole di lavoro, si scoprono comandi nuovi (tipicamente a fine Fase 0), o cambia la fase corrente. Non a ogni task |

**Regola pratica per capire dove scrivere:** se riguarda **cosa il sistema deve fare o come è fatto** → DESIGN_DOC (+ ADR se è una scelta tecnica). Se riguarda **cosa è successo** → CHANGELOG. Se riguarda **come lavoriamo insieme** → CLAUDE.md.

Un task del §13.1 si considera chiuso solo quando: il codice passa `lint`/`typecheck`/`test` (CLAUDE.md §Comandi), la sua riga in §13.1 è spuntata, e c'è una riga nuova in CHANGELOG.md. Se il task ha comportato una decisione tecnica non banale, anche l'ADR corrispondente esiste prima del merge.

---

## Indice

1. [Contesto e problema](#1-contesto-e-problema)
2. [Obiettivi e non-obiettivi](#2-obiettivi-e-non-obiettivi)
3. [Decisione](#3-decisione)
4. [Principi di ingegneria](#4-principi-di-ingegneria)
5. [Architettura](#5-architettura)
6. [Modello dati](#6-modello-dati)
7. [Sicurezza e accessi (RLS)](#7-sicurezza-e-accessi-rls)
8. [La pipeline di import](#8-la-pipeline-di-import)
9. [Valutazione del classificatore](#9-valutazione-del-classificatore)
10. [Qualità del codice e test](#10-qualità-del-codice-e-test)
11. [Operatività: l'app in produzione](#11-operatività-lapp-in-produzione)
12. [Metriche di prodotto](#12-metriche-di-prodotto)
13. [Tabella di marcia](#13-tabella-di-marcia)
14. [Architecture Decision Records](#14-architecture-decision-records)
15. [Prerequisiti e account](#15-prerequisiti-e-account)
16. [Presentazione come progetto (CV)](#16-presentazione-come-progetto-cv)
17. [Domande aperte](#17-domande-aperte)
18. [Fonti](#18-fonti)

---

## 1. Contesto e problema

In famiglia (io, mia madre e le mie sorelle) vogliamo:

- **capire entrate e uscite**: da dove arrivano i soldi, dove vanno, per quali categorie;
- **classificarle e gestirle** mese per mese, con un budget per categoria;
- **coordinare le cose da fare** in casa: chi se ne occupa ed entro quando.

Il vincolo principale è l'**adozione**: lo strumento deve essere usato davvero da tutte e quattro le persone, con livelli diversi di confidenza con la tecnologia. Un sistema di budgeting muore quando tenerlo aggiornato costa fatica: dopo tre settimane mostra numeri vecchi, dopo sei non lo guarda più nessuno.

Il progetto ha anche un secondo scopo: essere un **progetto di ingegneria del software presentabile** (candidatura Software Engineer / First Ascent, Bending Spoons). Deve quindi essere costruito e documentato con standard professionali.

---

## 2. Obiettivi e non-obiettivi

### Obiettivi

| # | Obiettivo | Come si misura |
|---|---|---|
| O1 | Budget di casa condiviso: movimenti, categorie, riepilogo mensile, budget per categoria | Tutti i conti di casa importati ogni mese |
| O2 | Inserimento a basso sforzo: import dell'estratto conto con classificazione automatica | % movimenti classificati senza intervento umano |
| O3 | Cose da fare condivise, con responsabile e scadenza | Task completati entro la scadenza |
| O4 | Accesso personale per ogni membro, con spese private possibili | Test RLS verdi in CI |
| O5 | Installabile sul telefono come un'app | Tutte e 4 la usano dalla schermata home |
| O6 | Costo di esercizio vicino a zero | Costo API mensile nell'ordine dei centesimi |

### Non-obiettivi (per ora)

- Collegamento diretto alle banche (PSD2 / open banking).
- Funzioni "da assistente personale": memoria semantica, note, salute, abitudini, briefing mattutino.
- App native iOS/Android pubblicate sugli store.
- Più di un nucleo familiare (il modello dati lo permette, il prodotto no).
- Gestione della contabilità del B&B: passa dagli stessi conti, quindi è **esclusa dai riepiloghi** tramite una categoria dedicata (vedi [Domande aperte](#17-domande-aperte), Q5).

---

## 3. Decisione

> *Sezione di contesto.* La decisione è presa. Le funzioni escluse (memoria semantica, note, salute, abitudini, briefing) **NON DEVONO** essere aggiunte senza una decisione esplicita dell'autore.

App di famiglia essenziale, **costruita da noi**: solo budget e cose da fare condivise. L'AI si usa in un solo punto: la classificazione dei movimenti importati.

- **Fase 1**: budget + import + cose da fare, login per ognuna, PWA.
- **Fase 2** (solo se l'uso lo richiede): **bot Telegram** per registrare spese e cose da fare al volo, agganciato allo stesso database.

---

## 4. Principi di ingegneria

Allineati a quanto Bending Spoons scrive pubblicamente sul proprio modo di costruire software (vedi [Fonti](#18-fonti)). I loro standard interni non sono pubblici: questa è un'interpretazione basata sulle fonti pubbliche.

| Principio | Come si applica qui |
|---|---|
| **Semplicità radicale**: l'onere della prova è su chi propone complessità | Un solo deployable, niente microservizi, niente PSD2; ogni scelta ha un ADR con le alternative scartate |
| **You build it, you run it** | Monitoraggio, backup testati, controllo dei costi e metriche fanno parte del progetto, non sono un "dopo" |
| **Grandi leve** prima dei casi marginali | Una banca perfetta prima di cinque a metà; la classificazione ibrida attacca il costo principale (la fatica di inserire) |
| **Qualità automatizzata** | Linter, formatter, controllo tipi e test in CI; la code review si concentra su logica e architettura |
| **Decisioni guidate dai dati** | Classificatore valutato su un set etichettato; metriche d'uso reali; cambiamenti motivati dai numeri |
| **Test proporzionati alla maturità** | Test fitti sulla logica di dominio e sulla sicurezza, pochi E2E sull'interfaccia |
| **Il problema sceglie la tecnologia** | TypeScript monolitico perché è la soluzione più semplice qui, non per moda né per imitare lo stack aziendale |

### 4.1 Regole non negoziabili (invarianti)

Valgono per tutto il codice. Ogni violazione è un bug.

1. **Soldi:** gli importi **DEVONO** essere interi in centesimi (`bigint` nel DB, `number` intero in TS, validato). **NON DEVONO** esistere float per importi. La formattazione in euro avviene solo nell'interfaccia.
2. **Accesso ai dati:** tutte le letture e scritture sul database **DEVONO** passare da `src/data/`. Componenti e route **NON DEVONO** usare direttamente il client Supabase.
3. **Logica di dominio:** `src/domain/` **DEVE** essere puro: niente import da Next.js, Supabase o SDK AI. Riceve dati e restituisce dati, quindi si testa senza mock.
4. **AI:** il modello **NON DEVE** mai essere chiamato al caricamento di una pagina o in un render. Solo da azioni esplicite (import, rilevamento formato). Ogni output del modello **DEVE** essere validato con Zod prima dell'uso.
5. **Dati verso l'AI:** al modello vanno **solo** descrizione normalizzata, importo e segno, più le intestazioni e 5 righe di esempio per il rilevamento del formato. **NON DEVONO** andare IBAN, nomi di persone, saldi o email.
6. **Segreti:** chiavi e token **DEVONO** stare solo in variabili d'ambiente. La `SUPABASE_SERVICE_ROLE_KEY` e la `ANTHROPIC_API_KEY` **NON DEVONO** mai arrivare al browser: niente prefisso `NEXT_PUBLIC_`, uso solo in codice server (`import "server-only"`).
7. **Schema:** ogni modifica al database **DEVE** essere una migrazione in `supabase/migrations/`. Mai modifiche manuali dal pannello.
8. **RLS:** ogni tabella con dati **DEVE** avere RLS attiva e policy coperte da test. Una tabella nuova senza policy e senza test non si mergia.
9. **Idempotenza:** reimportare lo stesso file **NON DEVE** creare doppioni né perdere movimenti legittimi (§8.3).
10. **Dati reali:** fixture, golden set e seed **DEVONO** essere anonimizzati o finti. **NON DEVONO** essere committati estratti conto reali.
11. **Date:** le date di contabilizzazione sono `date` (senza orario); ogni conversione usa il fuso `Europe/Rome`.

---

## 5. Architettura

```
 Telefono (PWA) / Browser
          │  HTTPS
          ▼
 ┌──────────────────────────────┐
 │  Next.js (TypeScript strict) │  ← un solo deployable, su Vercel
 │  ├─ UI (Server Components)   │
 │  ├─ Server Actions / API     │
 │  └─ domain/  ← logica pura:  │  parsing CSV, dedup, regole, budget
 └──────────┬──────────┬────────┘
            │          │ solo lato server
            ▼          ▼
     Supabase       Anthropic API
     (Postgres +    (classificazione,
      Auth + RLS)    output strutturato)
```

### 5.1 Scelte di stack

| Livello | Scelta | Perché | Alternativa scartata |
|---|---|---|---|
| Framework | **Next.js (App Router)** | UI e logica server nello stesso progetto; la chiave API non arriva mai al browser | Frontend e backend separati: due deploy e un contratto API per 4 utenti |
| Linguaggio | **TypeScript strict** | I tipi sono documentazione verificata; il codice lo leggeranno altri | JavaScript: va bene per uso personale, non per un portfolio |
| Database | **Supabase** (Postgres + Auth) | Postgres vero, autenticazione e RLS inclusi, piano gratuito | GCP + Cloud SQL: più vicino allo stack BS, sproporzionato qui |
| Hosting | **Vercel** | Deploy da git, anteprima per ogni PR | Server gestito a mano |
| Client | **PWA** | Una codebase, installabile su iOS e Android | App native: tre codebase + store |
| Ingresso dati | **Import CSV/XLS** | Funziona con ogni banca, nessun contratto esterno | PSD2 via aggregatori: costi, contratti, fragilità |
| AI | **Anthropic, modello economico (Haiku)** con output strutturato | Classificazione a basso costo, output validabile | Modelli più grandi: costo non giustificato per il compito |
| Validazione | **Zod** | Schema unico per input utente, output AI e confini del sistema | Validazione a mano |

**Perché non Python nel backend?** Bending Spoons usa soprattutto Python lato backend, ma aggiungere un servizio FastAPI solo per allinearsi violerebbe il principio di semplicità. Python trova invece posto naturale nella **suite di valutazione** del classificatore ([§9](#9-valutazione-del-classificatore)), che è analisi dati e non un servizio.

**Note operative per lo sviluppo:**

- **Versioni:** usare le versioni stabili correnti al momento dello scaffolding (`create-next-app`), senza fissarsi su un numero. Le versioni recenti di Next.js hanno cambiato API rispetto a quelle più note: se il codice non compila con errori su API che "dovrebbero esserci", leggere prima la documentazione in `node_modules/next/dist/docs/`.
- **Modello AI configurabile:** il nome del modello sta in `ANTHROPIC_MODEL` (default: il modello Haiku più recente disponibile). Il codice non lo scrive a mano in giro.
- **Supabase in Next.js:** usare `@supabase/ssr` per la sessione nei Server Components e nelle Server Actions, e generare i tipi TypeScript dallo schema (`supabase gen types`) dopo ogni migrazione.
- **Package manager:** pnpm.

### 5.2 Struttura del repository

```
budgFam/
├─ src/
│  ├─ domain/        ← logica pura, zero dipendenze da framework
│  │   ├─ import/    (rilevamento formato, parser, normalizzazione, dedup)
│  │   ├─ classify/  (regole, orchestrazione AI, soglie)
│  │   └─ budget/    (riepiloghi, confronto con i budget)
│  ├─ data/          ← UNICO punto di accesso al database
│  └─ app/           ← UI e route Next.js, sottili: chiamano domain/ e data/
├─ supabase/migrations/   ← schema versionato
├─ tests/                 ← unit, integrazione (RLS), e2e
├─ evals/                 ← golden set e script di valutazione
├─ fixtures/              ← CSV bancari anonimizzati, uno per formato
├─ docs/
│  ├─ DESIGN_DOC.md       ← questo documento
│  ├─ CHANGELOG.md        ← diario di cosa è stato fatto, task per task
│  ├─ adr/                ← Architecture Decision Records (TEMPLATE.md + un file per decisione)
│  └─ design/mockups/     ← istantanee statiche dei mockup (l'originale modificabile è l'artifact Claude Design)
└─ CLAUDE.md              ← istruzioni operative per Claude Code (in root: Claude Code lo carica da lì)
```

### 5.3 Schermate

1. **Riepilogo del mese**, in due viste (ADR-018): **Famiglia** (movimenti condivisi di tutti: entrate, uscite, saldo, categorie confrontate con il budget familiare, riga informativa *Trasferiti ai familiari* per persona) e **Personale** (tutti i movimenti dei **miei conti**, privati e condivisi, confrontati con il mio budget personale). Sono due lenti sugli stessi dati: la spesa di famiglia pagata con la mia carta è un'uscita sia per la famiglia sia per me, ma le due viste non si sommano mai.
2. **Movimenti**: lista filtrabile, correzione rapida della categoria, banner dei movimenti "da rivedere"; un unico punto d'ingresso ("+") per aggiungere un movimento, manualmente o importando un estratto conto (vedi ADR-013 — non c'è più una schermata "Importa" separata).
3. **Cose da fare**: lista condivisa con responsabile, scadenza e ricorrenza; stesso pattern "+" per aggiungere una nuova attività.

Mockup di queste schermate (mobile e desktop, stile "Liquid Glass" sulla palette calda B1, con un primo campione di modalità scura) prototipati su Claude Design — vedi ADR-012. L'originale modificabile resta l'artifact Claude Design; in `docs/design/mockups/` c'è un'istantanea statica (HTML autonomo, apribile nel browser) per consultarli senza riaprire Claude — vedi `docs/design/mockups/README.md`.

---

## 6. Modello dati

Regole di base:

- **Soldi in centesimi interi** (`bigint`), mai float: `0.1 + 0.2 ≠ 0.3`.
- **`household_id` su ogni tabella**, così le regole di accesso restano semplici.
- **Migrazioni versionate** nel repository (Supabase CLI); lo schema non si modifica mai a mano dal pannello.

Schema di riferimento. È il punto di partenza per la prima migrazione: i nomi possono essere affinati, ma i vincoli (tipi, `unique`, `check`, `not null`) sono normativi.

```sql
create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users,  -- admin principale (ADR-016)
  created_at timestamptz not null default now()
);

create table members (
  household_id uuid not null references households on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null,
  role         text not null check (role in ('admin','member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table invites (           -- link monouso per unirsi al nucleo (task 0.7c)
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  code         text not null unique default encode(gen_random_bytes(32), 'hex'),
  role         text not null check (role in ('admin','member')),  -- ruolo che l'invitato riceverà
  created_by   uuid not null references auth.users,
  expires_at   timestamptz not null default (now() + interval '24 hours'),
  used_at      timestamptz,
  used_by      uuid references auth.users,
  created_at   timestamptz not null default now()
);

create table accounts (          -- conto corrente, carta, contanti
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('bank','card','cash')),
  owner_id     uuid not null references auth.users,  -- chi lo gestisce e vi importa gli estratti (ADR-015)
  visibility   text not null default 'private'
               check (visibility in ('shared','private')),  -- default dei suoi movimenti
  bank_format  jsonb,             -- mappatura colonne salvata (§8.1); null finché non rilevata
  created_at   timestamptz not null default now()
);

create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('income','expense','transfer','excluded')),
  is_hidden    boolean not null default false,  -- nascosta dai selettori e dall'AI, ma resta sui movimenti esistenti (ADR-017)
  unique (household_id, name)
);

create table imports (           -- un caricamento di file: serve a log, metriche e annullamento
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households on delete cascade,
  account_id     uuid not null references accounts,
  uploaded_by    uuid not null references auth.users,
  file_name      text not null,
  rows_read      int not null default 0,
  rows_inserted  int not null default 0,
  rows_duplicate int not null default 0,
  by_rule        int not null default 0,
  by_ai          int not null default 0,
  needs_review   int not null default 0,
  ai_tokens_in   int not null default 0,
  ai_tokens_out  int not null default 0,
  status         text not null default 'processing'
                 check (status in ('processing','done','failed')),
  error          text,
  created_at     timestamptz not null default now()
);

create table transactions (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households on delete cascade,
  account_id      uuid not null references accounts,
  import_id       uuid references imports on delete set null,  -- null = inserito a mano
  owner_id        uuid references auth.users,
  booked_on       date not null,
  amount_cents    bigint not null,          -- negativo = uscita
  description     text not null,            -- normalizzata
  raw_description text not null,            -- originale, per debug e regole
  category_id     uuid references categories,
  category_source text check (category_source in ('rule','ai','user')),
  ai_confidence   numeric check (ai_confidence between 0 and 1),
  needs_review    boolean not null default false,
  visibility      text not null default 'private'
                  check (visibility in ('shared','private')),  -- ereditata dal conto alla creazione; sovrascrivibile
  visibility_overridden boolean not null default false,  -- true se l'utente l'ha scelta a mano: mai toccata da cambi di visibilità del conto
  transfer_member_id uuid references auth.users,  -- destinatario/mittente (solo membri) per le categorie kind='transfer'; coerenza imposta in src/data
  import_hash     text,
  created_at      timestamptz not null default now(),
  unique (household_id, import_hash)        -- idempotenza degli import
);
create index on transactions (household_id, booked_on);

create table category_rules (      -- "CONAD" → Spesa, imparate dalle correzioni
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  pattern      text not null,       -- sottostringa sulla descrizione normalizzata
  category_id  uuid not null references categories on delete cascade,
  created_by   uuid references auth.users,
  created_at   timestamptz not null default now(),
  unique (household_id, pattern)
);

create table budgets (            -- member_id null = budget familiare; valorizzato = budget personale (ADR-018)
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  member_id    uuid references auth.users,
  category_id  uuid not null references categories on delete cascade,
  month        date not null check (extract(day from month) = 1),  -- primo del mese
  limit_cents  bigint not null check (limit_cents >= 0)
);
create unique index budgets_scope_uq on budgets
  (household_id, coalesce(member_id, '00000000-0000-0000-0000-000000000000'), category_id, month);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  title        text not null,
  notes        text,
  assignee_id  uuid references auth.users,
  created_by   uuid not null references auth.users,
  due_on       date,
  done_at      timestamptz,
  recurrence   text check (recurrence in ('weekly','monthly')),  -- null = non ricorrente
  created_at   timestamptz not null default now()
);
```

La **precedenza delle regole** in caso di più pattern corrispondenti: vince il pattern **più lungo** (più specifico). Da documentare nei test del motore di regole.

### 6.1 Categorie iniziali (seed)

**Trasferimenti.** Il `kind = 'transfer'` non entra in *Uscite* né in *Entrate*: nel riepilogo famiglia compare come riga a parte, per destinatario (`transfer_member_id`) e per categoria. Il destinatario può essere **solo un membro registrato**. Un bonifico a una **persona esterna** è una normale **uscita**, catalogata in una categoria di spesa in base a cosa è (Regali, Casa, Altro…), senza destinatario.

Nella vista **Personale** (ADR-018) i trasferimenti **inviati** a un familiare restano una riga a parte; quelli **ricevuti** contano come **entrata**.

Create all'onboarding del nucleo; ogni nucleo può **nascondere** quelle che non usa e **aggiungerne di personalizzate** (ADR-017). Le categorie con movimenti non si eliminano, si nascondono.

| `kind` | Categorie |
|---|---|
| `expense` | Casa, Utenze, Spesa alimentare, Ristoranti e bar, Trasporti, Auto, Salute, Svago, Abbonamenti, Abbigliamento, Viaggi, Istruzione, Regali, Rate e finanziamenti, Altro |
| `income` | Stipendio, Altre entrate, Investimenti |
| `transfer` | Giroconto tra conti; trasferimenti ai familiari: Paghetta, Aiuto economico, Rimborso spese, Regalo in denaro |
| `excluded` | B&B (fuori da riepiloghi e budget) |

---

## 7. Sicurezza e accessi (RLS)

La sicurezza vive **nel database**, non nel codice dell'app. Anche una query sbagliata nel frontend non può restituire dati altrui.

**Trappola nota:** una policy su `members` che interroga `members` va in **ricorsione infinita** in Postgres. La soluzione è una funzione `security definer` che verifica l'appartenenza, usata da tutte le policy:

```sql
create function public.is_member(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = hh and user_id = auth.uid());
$$;

create function public.is_admin(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members
                 where household_id = hh and user_id = auth.uid() and role = 'admin');
$$;

alter table transactions enable row level security;

-- `visibility` del movimento è l'unica fonte per la RLS: il conto dà solo il default,
-- l'override vale in entrambe le direzioni (vedi ADR-015).
create policy tx_select on transactions for select using (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
create policy tx_insert on transactions for insert with check (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
create policy tx_update on transactions for update using (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
```

**Matrice degli accessi** (i test di integrazione **DEVONO** coprire ogni riga):

| Tabella | Leggere | Creare / modificare | Eliminare |
|---|---|---|---|
| `households` | membri | — (solo tramite `create_household`, vedi sotto) | admin principale (`owner_id`) |
| `members` | membri dello stesso nucleo | admin; **solo l'admin principale** promuove/declassa altri admin | admin |
| `accounts` | membri: condivisi + i propri privati | membri (come proprietari di quel conto) | proprietario o admin |
| `categories`, `category_rules` | membri | membri (nascondere = update) | admin |
| `budgets` familiari (`member_id` null) | membri | admin | admin |
| `budgets` personali | **solo il proprietario** | proprietario | proprietario |
| `imports` | membri | membri (tramite il server) | admin |
| `transactions` | membri: condivisi + i propri privati | membri: stessa regola | proprietario o admin |
| `tasks` | membri | membri | creatore o admin |
| `invites` | **solo admin** | admin (vedi sotto per l'accettazione) | admin |
| Chi non è membro | **niente, su nessuna tabella** | niente | niente |

Regole di visibilità (ADR-015):

- **ogni membro registra i propri conti/carte**, privati o condivisi. «Condiviso» non significa cointestato: il conto della madre che paga la spesa per tutti è condiviso, anche se è solo suo;
- la visibilità del **conto** è il default dei suoi movimenti; ogni movimento può essere **sovrascritto in entrambe le direzioni**: un acquisto personale su un conto condiviso → privato; la spesa per tutta la famiglia fatta con la propria carta privata → condiviso. Il conto di un movimento condiviso resta invisibile agli altri: vedono il movimento, non il conto;
- gli import si **indirizzano a un conto**; l'estratto conto eredita proprietario e visibilità di quel conto;
- movimento **condiviso** → lo vede tutto il nucleo familiare;
- movimento **privato** → solo chi lo possiede (gli admin **non** fanno eccezione);
- nei totali di casa i privati possono comparire come **cifra aggregata**, senza dettaglio.

**Creazione del nucleo (ADR-022).** Nessun utente può inserire direttamente in `households`/`members` (ADR-014). Il nucleo nasce con la funzione `security definer` `create_household(household_name, member_name)`, eseguibile solo da utenti autenticati, che in un'unica transazione: crea il nucleo con `owner_id` = chiamante, inserisce il chiamante come primo `admin` e le categorie seed del §6.1. **Rifiuta** se esiste già un nucleo (il prodotto è per una sola famiglia, §2): chi si registra dopo entra solo con invito (task 0.7c). Le chiamate concorrenti sono serializzate con un advisory lock, così due registrazioni simultanee non creano due nuclei.

**Inviti (ADR-023, task 0.7c).** Un admin crea un invito con un normale `insert` su `invites` (è già membro, non serve `security definer`): la `with check` fissa la scadenza a 24 ore e impedisce di marcarlo già usato. Chi **accetta** non è ancora membro, quindi usa la funzione `security definer` `accept_invite(invite_code, member_name)`, che verifica codice/scadenza/uso, rifiuta chi è già membro di un nucleo, e inserisce la riga in `members` col ruolo scelto da chi ha creato l'invito (modificabile dopo, come ogni ruolo). La select su `invites` è admin-only, non member-only: un codice valido equivale a una password temporanea.

Altre misure:

- **Admin multipli, con un principale** (ADR-016): il ruolo `admin` è assegnabile a più membri; `households.owner_id` indica l'admin principale, l'unico che può promuovere/declassare altri admin, trasferire il ruolo e eliminare il nucleo.
- **Autenticazione vera** (Supabase Auth, **email + password**, ADR-021), non una password unica condivisa.
- La **service role key** di Supabase si usa solo lato server, mai nel browser.
- Le policy RLS sono **coperte da test** in CI ([§10](#10-qualità-del-codice-e-test)).
- **Limite noto e dichiarato:** l'amministratore del progetto Supabase scavalca la RLS e può leggere tutti i dati dal pannello. Va scritto nel README e detto ai membri della famiglia.

---

## 8. La pipeline di import

È il cuore tecnico del progetto.

```
 CSV/XLS banca ─► 1. Rilevamento formato ─► 2. Parsing ─► 3. Normalizzazione
                                                              │
      ┌───────────────────────────────────────────────────────┘
      ▼
 4. Deduplica (hash) ─► 5. Regole note ─► 6. AI sui soli casi ignoti ─► 7. Revisione utente
                                                                         │
                                     8. La correzione diventa una regola ◄┘
```

### 8.1 Rilevamento formato e parsing

Ogni banca esporta a modo suo:

- separatore `;` invece di `,`, decimali con la virgola, date `gg/mm/aaaa`;
- entrate e uscite in colonne separate, oppure un'unica colonna con il segno;
- righe di intestazione spazzatura in cima, codifica `latin-1`, vecchi `.xls`.

**Strategia:**

- La **prima volta** che si vede un formato, il modello riceve **solo l'intestazione e 5 righe** e restituisce la mappatura delle colonne (data, importo o dare/avere, descrizione, righe da saltare, formato data e numeri).
- La mappatura si **salva** (`accounts.bank_format`). Da lì il parsing è **codice deterministico**, senza AI e senza costi.
- Ogni formato ha un **file di esempio anonimizzato** in `fixtures/` con i relativi test.
- La mappatura proposta dall'AI viene **mostrata all'utente per conferma** (anteprima delle prime righe interpretate) prima di essere salvata.

Forma della mappatura salvata (validata con Zod):

```ts
type BankFormat = {
  encoding: "utf-8" | "latin1";
  delimiter: ";" | "," | "\t";
  skipRows: number;                 // righe di intestazione spazzatura
  dateColumn: string;
  dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD" | "DD-MM-YYYY" | "DD.MM.YYYY";
  descriptionColumns: string[];     // a volte la descrizione è divisa su più colonne
  amount:
    | { mode: "signed"; column: string }
    | { mode: "split"; debitColumn: string; creditColumn: string };
  decimalSeparator: "," | ".";
  thousandsSeparator: "." | "," | "" ;
};
```

### 8.2 Normalizzazione

- Importi → centesimi interi con segno.
- Date → ISO, fuso `Europe/Rome`.
- Descrizioni → maiuscole uniformi, spazi compressi, codici variabili rimossi (numeri di operazione, orari), in modo che le regole funzionino.

### 8.3 Deduplica (idempotenza)

Il caso limite: **due caffè da 1,20 € lo stesso giorno allo stesso bar sono due movimenti veri**, non un doppione. L'hash include quindi l'**indice di occorrenza** nel file:

```
import_hash = hash(account_id, booked_on, amount_cents, descrizione_normalizzata, n-esima occorrenza)
```

- Reimportare lo stesso mese **non crea doppioni**: il vincolo `unique` fa scartare le righe già presenti.
- I movimenti identici ma legittimi **non si perdono**.
- *Limite noto:* se due estratti conto si sovrappongono solo in parte e contengono movimenti identici, l'indice di occorrenza può non coincidere. Il caso va coperto da test e documentato.

### 8.4 Classificazione ibrida

1. **Regole note** (`category_rules`): corrispondenza di pattern sulla descrizione normalizzata.
2. **AI solo sui movimenti rimasti**, **in un'unica chiamata** per import:
   - modello economico (Haiku);
   - **output strutturato** con JSON Schema: la categoria deve appartenere all'elenco esistente, con un valore di confidenza. Il modello non può inventare categorie;
   - sotto una **soglia di confidenza** il movimento va in "Da rivedere" invece di essere classificato di nascosto.
3. **Minimizzazione dei dati:** al modello vanno solo descrizione, importo e segno. Niente IBAN, niente nomi, niente saldi.
4. **Difesa dalla prompt injection:** le descrizioni bancarie sono testo esterno. Si passano come dati delimitati, mai come istruzioni, e l'output è **validato con Zod** prima di toccare il database.
5. **Mai AI al caricamento della pagina:** la classificazione parte solo dall'azione di import.
6. **Degrado controllato:** se la chiamata AI fallisce (rete, credito esaurito, output non valido), l'import **NON DEVE** fallire. I movimenti vengono salvati senza categoria con `needs_review = true` e l'errore finisce nel log dell'import.

Contratto della chiamata di classificazione:

```ts
// input al modello: solo movimenti senza regola, con un id locale
type ClassifyInput = {
  categories: { id: string; name: string; kind: "income" | "expense" | "transfer" }[];
  items: { ref: number; description: string; amountCents: number }[];
};

// output atteso (JSON Schema / tool use), validato con Zod
type ClassifyOutput = {
  results: { ref: number; categoryId: string | null; confidence: number }[];
};
// Validazione: ogni ref presente una sola volta; categoryId ∈ categories o null;
// confidence ∈ [0,1]. Sotto CONFIDENCE_THRESHOLD (default 0.7, configurabile) → needs_review.
```

### 8.5 Il ciclo di apprendimento

Alla correzione manuale di una categoria l'app propone *"Applicare sempre a CONAD?"*. Se si accetta, nasce una regola. Ogni correzione riduce le chiamate future: **il costo dell'AI scende nel tempo per costruzione**.

---

## 9. Valutazione del classificatore

- **Golden set:** circa 200 movimenti reali, **anonimizzati**, classificati a mano. Vive in `evals/`.
- **Script di valutazione** (Python, pandas) che misura:
  - accuratezza complessiva e **per categoria**;
  - tasso di "da rivedere" alle varie soglie di confidenza;
  - **costo per 100 movimenti** (token in/out);
  - latenza.
- **Regola:** ogni modifica a prompt, modello o soglia si valuta sul golden set **prima** del rilascio. I risultati si salvano nel repository, così lo storico delle scelte è verificabile.
- Output atteso per il CV: una riga del tipo *"accuratezza X% su set etichettato, costo Y per movimento"*, con **numeri misurati davvero**.

---

## 10. Qualità del codice e test

### 10.1 Automazione

- **ESLint + Prettier**, hook pre-commit.
- `tsc --noEmit` (TypeScript strict) in CI.
- **GitHub Actions** a ogni pull request: lint, tipi, test, migrazioni applicate su un database vuoto.
- **Vercel Preview**: un ambiente di anteprima per ogni PR.

### 10.2 Test proporzionati

| Livello | Cosa testa | Strumento | Quantità |
|---|---|---|---|
| **Unit** | Parser su fixture reali anonimizzate per ogni banca; normalizzazione; dedup (incluso il caso dei due caffè); motore di regole; calcolo del budget | Vitest | Tanti |
| **Integrazione** | Policy RLS: "l'utente B **non** vede il movimento privato di A"; "chi non è membro non vede nulla"; vincolo di idempotenza | Supabase locale (Docker) | Medi |
| **E2E** | Login → import → correzione → riepilogo | Playwright | Pochi |

### 10.3 Code review

Anche lavorando da solo: ogni modifica passa da una **pull request** con descrizione (cosa, perché, come è stata verificata). La storia del repository diventa parte della presentazione.

---

## 11. Operatività: l'app in produzione

| Area | Pratica |
|---|---|
| **Ambienti** | Locale → anteprima (per PR) → produzione |
| **Segreti** | Solo variabili d'ambiente (Vercel), mai nel repository; `.env.example` documentato |
| **Osservabilità** | Sentry per gli errori; log strutturati per ogni import (righe lette, doppioni scartati, classificate da regola, da AI, da rivedere, token usati) |
| **Costi** | Limite di spesa mensile sulla chiave Anthropic; contatore token per import; avviso se il costo si discosta dal solito |
| **Backup** | Il piano gratuito Supabase non ha il ripristino puntuale → dump notturno automatico **cifrato**; **prova di ripristino documentata** |
| **Piano gratuito** | Verificare le condizioni attuali di Supabase, in particolare la sospensione dei progetti inattivi |
| **Privacy** | Sezione README: dove stanno i dati, chi li vede, come si esportano, come si cancellano |
| **Demo pubblica** | Solo **dati finti** generati da uno script di seed; mai dati reali della famiglia |

---

## 12. Metriche di prodotto

Quattro utenti reali sono un vantaggio: permettono di misurare l'uso vero.

| Metrica | Perché conta |
|---|---|
| Membri attivi a settimana | L'app è usata o no? |
| % movimenti classificati senza intervento umano (e trend) | Efficacia del ciclo regole + AI |
| Tempo da "scarico il CSV" a "riepilogo pronto" | Il costo dell'inserimento, cioè il motivo per cui i budget muoiono |
| Cose da fare completate entro la scadenza | Utilità della seconda funzione |
| Costo AI mensile | Sostenibilità |

Oltre a misurare, va documentato cosa si è **cambiato grazie ai dati**. Esempio: *"le correzioni si concentravano su 3 categorie ambigue, unite → correzioni −40%"*.

---

## 13. Tabella di marcia

| Fase | Contenuto | Criterio di uscita |
|---|---|---|
| **0 · Fondamenta** | Repository, CI, Supabase locale, migrazioni, autenticazione, RLS + test | Due utenti di test correttamente isolati |
| **1 · Primo import** | Import CSV di **una** banca, normalizzazione, dedup, riepilogo mensile | Un mese reale importato e riepilogato |
| **2 · Classificazione** | Regole, AI con output strutturato, revisione, apprendimento dalle correzioni, golden set ed eval | Accuratezza misurata e documentata |
| **3 · Uso in famiglia** | Tutte le banche/carte, budget per categoria, cose da fare, PWA | Tutte e 4 la usano dal telefono |
| **4 · Produzione e presentazione** | Osservabilità, backup testati, metriche, ADR, README, demo con dati finti | Repository presentabile |
| **5 · Estensione (opzionale)** | Bot Telegram per spese e cose da fare al volo | Solo se l'uso reale lo richiede |

**Fase corrente: 1 · Primo import** *(aggiornare questa riga a ogni cambio di fase)*

### 13.1 Task per fase

Ogni task è pensato come **una pull request piccola**. Una fase è chiusa quando tutti i criteri di uscita sono verificati.

**Fase 0 · Fondamenta**
- [x] 0.1 Scaffolding Next.js + TypeScript strict + pnpm; ESLint, Prettier, hook pre-commit
- [x] 0.2 Struttura cartelle `src/domain`, `src/data`, `src/app`; regola lint che vieta import di Next/Supabase dentro `src/domain`
- [x] 0.3 Vitest configurato, con un primo test sul dominio (formattazione centesimi → euro)
- [x] 0.4 Supabase CLI + Supabase locale (Docker); prima migrazione con lo schema del §6
- [x] 0.5 Funzioni `is_member` / `is_admin` e policy RLS del §7 per tutte le tabelle
- [x] 0.5b Migrazione per ADR-015/016/017/018: `accounts.owner_id`/`visibility`, `households.owner_id`, `categories.is_hidden` e `kind 'excluded'`, `transactions.visibility_overridden`/`transfer_member_id`, `budgets.member_id`, default `private`, policy aggiornate; poi `supabase gen types`
- [x] 0.6 Test di integrazione RLS: due nuclei, tre utenti, ogni riga della matrice di accesso
- [x] 0.7a Autenticazione (`@supabase/ssr`): registrazione, login, logout, pagina protetta (ADR-021)
- [x] 0.7b Onboarding «crea nucleo»: funzione `create_household` (un solo nucleo ammesso) + categorie seed (§6.1)
- [x] 0.7c Inviti: link monouso per «unisciti con invito» (tabella `invites`, `accept_invite`)
- [x] 0.8 GitHub Actions: lint, tipi, unit, migrazioni + test RLS su DB effimero
- [ ] 0.9 `.env.example`, README minimo (come avviare in locale)
- [ ] 0.8 GitHub Actions: lint, tipi, unit, migrazioni + test RLS su DB effimero
- [x] 0.9 `.env.example`, README minimo (come avviare in locale)
- **Uscita:** CI verde; test dimostrano che l'utente del nucleo A non vede nulla del nucleo B e non vede i privati degli altri membri.

**Fase 1 · Primo import**
- [ ] 1.1 Fixture anonimizzata della prima banca (dipende da **Q1**)
- [ ] 1.2 Parser deterministico guidato da `BankFormat` + test sulla fixture
- [ ] 1.3 Normalizzazione descrizioni e importi + test (inclusi decimali con virgola e colonne dare/avere)
- [ ] 1.4 Hash di deduplica con indice di occorrenza + test (due caffè; reimport dello stesso file)
- [ ] 1.5 Pagina Importa: upload, anteprima, conferma; record in `imports` con i contatori
- [x] 1.6 Riepilogo mensile: entrate, uscite, saldo, per categoria
- **Uscita:** un mese reale importato due volte senza doppioni; totali uguali all'estratto conto.

**Fase 2 · Classificazione**
- [ ] 2.1 Motore di regole puro (precedenza: pattern più lungo) + test
- [ ] 2.2 Client Anthropic lato server, modello da `ANTHROPIC_MODEL`, output strutturato validato con Zod
- [ ] 2.3 Rilevamento formato via AI per banche nuove, con conferma dell'utente
- [ ] 2.4 Soglia di confidenza, stato `needs_review`, degrado controllato se l'AI fallisce
- [ ] 2.5 Schermata "Da rivedere" + correzione + proposta "applicare sempre"
- [ ] 2.6 Golden set (~200 movimenti anonimizzati) e script di eval in `evals/`
- **Uscita:** accuratezza e costo misurati e salvati in `evals/results/`.

**Fase 3 · Uso in famiglia**
- [ ] 3.1 Tutti i conti/carte (Revolut, UniCredit, Findomestic, Trade Republic; **Q1**); inserimento manuale rapido per i contanti (**Q2**)
- [ ] 3.2 Budget familiare per categoria (modificabile dagli admin) e confronto nel riepilogo Famiglia
- [ ] 3.2b Budget personale e vista Personale (ADR-018)
- [ ] 3.2c Gestione categorie: nascondi / aggiungi personalizzate (ADR-017)
- [ ] 3.4b Trasferimenti ai familiari: destinatario, categorie `transfer`, riga nel riepilogo (ADR-015)
- [ ] 3.3 Cose da fare: lista, responsabile, scadenza, ricorrenza
- [ ] 3.4 UI per conti personali/condivisi, override per singolo movimento e cambio di visibilità di un conto con anteprima (ADR-015)
- [ ] 3.5 PWA: manifest, icone, service worker; istruzioni di installazione (dipende da **Q3**)
- [ ] 3.5b Reset password via email e conferma email attiva in produzione (prerequisito del deploy)
- [ ] 3.6 Deploy su Vercel + progetto Supabase di produzione
- **Uscita:** tutte e 4 hanno l'app sulla schermata home e l'hanno usata per un mese.

**Fase 4 · Produzione e presentazione**
- [ ] 4.1 Sentry + log strutturati degli import
- [ ] 4.2 Backup notturno cifrato + prova di ripristino documentata
- [ ] 4.3 Pagina metriche (§12)
- [ ] 4.4 ADR in `docs/adr/`, README completo, script di seed con dati finti, demo pubblica
- **Uscita:** repository presentabile, righe del CV completate con numeri reali.

---

## 14. Architecture Decision Records

Questa tabella è l'**indice**. Ogni riga, quando la decisione viene presa nel merito, diventa anche un file in `docs/adr/NNNN-titolo.md`, scritto sul template `docs/adr/TEMPLATE.md` (contesto, decisione, alternative scartate, conseguenze). Le prime dieci righe sono già decise nel corpo del documento; i file vanno creati la prima volta che il task collegato viene affrontato, non tutti insieme ora.

| # | Titolo | Decisione in breve |
|---|---|---|
| ADR-001 | App essenziale (budget + cose da fare) invece di un assistente personale completo | Scope ridotto a budget + cose da fare; niente dati personali sensibili nel sistema condiviso |
| ADR-002 | Monolite Next.js | Un solo deployable; niente backend separato |
| ADR-003 | TypeScript strict | Leggibilità e verifica per un codice destinato ad altri lettori |
| ADR-004 | Supabase con RLS | Sicurezza nel database; autenticazione inclusa |
| ADR-005 | Importi in centesimi interi | Niente errori di arrotondamento |
| ADR-006 | Import CSV invece di PSD2 | Universale, gratuito, senza contratti |
| ADR-007 | Classificazione ibrida regole + LLM | Costo decrescente nel tempo, output controllato |
| ADR-008 | Mappatura del formato via AI una sola volta per banca | Parsing deterministico dopo il primo import |
| ADR-009 | Hash con indice di occorrenza | Idempotenza senza perdere i movimenti identici legittimi |
| ADR-010 | PWA invece di app native | Una codebase, niente store |
| ADR-011 | Documentazione in quattro documenti separati (DESIGN_DOC, ADR, CHANGELOG, CLAUDE.md) | Ognuno con un compito e una cadenza di aggiornamento diversi |
| ADR-012 | Linguaggio visivo "Liquid Glass" (iOS/macOS) sulla palette B1, con campione dark mode | Materiali vetro/blur invece dei colori di sistema iOS; due schermate campione fissano i token del tema scuro |
| ADR-013 | Unificazione delle schermate "Movimenti" e "Importa" | Un solo "+" per aggiungere un movimento (manuale o import); nav da 4 a 3 voci |
| ADR-014 | Nessuna policy INSERT su households/members finché non esiste l'onboarding | Evita una finestra di sicurezza; il bootstrap del primo admin è compito del task 0.7 |
| ADR-015 | Conti personali/condivisi, visibilità ereditata dal conto con override per movimento | Modella la famiglia italiana (un conto paga per tutti); import indirizzati al conto |
| ADR-016 | Admin multipli con un admin principale (`households.owner_id`) | Più admin senza cambiare `is_admin()`; azioni distruttive riservate al principale |
| ADR-017 | Categorie nascoste (`is_hidden`) e `kind = 'excluded'` | Personalizzabili senza perdere lo storico; B&B fuori dai riepiloghi |
| ADR-018 | Vista Personale e budget personali (`budgets.member_id`) | Ogni membro ha il proprio budget su tutti i movimenti dei propri conti; Famiglia e Personale sono lenti diverse, mai sommate |
| ADR-019 | Colonne immutabili con grant a livello di colonna | La RLS sceglie le righe, i grant scelgono le colonne: nessuno riassegna `owner_id` e simili |
| ADR-020 | Test RLS con Postgres diretto (`SET ROLE`) più smoke test via API | Veloci, errori verificati per SQLSTATE; la catena JWT→`auth.uid()` provata da pochi test end-to-end |
| ADR-021 | Email + password; sessione con `@supabase/ssr`; `getUser()` come controllo autorevole | Funziona nella PWA iOS; il proxy filtra solo in modo ottimistico |
| ADR-022 | Funzione `create_household` (`security definer`) con regola «un solo nucleo» | Onboarding senza service role nell'app; l'estraneo che trova l'app non può aprire un nucleo |
| ADR-023 | Creare un invito è un INSERT ordinario; solo `accept_invite` è `security definer` | Solo chi accetta ha il problema di bootstrap di ADR-022; creare un invito lo fa già un admin |

---

## 15. Prerequisiti e account

### 15.1 Chiave API Anthropic con credito e limite di spesa

La chiave API è **separata dagli abbonamenti Claude** (Pro/Max): si paga a consumo con credito prepagato.

1. Creare l'account su **platform.claude.com** (Console).
2. **Caricare il credito** da *Settings → Billing*. Si pagano solo le chiamate riuscite; il credito **scade dopo un anno** e **non è rimborsabile**, quindi all'inizio poco. **Ricarica automatica spenta**: così il credito stesso fa da tetto.
3. Creare un **workspace dedicato** (es. "budgFam") in *Settings → Workspaces*: sul Default Workspace non si possono impostare limiti.
4. Nel workspace, scheda **Spend limits**: **limite mensile** e **avvisi email**. Non può superare il limite dell'organizzazione, che resta comunque valido.
5. Creare la **chiave dentro quel workspace** (*Settings → API keys*). Copiarla subito: non si vede più per intero. Trattarla come una password; se esposta, revocarla.

### 15.2 Altri account

- **Supabase** (piano gratuito).
- **Vercel** (piano Hobby, adatto a uso non commerciale).
- **GitHub** (repository + Actions).
- *(Fase 2)* **Telegram** per il bot.

### 15.3 Strumenti locali

- Node.js (LTS), pnpm, Docker (per Supabase locale), Supabase CLI.
- Claude Code come agente di sviluppo.

---

## 16. Presentazione come progetto (CV)

### 16.1 Nel CV

Due o tre righe con numeri, non un elenco di tecnologie. Bozza, **da completare con numeri misurati**:

> **budgFam** — PWA multi-utente (Next.js, TypeScript, Postgres/Supabase) usata quotidianamente da 4 persone. Pipeline di import idempotente per N formati bancari; classificatore ibrido regole+LLM valutato su un set etichettato (X% accuratezza, costo Y per movimento); sicurezza a livello di riga testata in CI.

### 16.2 Nel repository

- **README** leggibile in 2 minuti: problema, architettura, decisioni, risultati, link alla demo.
- **ADR** in `docs/adr/`.
- **Risultati delle eval** versionati.
- Storia di **pull request** descrittive.

### 16.3 Onestà sul metodo

Il processo di selezione di Bending Spoons è tecnico e rigoroso: **ogni riga e ogni scelta devono essere difendibili a colloquio**. Regole di lavoro:

- le **decisioni** le prende l'autore; questo documento è un punto di partenza da mettere in discussione;
- il codice si costruisce **a pezzi piccoli**, riletti e capiti prima di andare avanti;
- le parti centrali (parser, dedup, policy RLS) vanno scritte o riscritte dall'autore;
- l'uso dell'AI nello sviluppo si dichiara con trasparenza: usarla bene è una competenza, presentarla come lavoro proprio no.

---

## 17. Domande aperte

Quando una domanda riceve risposta: aggiornare lo stato e scrivere la risposta qui, poi le sezioni che ne dipendono.

| # | Domanda | Perché serve | Blocca | Stato |
|---|---|---|---|---|
| Q1 | Quali **banche e carte** usiamo? | Formati di import e fixture | 1.1, 3.1 | **Risolta**: in famiglia Revolut, UniCredit, Findomestic, Trade Republic. Il parser DEVE restare estensibile (un `BankFormat` per banca) per riconoscere il maggior numero possibile di formati |
| Q2 | Quanto usiamo i **contanti**? | Serve un inserimento manuale rapido? | 3.1 | **Risolta**: uso frequente, serve inserimento rapidissimo (importo + categoria, a portata di mano) |
| Q3 | Che **telefoni** hanno mamma e sorelle (iPhone/Android)? | Istruzioni PWA, notifiche | 3.5 | **Risolta**: tutti iPhone. PWA da Safari ("Aggiungi a Home"); notifiche push limitate, non farci affidamento |
| Q4 | **Chi vede cosa**: tutto condiviso o anche spese private? | Default di `visibility` | 3.4 | **Risolta**: privato di default, ma con **conti** personali o condivisi (anche se non cointestati) che fanno da default per i loro movimenti; override per singolo movimento. Vedi ADR-015 |
| Q5 | Le entrate/uscite del **B&B** passano dagli stessi conti? | Va tenuto separato: conto dedicato o categoria di esclusione | 3.1 | **Risolta**: stessi conti, si usa una **categoria di esclusione** (i movimenti B&B restano importati ma fuori dai riepiloghi) |
| Q6 | Quali **categorie** iniziali? | Seed del database e golden set | 1.6, 2.6 | **Risolta**: elenco standard in §6.1; personalizzabile (aggiungere/nascondere, ADR-017) |
| Q7 | Budget mensile per categoria: chi lo decide e con quali cifre? | Funzione budget | 3.2 | **Risolta in parte**: i budget **familiari** li modificano gli **admin**, quelli **personali** solo il proprietario (più admin, uno principale: ADR-016). Le cifre si fissano nel task 3.2, guardando le spese reali |

---

## 18. Fonti

- [How do I pay for my Claude API usage? — Claude Help Center](https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage)
- [Workspaces — Claude Platform Docs](https://platform.claude.com/docs/en/manage-claude/workspaces)
- [Spend Limits API — Claude Platform Docs](https://platform.claude.com/docs/en/manage-claude/spend-limits-api)
- [Backend engineering — The Bending Spoons way](https://medium.com/bendingspoons/backend-engineering-the-bending-spoons-way-80a845f3c075)
- [Our vision of a Bending Spoons software engineer](https://medium.com/bendingspoons/our-vision-of-a-bending-spoons-software-engineer-5dd2934a21da)
- [Twisting the rules of building software: Bending Spoons — The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/twisting-the-rules-of-building-software)
- [Software engineer — Bending Spoons Jobs](https://jobs.bendingspoons.com/positions/69c3ec6cf2164aed6ede175b)
