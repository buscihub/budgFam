import { describe, expect, it } from 'vitest';
import {
  computeMonthlySummary,
  type SummaryCategory,
  type SummaryTransaction,
} from './monthly-summary';

const categories: SummaryCategory[] = [
  { id: 'salary', name: 'Stipendio', kind: 'income' },
  { id: 'groceries', name: 'Spesa alimentare', kind: 'expense' },
  { id: 'rent', name: 'Casa', kind: 'expense' },
  { id: 'allowance', name: 'Paghetta', kind: 'transfer' },
  { id: 'bnb', name: 'B&B', kind: 'excluded' },
];

describe('computeMonthlySummary', () => {
  it('returns all zeros and an empty breakdown for an empty month', () => {
    const summary = computeMonthlySummary([], categories);
    expect(summary).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      byCategory: [],
    });
  });

  it('sums income-only transactions, balance equal to income', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: 250000, categoryId: 'salary' },
      { amountCents: 10000, categoryId: 'salary' },
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.incomeCents).toBe(260000);
    expect(summary.expenseCents).toBe(0);
    expect(summary.balanceCents).toBe(260000);
    expect(summary.byCategory).toEqual([
      { categoryId: 'salary', categoryName: 'Stipendio', kind: 'income', totalCents: 260000 },
    ]);
  });

  it('sums expense-only transactions, balance negative, amounts kept negative', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: -4500, categoryId: 'groceries' },
      { amountCents: -90000, categoryId: 'rent' },
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.incomeCents).toBe(0);
    expect(summary.expenseCents).toBe(-94500);
    expect(summary.balanceCents).toBe(-94500);
    expect(summary.byCategory).toEqual([
      { categoryId: 'rent', categoryName: 'Casa', kind: 'expense', totalCents: -90000 },
      {
        categoryId: 'groceries',
        categoryName: 'Spesa alimentare',
        kind: 'expense',
        totalCents: -4500,
      },
    ]);
  });

  it('computes balance as income + expense (signed) with mixed categories', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: 200000, categoryId: 'salary' },
      { amountCents: -30000, categoryId: 'groceries' },
      { amountCents: -70000, categoryId: 'rent' },
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.incomeCents).toBe(200000);
    expect(summary.expenseCents).toBe(-100000);
    expect(summary.balanceCents).toBe(100000);
  });

  it('ignores transactions in an excluded-kind category entirely', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: 200000, categoryId: 'salary' },
      { amountCents: -5000, categoryId: 'bnb' },
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.incomeCents).toBe(200000);
    expect(summary.expenseCents).toBe(0);
    expect(summary.balanceCents).toBe(200000);
    expect(summary.byCategory).toEqual([
      { categoryId: 'salary', categoryName: 'Stipendio', kind: 'income', totalCents: 200000 },
    ]);
  });

  it('excludes transfer-kind transactions from totals and breakdown (DESIGN_DOC §6.1)', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: 200000, categoryId: 'salary' },
      { amountCents: -5000, categoryId: 'allowance' },
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.incomeCents).toBe(200000);
    expect(summary.expenseCents).toBe(0);
    expect(summary.balanceCents).toBe(200000);
    expect(summary.byCategory).toEqual([
      { categoryId: 'salary', categoryName: 'Stipendio', kind: 'income', totalCents: 200000 },
    ]);
  });

  it('groups uncategorized transactions by sign and sums them into one row', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: -1200, categoryId: null },
      { amountCents: 500, categoryId: null },
      { amountCents: -300, categoryId: 'unknown-id' }, // not in categories list
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.incomeCents).toBe(500);
    expect(summary.expenseCents).toBe(-1500);
    expect(summary.balanceCents).toBe(-1000);
    expect(summary.byCategory).toEqual([
      { categoryId: null, categoryName: 'Non categorizzato', kind: null, totalCents: -1000 },
    ]);
  });

  it('sorts the breakdown by absolute amount, largest first', () => {
    const transactions: SummaryTransaction[] = [
      { amountCents: -1000, categoryId: 'groceries' },
      { amountCents: 500000, categoryId: 'salary' },
      { amountCents: -50000, categoryId: 'rent' },
    ];
    const summary = computeMonthlySummary(transactions, categories);
    expect(summary.byCategory.map((row) => row.categoryId)).toEqual([
      'salary',
      'rent',
      'groceries',
    ]);
  });
});
