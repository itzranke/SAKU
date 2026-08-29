/**
 * balances.ts — Derives account balances, aggregates (net worth) and recent
 * journal "display rows" purely from append-only journals. This is the ONLY
 * sanctioned way to read money out of the engine: balances are NEVER stored raw.
 */
import {
  AccountDef,
  ASSET_ACCOUNT_TYPES,
  JournalRecord,
  LIABILITY_ACCOUNT_TYPES,
} from './index';

export interface AccountBalance {
  code: string;
  name: string;
  type: string;
  currency: string;
  /** Sum of signed amounts in the account's native currency (same-currency legs only). */
  balanceNative: number;
  /** Sum of amount * exchangeRate in base currency (IDR). */
  balanceBaseIDR: number;
  lastEntryAt?: string;
}

export function computeAccountBalances(
  accounts: AccountDef[],
  journals: JournalRecord[]
): AccountBalance[] {
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const acc = new Map<string, AccountBalance>();
  for (const a of accounts) {
    acc.set(a.code, {
      code: a.code,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balanceNative: 0,
      balanceBaseIDR: 0,
    });
  }
  for (const j of journals) {
    for (const e of j.entries) {
      const b = acc.get(e.accountCode);
      if (!b) continue; // unknown leg account -> ignored by derivation, but journal stays immutable
      b.balanceBaseIDR += e.amount * (e.exchangeRate ?? 1);
      if (e.currency.toUpperCase() === b.currency.toUpperCase()) {
        b.balanceNative += e.amount;
      }
      b.lastEntryAt = j.postedAt;
    }
  }
  const round = (n: number) => Number(n.toFixed(4));
  for (const b of acc.values()) {
    b.balanceNative = round(b.balanceNative);
    b.balanceBaseIDR = round(b.balanceBaseIDR);
  }
  void byCode;
  return [...acc.values()];
}

export interface JournalDisplayRow {
  id: string;
  date: string;
  description: string;
  source: string;
  type: string; // INCOME | EXPENSE | TRANSFER | TRADING_PROFIT
  account: string; // primary non-P&L account touched (name)
  amount: number; // signed, base currency for display (negative = money out of the primary account)
  currency: string;
  category?: string;
}

/**
 * Chooses the "primary" leg of a journal for the transaction list:
 * the first asset/liability leg (P&L + equity legs are excluded because they
 * are the accounting counterpart, not what the user perceives as "the money").
 */
export function journalToDisplayRow(journal: JournalRecord, accounts: AccountDef[]): JournalDisplayRow {
  const typeOf = new Map(accounts.map((a) => [a.code, a]));
  const nameOf = new Map(accounts.map((a) => [a.code, a.name]));
  const primary =
    journal.entries.find((e) => {
      const a = typeOf.get(e.accountCode);
      return a && (LIABILITY_ACCOUNT_TYPES.has(a.type as never) || ASSET_ACCOUNT_TYPES.has(a.type as never)) && e.amount < 0;
    }) ??
    journal.entries.find((e) => {
      const a = typeOf.get(e.accountCode);
      return a && (LIABILITY_ACCOUNT_TYPES.has(a.type as never) || ASSET_ACCOUNT_TYPES.has(a.type as never));
    }) ??
    journal.entries[0];
  const acc = primary ? typeOf.get(primary.accountCode) : undefined;
  const signed = primary ? primary.amount * (primary.exchangeRate ?? 1) : 0;
  // Sign is the raw ledger sign of the primary leg in base currency:
  // debit (+) on an asset = money in, credit (-) = money out; liability credit (-) reads as debt added.
  return {
    id: journal.id,
    date: journal.date,
    description: journal.description,
    source: journal.source,
    type: journal.txType ?? (journal.source === 'MT5_SYNC' ? 'TRADING_PROFIT' : 'EXPENSE'),
    account: primary ? (nameOf.get(primary.accountCode) ?? primary.accountCode) : '—',
    amount: signed,
    currency: 'IDR',
    category: journal.category,
  };
}

export interface LedgerSnapshot {
  workspaceId: string;
  baseCurrency: 'IDR';
  accounts: AccountBalance[];
  totals: {
    totalAssetsIDR: number;
    totalDebtsIDR: number;
    netWorthIDR: number;
    journalCount: number;
    liquidityCashIDR: number;
  };
  recentJournals: JournalDisplayRow[];
  generatedAt: string;
}

export function buildLedgerSnapshot(
  workspaceId: string,
  accounts: AccountDef[],
  journals: JournalRecord[],
  opts: { recentLimit?: number } = {}
): LedgerSnapshot {
  const balances = computeAccountBalances(accounts, journals);
  const typeByCode = new Map(accounts.map((a) => [a.code, a.type]));

  let totalAssetsIDR = 0;
  let totalDebtsIDR = 0;
  let liquidityCashIDR = 0;
  for (const b of balances) {
    const t = typeByCode.get(b.code)!;
    if (ASSET_ACCOUNT_TYPES.has(t as never)) {
      totalAssetsIDR += b.balanceBaseIDR;
      if (t === 'BANK' || t === 'CASH' || t === 'EWALLET') liquidityCashIDR += b.balanceBaseIDR;
    } else if (LIABILITY_ACCOUNT_TYPES.has(t as never)) {
      totalDebtsIDR += Math.abs(b.balanceBaseIDR);
    }
  }
  const r = (n: number) => Math.round(n);
  totalAssetsIDR = r(totalAssetsIDR);
  totalDebtsIDR = r(totalDebtsIDR);
  liquidityCashIDR = r(liquidityCashIDR);

  const recentLimit = opts.recentLimit ?? 25;
  const recentJournals = journals
    .slice(-recentLimit)
    .reverse()
    .map((j) => journalToDisplayRow(j, accounts));

  return {
    workspaceId,
    baseCurrency: 'IDR',
    accounts: balances,
    totals: {
      totalAssetsIDR,
      totalDebtsIDR,
      netWorthIDR: totalAssetsIDR - totalDebtsIDR,
      journalCount: journals.length,
      liquidityCashIDR,
    },
    recentJournals,
    generatedAt: new Date().toISOString(),
  };
}
