import { describe, expect, it } from 'vitest';
import { buildLedgerSnapshot, computeAccountBalances, journalToDisplayRow } from './balances';
import { AccountDef, JournalRecord } from './index';

const ACCOUNTS: AccountDef[] = [
  { code: '1010', name: 'Bank BCA', type: 'BANK', currency: 'IDR' },
  { code: '1400', name: 'MetaTrader 5 Forex Account', type: 'TRADING', currency: 'USD' },
  { code: '2010', name: 'BCA Credit Card', type: 'CREDIT_CARD', currency: 'IDR' },
  { code: '3000', name: "Owner's Equity", type: 'OWNERS_EQUITY', currency: 'IDR' },
  { code: '4000', name: 'Income', type: 'INCOME', currency: 'IDR' },
  { code: '4100', name: 'Trading Income', type: 'INCOME', currency: 'IDR' },
  { code: '5000', name: 'Expenses', type: 'EXPENSE', currency: 'IDR' },
];

function j(id: string, entries: JournalRecord['entries'], txType?: string): JournalRecord {
  return {
    id,
    postedAt: `2026-08-29T00:00:${id}.000Z`,
    date: '2026-08-29',
    description: `journal ${id}`,
    source: 'MANUAL',
    txType: txType as never,
    entries,
  };
}

const JOURNALS: JournalRecord[] = [
  // Opening: 185M cash at BCA, 25.4k USD at broker (15500 rate), 149.77M credit-card debt.
  j('o1', [
    { accountCode: '1010', amount: 185_000_000, currency: 'IDR', exchangeRate: 1 },
    { accountCode: '1400', amount: 25_400, currency: 'USD', exchangeRate: 15500 },
    { accountCode: '2010', amount: -149_770_000, currency: 'IDR', exchangeRate: 1 },
    { accountCode: '3000', amount: -(185_000_000 + 25_400 * 15500 - 149_770_000), currency: 'IDR', exchangeRate: 1 },
  ]),
  // Salary 35M into BCA.
  j('s1', [
    { accountCode: '1010', amount: 35_000_000, currency: 'IDR', exchangeRate: 1 },
    { accountCode: '4000', amount: -35_000_000, currency: 'IDR', exchangeRate: 1 },
  ], 'INCOME'),
  // Trading profit 480 USD -> base 7.44M credited to 4100.
  j('m1', [
    { accountCode: '1400', amount: 480, currency: 'USD', exchangeRate: 15500 },
    { accountCode: '4100', amount: -480 * 15500, currency: 'IDR', exchangeRate: 1 },
  ], 'TRADING_PROFIT'),
];

describe('balances derivation (immutable ledger read model)', () => {
  it('derives native and base balances per account', () => {
    const b = computeAccountBalances(ACCOUNTS, JOURNALS);
    const bca = b.find((x) => x.code === '1010')!;
    expect(bca.balanceNative).toBe(220_000_000);
    const mt5 = b.find((x) => x.code === '1400')!;
    expect(mt5.balanceNative).toBe(25_400 + 480);
    expect(mt5.balanceBaseIDR).toBe(25_400 * 15500 + 480 * 15500);
  });

  it('net worth = assets - debts, P&L accounts excluded from totals', () => {
    const snap = buildLedgerSnapshot('ws-1', ACCOUNTS, JOURNALS);
    const assets = 220_000_000 + (25_400 + 480) * 15500;
    expect(snap.totals.totalAssetsIDR).toBe(Math.round(assets));
    expect(snap.totals.totalDebtsIDR).toBe(149_770_000);
    expect(snap.totals.netWorthIDR).toBe(Math.round(assets) - 149_770_000);
    expect(snap.totals.journalCount).toBe(3);
  });

  it('display rows pick the asset side, not the P&L counterpart', () => {
    const snap = buildLedgerSnapshot('ws-1', ACCOUNTS, JOURNALS);
    const [latest, mid, first] = snap.recentJournals; // reversed: newest first
    expect(latest.id).toBe('m1');
    expect(latest.account).toBe('MetaTrader 5 Forex Account');
    expect(latest.amount).toBe(480 * 15500);
    expect(mid.type).toBe('INCOME');
    expect(mid.amount).toBe(35_000_000);
    // Opening journal: credit-card leg is negative -> primary = liability leg, signed outflow
    expect(first.account).toBe('BCA Credit Card');
    expect(first.amount).toBe(-149_770_000);
  });

  it('journalToDisplayRow falls back to first leg for exotic journals', () => {
    const row = journalToDisplayRow(
      j('x1', [{ accountCode: '4000', amount: 1, currency: 'IDR', exchangeRate: 1 }]),
      ACCOUNTS
    );
    expect(row.account).toBe('Income');
  });
});
