'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './shell.module.css';

const svg = (children: ReactNode) => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS = {
  summary: svg(
    <>
      <rect x="4" y="12" width="4" height="8" rx="2" />
      <rect x="10" y="7" width="4" height="13" rx="2" />
      <rect x="16" y="3" width="4" height="17" rx="2" />
    </>,
  ),
  accounts: svg(
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </>,
  ),
  tasks: svg(
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <path d="M8 12l3 3 5-6" />
    </>,
  ),
};

// `also`: other sections that live under the entry. "Tutti i movimenti" and the
// movement pages are part of Conti (ADR-035), so Conti stays highlighted there.
const ITEMS = [
  { href: '/riepilogo', label: 'Riepilogo', icon: ICONS.summary, also: [] },
  { href: '/conti', label: 'Conti', icon: ICONS.accounts, also: ['/movimenti'] },
] as const;

// Three entries and no more (ADR-013, ADR-035). Settings and the family row of
// the desktop mockups arrive with their own tasks (ADR-026).
export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isEntryActive = (href: string, also: readonly string[]) => [href, ...also].some(isActive);

  return (
    <nav aria-label="Navigazione principale" className={styles.nav}>
      <div className={styles.brand}>budgFam</div>
      {ITEMS.map(({ href, label, icon, also }) => (
        <Link
          key={href}
          href={href}
          className={styles.item}
          aria-current={isEntryActive(href, also) ? 'page' : undefined}
        >
          {icon}
          {label}
        </Link>
      ))}
      {/* The tasks list arrives in phase 3; the entry is shown so the
          three-item shell is already the final one. */}
      <span className={styles.item} aria-disabled="true" title="In arrivo">
        {ICONS.tasks}
        Cose da fare
      </span>
    </nav>
  );
}
