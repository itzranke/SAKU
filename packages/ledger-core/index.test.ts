import { describe, it, expect } from 'vitest';
import { validateJournalEntries, LedgerEntryInput } from './index';

describe('SAKU Double-Entry Ledger Engine', () => {
  it('should pass validation when debits strictly equal credits in base currency', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'bank-bca', amount: 5000000, currency: 'IDR' }, // Debit: Asset increases
      { accountId: 'income-salary', amount: -5000000, currency: 'IDR' }, // Credit: Income increases
    ];

    const result = validateJournalEntries(entries);
    expect(result.isValid).toBe(true);
    expect(result.totalDebits).toBe(5000000);
    expect(result.totalCredits).toBe(5000000);
    expect(result.imbalanceDelta).toBe(0);
  });

  it('should handle multi-currency conversions using exchange rates', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'broker-usd', amount: 100, currency: 'USD', exchangeRate: 15500 }, // Debit: $100 * 15500 = 1,550,000 IDR
      { accountId: 'bank-bca', amount: -1550000, currency: 'IDR', exchangeRate: 1.0 }, // Credit: 1,550,000 IDR
    ];

    const result = validateJournalEntries(entries);
    expect(result.isValid).toBe(true);
    expect(result.totalDebits).toBe(1550000);
    expect(result.totalCredits).toBe(1550000);
    expect(result.imbalanceDelta).toBe(0);
  });

  it('should reject unbalanced journal entries where debits != credits', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'bank-bca', amount: 5000000, currency: 'IDR' },
      { accountId: 'income-salary', amount: -4900000, currency: 'IDR' }, // Imbalance of 100,000
    ];

    const result = validateJournalEntries(entries);
    expect(result.isValid).toBe(false);
    expect(result.imbalanceDelta).toBe(100000);
    expect(result.error).toContain('Unbalanced Journal Entry');
  });

  it('should reject journals with fewer than two entry legs', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'bank-bca', amount: 5000000, currency: 'IDR' },
    ];

    const result = validateJournalEntries(entries);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least two leg entries');
  });
});
