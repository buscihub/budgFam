'use client';

import { useRef } from 'react';
import type { Category } from '@/data/categories';
import { CheckIcon, CloseIcon } from '../../icons';
import styles from './category-picker.module.css';

const SPECIAL_HINT: Partial<Record<Category['kind'], string>> = {
  transfer: 'Non conta come spesa',
  excluded: 'Esclusa dai totali',
};

// The "Categoria" sheet of the mockups: ordinary categories first, then the
// special ones. Which group a category falls in depends on its `kind`, never
// on its name (ADR-031). Opened with `popovertarget={id}` from a button; it
// closes on choosing, on the ✕ and on a click outside, with no JavaScript
// beyond the click handler that reports the choice.
export function CategoryPicker({
  id,
  categories,
  value,
  onSelect,
  allowNone = false,
}: {
  id: string;
  categories: Category[];
  value: string | null;
  onSelect: (categoryId: string | null) => void;
  allowNone?: boolean;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const ordinary = categories.filter((c) => c.kind === 'expense' || c.kind === 'income');
  const special = categories.filter((c) => c.kind === 'transfer' || c.kind === 'excluded');

  const choose = (categoryId: string | null) => {
    onSelect(categoryId);
    sheet.current?.hidePopover();
  };

  const option = (categoryId: string | null, label: string, hint?: string) => (
    <button
      key={categoryId ?? 'none'}
      type="button"
      className={`${styles.option} ${value === categoryId ? styles.selected : ''}`}
      aria-pressed={value === categoryId}
      onClick={() => choose(categoryId)}
    >
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {value === categoryId && <CheckIcon />}
    </button>
  );

  return (
    <div id={id} ref={sheet} popover="auto" className={`${styles.sheet} glass-sheet`}>
      <div className={styles.body}>
        <div className={styles.header}>
          <span>Categoria</span>
          <button
            type="button"
            className="glass-btn"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label="Chiudi"
          >
            <CloseIcon />
          </button>
        </div>

        <div>
          <div className={styles.heading}>Categorie</div>
          <div className={`glass-card ${styles.group}`}>
            {allowNone && option(null, 'Senza categoria')}
            {ordinary.map((c) => option(c.id, c.name))}
          </div>
        </div>

        {special.length > 0 && (
          <div>
            <div className={styles.heading}>Speciali</div>
            <div className={`glass-card ${styles.group}`}>
              {special.map((c) => option(c.id, c.name, SPECIAL_HINT[c.kind]))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
