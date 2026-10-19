import Link from 'next/link';
import { compareMonths, monthLabel, shiftMonth, type MonthKey } from '@/domain/transactions/months';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
import styles from './month-bar.module.css';

// The month ‹ › bar of Riepilogo and of the movements lists. Plain links, so it
// works without JavaScript and every month has its own address. `hrefFor` says
// where a month lives on the page that shows the bar; `current` is the current
// month in Europe/Rome (decided in src/data, where the clock is read): you
// cannot go past it.
export function MonthBar({
  month,
  current,
  hrefFor,
}: {
  month: MonthKey;
  current: MonthKey;
  hrefFor: (month: MonthKey) => string;
}) {
  const isCurrentMonth = compareMonths(month, current) >= 0;
  return (
    <div className={`${styles.monthbar} glass-bar`}>
      <Link
        href={hrefFor(shiftMonth(month, -1))}
        className="glass-btn"
        aria-label="Mese precedente"
      >
        <ChevronLeftIcon />
      </Link>
      <span>{monthLabel(month)}</span>
      <Link
        href={hrefFor(shiftMonth(month, 1))}
        className={`glass-btn ${styles.arrow}`}
        aria-label="Mese successivo"
        aria-disabled={isCurrentMonth}
        tabIndex={isCurrentMonth ? -1 : undefined}
      >
        <ChevronRightIcon size={16} />
      </Link>
    </div>
  );
}
