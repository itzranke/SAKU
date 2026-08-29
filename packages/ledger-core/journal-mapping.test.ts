import { describe, expect, it } from 'vitest';
import {
  buildDraftJournalFromTransaction,
  buildJournalLegs,
  resolveAccount,
  UnknownAccountError,
} from './journal-mapping';
import { AccountDef, validateJournalEntries } from './index';

const ACCOUNTS: AccountDef[] = [
  { code: '1010', name: 'Bank BCA', type: 'BANK', currency: 'IDR' },
  { code: '1400', name: 'MetaTrader 5 Forex Account', type: 'TRADING', currency: 'USD' },
  { code: '3000', name: "Owner's Equity", type: 'OWNERS_EQUITY', currency: 'IDR' },
  { code: '4000', name: 'Income', type: 'INCOME', currency: 'IDR' },
  { code: '4100', name: 'Trading Income', type: 'INCOME', currency: 'IDR' },
  { code: '5000', name: 'Expenses', type: 'EXPENSE', currency: 'IDR' },
];

describe('journal-mapping (UX transaction -> double-entry legs)', () => {
  it('INCOME debits the account and credits income, and the journal balances', () => {
    const legs = buildJournalLegs(
      { amount: 35_000_000, type: 'INCOME', description: 'Gaji', account: 'Bank BCA' },
      ACCOUNTS
    );
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({ accountId: '1010', amount: 35_000_000 });
    expect(legs[1]).toMatchObject({ accountId: '4000', amount: -35_000_000 });
    expect(validateJournalEntries(legs).isValid).toBe(true);
  });

  it('EXPENSE debits the expense bucket and credits the account', () => {
    const legs = buildJournalLegs(
      { amount: 1_250_000, type: 'EXPENSE', description: 'Listrik', account: 'Bank BCA', category: 'Tagihan' },
      ACCOUNTS
    );
    expect(legs[0].accountId).toBe('5000');
    expect(legs[1].accountId).toBe('1010');
    expect(validateJournalEntries(legs).isValid).toBe(true);
  });

  it('TRANSFER moves value between accounts', () => {
    const legs = buildJournalLegs(
      { amount: 15_500_000, type: 'TRANSFER', description: 'Top-up broker', account: 'Bank BCA', targetAccount: 'MetaTrader 5 Forex Account' },
      ACCOUNTS
    );
    expect(legs[0].accountId).toBe('1400');
    expect(legs[1].accountId).toBe('1010');
    expect(validateJournalEntries(legs).isValid).toBe(true);
  });

  it('TRADING_PROFIT with USD legs balances in base IDR via exchange rate', () => {
    const legs = buildJournalLegs(
      { amount: 480, type: 'TRADING_PROFIT', description: 'EURUSD +480', account: 'MetaTrader 5 Forex Account', currency: 'USD' },
      ACCOUNTS
    );
    const v = validateJournalEntries(legs);
    expect(v.isValid).toBe(true);
    expect(v.totalDebits).toBeCloseTo(480 * 15500, 2);
  });

  it('negative TRADING_PROFIT (loss) flips debit/credit', () => {
    const legs = buildJournalLegs(
      { amount: -120, type: 'TRADING_PROFIT', description: 'XAUUSD loss', account: 'MetaTrader 5 Forex Account', currency: 'USD' },
      ACCOUNTS
    );
    expect(legs[0].accountId).toBe('5000');
    expect(legs[0].amount).toBe(120 * 15500);
    expect(legs[1].accountId).toBe('1400');
    expect(validateJournalEntries(legs).isValid).toBe(true);
  });

  it('rejects unknown accounts and unvalidated zero amounts', () => {
    expect(() => resolveAccount(ACCOUNTS, 'Bank Tidak Ada')).toThrow(UnknownAccountError);
    expect(() =>
      buildJournalLegs({ amount: 0, type: 'INCOME', description: 'x', account: 'Bank BCA' }, ACCOUNTS)
    ).toThrow(/positive/);
  });

  it('buildDraftJournalFromTransaction carries metadata and passes validation', () => {
    const draft = buildDraftJournalFromTransaction(
      { amount: 50_000, type: 'EXPENSE', description: 'Kopi', account: '1010', category: 'Makanan' },
      ACCOUNTS,
      'STATEMENT_IMPORT'
    );
    expect(draft.source).toBe('STATEMENT_IMPORT');
    expect(draft.category).toBe('Makanan');
    expect(draft.validation.isValid).toBe(true);
  });
});
