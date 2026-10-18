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
  transactions: svg(
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </>,
  ),
  tasks: svg(
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <path d="M8 12l3 3 5-6" />
    </>,
  ),
};

const ITEMS = [
  { href: '/riepilogo', label: 'Riepilogo', icon: ICONS.summary },
  { href: '/movimenti', label: 'Movimenti', icon: ICONS.transactions },
] as const;

// Three entries and no more (ADR-013). Settings and the family row of the
// desktop mockups arrive with their own tasks (ADR-026).
export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Navigazione principale" className={styles.nav}>
      <div className={styles.brand}>budgFam</div>
      {ITEMS.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={styles.item}
          aria-current={isActive(href) ? 'page' : undefined}
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
