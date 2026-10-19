import Link from 'next/link';
import { listAccounts } from '@/data/accounts';
import { listCategories } from '@/data/categories';
import { getCurrentMonthRome, listTransactions } from '@/data/transactions';
import { formatSignedCents } from '@/domain/budget/format-currency';
import { formatDayMonth } from '@/domain/transactions/dates';
import { humanizeDescription } from '@/domain/transactions/display';
import { countActiveFilters, transactionsHref } from '@/domain/transactions/filters-url';
import { formatMonthParam, monthLabel } from '@/domain/transactions/months';
import type { TransactionFilters } from '@/domain/transactions/schemas';
import { CloseIcon, FiltersIcon, LockIcon, PersonIcon, PlusIcon, WarningIcon } from '../../icons';
import { MonthBar } from '../month-bar';
import styles from './movimenti.module.css';

// The monthly list of movements, shared by "Tutti i movimenti" (/movimenti) and
// the page of one account (/conti/<id>), ADR-035. It is a Server Component
// driven by the URL (?mese=2026-09&conto=…&categoria=…&daRivedere=1): month
// arrows and filters are plain links and a GET form, so they work without
// JavaScript and every view can be bookmarked.
//
// `basePath` is the page that shows the list; `fixedAccount` is set on an
// account page, where the account is the path and the account filter is hidden.
export async function TransactionsView({
  filters,
  basePath,
  fixedAccountId,
  canAdd = true,
  canImport = true,
}: {
  filters: TransactionFilters;
  basePath: string;
  fixedAccountId?: string;
  // Off on the account of somebody else (read-only, ADR-025) and, for import,
  // on cash accounts (no file to import).
  canAdd?: boolean;
  canImport?: boolean;
}) {
  const [{ month, items, toReviewCount, latestBefore }, accounts, categories] = await Promise.all([
    listTransactions(fixedAccountId ? { ...filters, accountId: fixedAccountId } : filters),
    listAccounts(),
    listCategories({ includeHidden: true }),
  ]);
  const allAccounts = [...accounts.mine, ...accounts.sharedByOthers];
  const activeFilters = countActiveFilters(filters);
  const withMonth = { ...filters, month };
  const href = (patch: Partial<TransactionFilters> = {}) =>
    transactionsHref(withMonth, patch, basePath);
  // Where the person came from: the detail, add and import pages take it back
  // with them (checked by safeNextPath on the way in).
  const here = encodeURIComponent(href());
  const addQuery = `da=${here}${fixedAccountId ? `&conto=${fixedAccountId}` : ''}`;

  return (
    <>
      <div className={styles.top}>
        <MonthBar
          month={month}
          current={getCurrentMonthRome()}
          hrefFor={(m) => href({ month: m })}
        />

        <div className={styles.toolbar}>
          <button
            type="button"
            className={`glass-btn ${styles.filterButton}`}
            popoverTarget="filters"
            aria-label="Filtra"
          >
            <FiltersIcon />
            {activeFilters > 0 && <span className={styles.badge}>{activeFilters}</span>}
          </button>
          {canAdd && (
            <Link
              href={`/movimenti/nuovo?${addQuery}`}
              className={`btn-primary ${styles.addButton}`}
              aria-label="Aggiungi movimento"
              style={{ borderRadius: 999 }}
            >
              <PlusIcon />
            </Link>
          )}
        </div>
      </div>

      <div id="filters" popover="auto" className={`${styles.sheet} glass-sheet`}>
        <form method="get" action={basePath} className={styles.sheetBody}>
          <input type="hidden" name="mese" value={formatMonthParam(month)} />
          <div className={styles.sheetHeader}>
            <span>Filtri</span>
            <button
              type="button"
              className="glass-btn"
              popoverTarget="filters"
              popoverTargetAction="hide"
              aria-label="Chiudi"
            >
              <CloseIcon />
            </button>
          </div>

          {!fixedAccountId && (
            <div>
              <div className={styles.label}>Conto</div>
              <div className={styles.chips}>
                <label className="chip">
                  <input type="radio" name="conto" value="" defaultChecked={!filters.accountId} />
                  Tutti i conti
                </label>
                {allAccounts.map((account) => (
                  <label key={account.id} className="chip">
                    <input
                      type="radio"
                      name="conto"
                      value={account.id}
                      defaultChecked={filters.accountId === account.id}
                    />
                    {account.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={styles.label} htmlFor="categoria" style={{ display: 'block' }}>
              Categoria
            </label>
            <select
              id="categoria"
              name="categoria"
              className={styles.select}
              defaultValue={filters.categoryId ?? ''}
            >
              <option value="">Tutte le categorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <label className={styles.switchRow}>
            Solo da rivedere
            <input
              type="checkbox"
              role="switch"
              className="switch"
              name="daRivedere"
              value="1"
              defaultChecked={filters.onlyToReview}
            />
          </label>

          <div className={styles.sheetActions}>
            <button type="submit" className="btn-primary" style={{ padding: '15px 0' }}>
              Applica
            </button>
            {activeFilters > 0 && (
              <Link
                href={transactionsHref({ onlyToReview: false }, { month }, basePath)}
                style={{ padding: 12 }}
              >
                Azzera i filtri
              </Link>
            )}
          </div>
        </form>
      </div>

      {toReviewCount > 0 && !filters.onlyToReview && (
        <Link href={href({ onlyToReview: true })} className={`glass-banner ${styles.banner}`}>
          <span>
            <WarningIcon />
            {toReviewCount} {toReviewCount === 1 ? 'movimento' : 'movimenti'} da rivedere
          </span>
          <span>Rivedi</span>
        </Link>
      )}

      {items.length === 0 ? (
        <section className={`glass-card ${styles.empty}`}>
          {activeFilters > 0 ? (
            <>
              <h2>Nessun risultato</h2>
              <p>Nessun movimento di {monthLabel(month).toLowerCase()} corrisponde ai filtri.</p>
              <div className={styles.emptyActions}>
                <Link
                  href={transactionsHref({ onlyToReview: false }, { month }, basePath)}
                  className="glass-btn"
                >
                  Azzera i filtri
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>Nessun movimento</h2>
              {latestBefore && (
                <>
                  <p>Non ci sono movimenti a {monthLabel(month).toLowerCase()}.</p>
                  <div className={styles.emptyActions}>
                    <Link href={href({ month: latestBefore })} className="glass-btn">
                      Vai a {monthLabel(latestBefore).toLowerCase()}
                    </Link>
                  </div>
                </>
              )}
              {!latestBefore &&
                (canAdd ? (
                  <>
                    <p>
                      {canImport
                        ? 'Importa l’estratto conto di un conto oppure aggiungi una spesa a mano.'
                        : 'Aggiungi la prima spesa a mano.'}
                    </p>
                    <div className={styles.emptyActions}>
                      {canImport && (
                        <Link href={`/movimenti/importa?${addQuery}`} className="glass-btn">
                          Importa un file
                        </Link>
                      )}
                      <Link href={`/movimenti/nuovo?${addQuery}`} className="btn-primary">
                        <PlusIcon /> Aggiungi a mano
                      </Link>
                    </div>
                  </>
                ) : (
                  <p>Questo conto non ha movimenti visibili in questo mese.</p>
                ))}
            </>
          )}
        </section>
      ) : (
        <section
          className={`glass-card ${styles.listCard} ${fixedAccountId ? styles.noAccount : ''}`}
        >
          <div className={styles.head} aria-hidden="true">
            <span>Data</span>
            <span>Descrizione</span>
            <span>Categoria</span>
            <span className={styles.accountCell}>Conto</span>
            <span>Importo</span>
          </div>
          <ul className={styles.list} style={{ listStyle: 'none' }}>
            {items.map((tx) => {
              const { day, month: monthShort } = formatDayMonth(tx.bookedOn);
              return (
                <li key={tx.id}>
                  <Link href={`/movimenti/${tx.id}?da=${here}`} className={styles.row}>
                    <span className={styles.date}>
                      {day}
                      <br />
                      {monthShort}
                    </span>
                    <span className={styles.desc}>
                      {tx.visibility === 'private' && <LockIcon />}
                      <span>{humanizeDescription(tx.description)}</span>
                    </span>
                    <span className={styles.meta}>
                      {tx.needsReview ? (
                        <span className="pill pill-review">Da rivedere</span>
                      ) : (
                        <span className={tx.amountCents > 0 ? 'pill pill-accent' : 'pill'}>
                          {tx.categoryName ?? 'Senza categoria'}
                        </span>
                      )}
                      <span className={styles.accountCell}>
                        {tx.accountName ??
                          (!tx.isMine && tx.ownerName ? (
                            <>
                              <PersonIcon />
                              {tx.ownerName}
                            </>
                          ) : null)}
                      </span>
                    </span>
                    <span className={`${styles.amount} ${tx.amountCents > 0 ? styles.income : ''}`}>
                      {formatSignedCents(tx.amountCents)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
