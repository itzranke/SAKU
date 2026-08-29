/**
 * InMemoryLedgerRepository — dev/demo adapter. Boots with the SAKU default
 * Chart of Accounts (mirrors packages/database/seed.ts) plus an OPENING journal
 * and the historical demo journals, so the dashboard numbers are derived from
 * real journals instead of hardcoded sample state. Volatile by design: the
 * Prisma adapter (@saku/database) takes over when DATABASE_URL is present.
 */
import { Injectable } from '@nestjs/common';
import {
  AccountDef,
  buildJournalLegs,
  JournalRecord,
  LedgerEntryInput,
} from '@saku/ledger-core';
import {
  LedgerRepository,
  NewAccountInput,
  NewJournalInput,
} from './ledger.repository';

const SEED_ACCOUNTS: AccountDef[] = [
  { code: '1010', name: 'Bank BCA', type: 'BANK', currency: 'IDR', isActive: true },
  { code: '1020', name: 'Bank Mandiri', type: 'BANK', currency: 'IDR', isActive: true },
  { code: '1030', name: 'Bank BRI', type: 'BANK', currency: 'IDR', isActive: true },
  { code: '1110', name: 'GoPay', type: 'EWALLET', currency: 'IDR', isActive: true },
  { code: '1120', name: 'OVO', type: 'EWALLET', currency: 'IDR', isActive: true },
  { code: '1130', name: 'ShopeePay', type: 'EWALLET', currency: 'IDR', isActive: true },
  { code: '1200', name: 'Physical Cash Wallet', type: 'CASH', currency: 'IDR', isActive: true },
  { code: '1300', name: 'IDX Equities', type: 'INVESTMENT', currency: 'IDR', isActive: true },
  { code: '1400', name: 'MetaTrader 5 Forex', type: 'TRADING', currency: 'USD', isActive: true },
  { code: '2010', name: 'BCA Credit Card', type: 'CREDIT_CARD', currency: 'IDR', isActive: true },
  { code: '3000', name: "Owner's Equity", type: 'OWNERS_EQUITY', currency: 'IDR', isActive: true },
  { code: '4000', name: 'Pendapatan Umum', type: 'INCOME', currency: 'IDR', isActive: true },
  { code: '4100', name: 'Pendapatan Trading', type: 'INCOME', currency: 'IDR', isActive: true },
  { code: '5000', name: 'Beban Umum', type: 'EXPENSE', currency: 'IDR', isActive: true },
];

interface SeedTx {
  id: string;
  date: string;
  description: string;
  source: 'MANUAL' | 'MT5_SYNC' | 'STATEMENT_IMPORT';
  txType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'TRADING_PROFIT';
  amount: number;
  account: string;
  targetAccount?: string;
  category?: string;
  currency?: string;
}

const SEED_JOURNALS: SeedTx[] = [
  { id: 'seed-open', date: '2026-08-01', description: 'Saldo Awal (Opening Balances)', source: 'MANUAL', txType: 'INCOME', amount: 0, account: '' },
  { id: 'seed-salary', date: '2026-08-28', description: 'Gaji Bulanan', source: 'MANUAL', txType: 'INCOME', amount: 35_000_000, account: 'Bank BCA' },
  { id: 'seed-transfer', date: '2026-08-28', description: 'Transfer ke MT5 Broker', source: 'MANUAL', txType: 'TRANSFER', amount: 15_500_000, account: 'Bank Mandiri', targetAccount: 'MetaTrader 5 Forex' },
  { id: 'seed-listrik', date: '2026-08-27', description: 'Pembayaran Tagihan Listrik', source: 'MANUAL', txType: 'EXPENSE', amount: 1_250_000, account: 'GoPay', category: 'Tagihan & Utilitas' },
  { id: 'seed-mt5', date: '2026-08-26', description: 'Profit Trade EURUSD (MT5)', source: 'MT5_SYNC', txType: 'TRADING_PROFIT', amount: 480, account: 'MetaTrader 5 Forex', currency: 'USD' },
];

@Injectable()
export class InMemoryLedgerRepository implements LedgerRepository {
  readonly workspaceId = 'default-workspace-id';
  private accounts: AccountDef[] = [...SEED_ACCOUNTS];
  private journals: JournalRecord[] = [];
  private seq = 0;

  constructor() {
    this.seedOpeningBalance();
    this.seedHistory();
  }

  private nextId(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${(this.seq++).toString(36)}`;
  }

  private pushJournal(input: NewJournalInput & { id?: string }): JournalRecord {
    const entries: JournalRecord['entries'] = input.entries.map((e) => ({
      accountCode: e.accountId,
      amount: e.amount,
      currency: e.currency ?? 'IDR',
      exchangeRate: e.exchangeRate ?? 1,
    }));
    const journal: JournalRecord = {
      id: input.id ?? this.nextId('jrnl'),
      postedAt: new Date(`${input.date}T00:00:00.000Z`).toISOString(),
      date: input.date,
      description: input.description,
      source: input.source,
      txType: input.txType,
      category: input.category,
      entries,
    };
    this.journals.push(journal);
    return journal;
  }

  /** Opening balances as a single balanced journal: assets (D) - liabilities (C) -> equity (C). */
  private seedOpeningBalance() {
    const opening: LedgerEntryInput[] = [
      { accountId: '1010', amount: 185_000_000, currency: 'IDR', exchangeRate: 1 },
      { accountId: '1020', amount: 60_000_000, currency: 'IDR', exchangeRate: 1 },
      { accountId: '1110', amount: 12_500_000, currency: 'IDR', exchangeRate: 1 },
      { accountId: '1200', amount: 3_000_000, currency: 'IDR', exchangeRate: 1 },
      { accountId: '1300', amount: 450_000_000, currency: 'IDR', exchangeRate: 1 },
      { accountId: '1400', amount: 25_400, currency: 'USD', exchangeRate: 15500 },
      { accountId: '2010', amount: -149_770_000, currency: 'IDR', exchangeRate: 1 },
    ];
    const baseSum = opening.reduce((s, e) => s + e.amount * (e.exchangeRate ?? 1), 0);
    opening.push({ accountId: '3000', amount: -baseSum, currency: 'IDR', exchangeRate: 1 });
    this.pushJournal({
      id: 'jrnl-opening',
      description: 'Saldo Awal — Double-Entry Opening Journal (SAKU seed)',
      date: '2026-08-01',
      source: 'RECONCILIATION',
      entries: opening,
    });
  }

  private seedHistory() {
    for (const tx of SEED_JOURNALS) {
      if (tx.id === 'seed-open') continue; // opening handled above
      const legs = buildJournalLegs(
        {
          amount: tx.amount,
          type: tx.txType,
          description: tx.description,
          account: tx.account,
          targetAccount: tx.targetAccount,
          category: tx.category,
          currency: tx.currency,
        },
        this.accounts
      );
      this.pushJournal({
        id: `jrnl-${tx.id}`,
        description: tx.description,
        date: tx.date,
        source: tx.source,
        txType: tx.txType,
        category: tx.category,
        entries: legs,
      });
    }
  }

  listAccounts(): Promise<AccountDef[]> {
    return Promise.resolve(this.accounts.map((a) => ({ ...a })));
  }

  findAccount(nameOrCode: string): AccountDef | undefined {
    const q = (nameOrCode ?? '').trim().toLowerCase();
    return this.accounts.find((a) => a.code.toLowerCase() === q || a.name.toLowerCase() === q);
  }

  private async findAccountAsync(nameOrCode: string): Promise<AccountDef | undefined> {
    return this.findAccount(nameOrCode);
  }

  addAccount(input: NewAccountInput): Promise<AccountDef> {
    if (this.findAccount(input.name)) {
      throw new Error(`Account name "${input.name}" already exists.`);
    }
    let code = input.code;
    if (!code) {
      let n = 1140;
      while (this.accounts.some((a) => a.code === String(n))) n += 10;
      code = String(n);
    } else if (this.accounts.some((a) => a.code === code)) {
      throw new Error(`Account code "${code}" already exists.`);
    }
    const acc: AccountDef = {
      code,
      name: input.name,
      type: input.type,
      currency: (input.currency ?? 'IDR').toUpperCase(),
      isActive: true,
    };
    this.accounts.push(acc);
    return Promise.resolve({ ...acc });
  }

  appendJournal(input: NewJournalInput): Promise<JournalRecord> {
    return Promise.resolve(this.pushJournal(input));
  }

  listJournals(limit?: number): Promise<JournalRecord[]> {
    if (!limit || limit >= this.journals.length) return Promise.resolve(this.journals.map((j) => ({ ...j })));
    return Promise.resolve(this.journals.slice(-limit).map((j) => ({ ...j })));
  }
}
