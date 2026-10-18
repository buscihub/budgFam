import Link from 'next/link';
import { listAccounts } from '@/data/accounts';
import { listCategories } from '@/data/categories';
import { requireMembership } from '@/data/households';
import { listTransactions } from '@/data/transactions';
import { formatCents } from '@/domain/budget/format-currency';
import { formatBookedOn } from '@/domain/transactions/dates';
import { parseTransactionFilters } from '@/domain/transactions/schemas';

export const metadata = { title: 'Movimenti · budgFam' };

// The list is a Server Component driven by the URL (?conto=…&categoria=…&daRivedere=1):
// filters are plain links/GET forms, so they work without JavaScript and every
// filtered view can be bookmarked.
export default async function MovimentiPage({ searchParams }: PageProps<'/movimenti'>) {
  await requireMembership();
  const filters = parseTransactionFilters(await searchParams);

  const [{ items, toReviewCount, truncated }, accounts, categories] = await Promise.all([
    listTransactions(filters),
    listAccounts(),
    listCategories({ includeHidden: true }),
  ]);
  const allAccounts = [...accounts.mine, ...accounts.sharedByOthers];
  const hasFilters = Boolean(filters.accountId || filters.categoryId || filters.onlyToReview);

  return (
    <main className="auth-page">
      <header className="page-header">
        <h1>Movimenti</h1>
        <Link href="/movimenti/nuovo" className="add-button" aria-label="Aggiungi movimento">
          +
        </Link>
      </header>

      {toReviewCount > 0 && !filters.onlyToReview && (
        <p className="banner">
          <Link href="/movimenti?daRivedere=1">{toReviewCount} movimenti da rivedere</Link>
        </p>
      )}

      <form method="get" className="filters">
        <label htmlFor="conto">Conto</label>
        <select id="conto" name="conto" defaultValue={filters.accountId ?? ''}>
          <option value="">Tutti i conti</option>
          {allAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <label htmlFor="categoria">Categoria</label>
        <select id="categoria" name="categoria" defaultValue={filters.categoryId ?? ''}>
          <option value="">Tutte le categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            name="daRivedere"
            value="1"
            defaultChecked={filters.onlyToReview}
          />{' '}
          Solo da rivedere
        </label>

        <button type="submit">Filtra</button>
        {hasFilters && <Link href="/movimenti">Azzera i filtri</Link>}
      </form>
      <p>
        <Link href="/conti">Gestisci conti</Link>
      </p>

      {items.length === 0 ? (
        <p>
          {hasFilters
            ? 'Nessun movimento corrisponde ai filtri.'
            : 'Non ci sono ancora movimenti. Aggiungine uno con il pulsante «+».'}
        </p>
      ) : (
        <ul className="tx-list">
          {items.map((tx) => (
            <li key={tx.id}>
              <Link href={`/movimenti/${tx.id}`}>
                <span className="tx-main">
                  <span>{tx.description}</span>
                  <span className="tx-meta">
                    {formatBookedOn(tx.bookedOn)} · {tx.categoryName ?? 'Senza categoria'}
                    {tx.accountName && ` · ${tx.accountName}`}
                    {tx.visibility === 'private' && ' · privato'}
                    {tx.needsReview && ' · da rivedere'}
                  </span>
                </span>
                <span className="tx-amount">{formatCents(tx.amountCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {truncated && (
        <p>Sono mostrati i 200 movimenti più recenti: usa i filtri per vedere gli altri.</p>
      )}
    </main>
  );
}
