'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/riepilogo', label: 'Riepilogo' },
  { href: '/movimenti', label: 'Movimenti' },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Navigazione principale" className="app-nav">
      {ITEMS.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
          {label}
        </Link>
      ))}
      {/* The tasks list arrives with phase 3; the entry is shown so the
          three-item shell (ADR-013) is already the final one. */}
      <span aria-disabled="true" title="In arrivo">
        Cose da fare
      </span>
    </nav>
  );
}
