/**
 * SAKU Immutable Double-Entry Ledger Core
 * Enforces: Sum(Debits * Rate) - Sum(Credits * Rate) === 0
 *
 * PRINCIPLES (hard rules for every consumer — api-core, apps/web, MT5 bridge):
 *  1. Saldo TIDAK PERNAH diedit langsung. Saldo adalah hasil derivasi dari jurnal debit/kredit.
 *  2. Jurnal bersifat APPEND-ONLY dan tidak seimbang = ditolak (lihat validateJournalEntries).
 *  3. Semua leg memakai nilai dasar (base): amount * exchangeRate. Base currency workspace: IDR.
 */

export interface LedgerEntryInput {
  accountId: string;
  amount: number; // Positive = Debit, Negative = Credit
  currency: string;
  exchangeRate?: number;
}

export interface JournalValidationResult {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  imbalanceDelta: number;
  error?: string;
}

/**
 * Validates whether a proposed ledger journal is balanced across debits and credits.
 */
export function validateJournalEntries(entries: LedgerEntryInput[]): JournalValidationResult {
  if (!entries || entries.length < 2) {
    return {
      isValid: false,
      totalDebits: 0,
      totalCredits: 0,
      imbalanceDelta: 0,
      error: 'A ledger journal entry must contain at least two leg entries (Debit and Credit).',
    };
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    const rate = entry.exchangeRate ?? 1.0;
    const baseValue = entry.amount * rate;

    if (entry.amount > 0) {
      totalDebits += baseValue;
    } else {
      totalCredits += Math.abs(baseValue);
    }
  }

  const delta = Math.abs(totalDebits - totalCredits);
  // Precision threshold for floating point comparison in JS (0.0001 base currency unit)
  const isValid = delta < 0.0001;

  return {
    isValid,
    totalDebits: Number(totalDebits.toFixed(4)),
    totalCredits: Number(totalCredits.toFixed(4)),
    imbalanceDelta: Number(delta.toFixed(4)),
    error: isValid ? undefined : `Unbalanced Journal Entry: Debits (${totalDebits}) != Credits (${totalCredits}). Delta: ${delta}`,
  };
}

// ---------------------------------------------------------------------------
// Shared domain types for the whole SAKU monorepo (api-core, web, database).
// Keep these types dependency-free: this package must stay pure & portable.
// ---------------------------------------------------------------------------

export type AccountType =
  | 'BANK'
  | 'EWALLET'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'INVESTMENT'
  | 'TRADING'
  | 'OWNERS_EQUITY'
  | 'INCOME'
  | 'EXPENSE';

export type SourceType =
  | 'MANUAL'
  | 'STATEMENT_IMPORT'
  | 'MT5_SYNC'
  | 'BOT_CAPTURE'
  | 'RECONCILIATION'
  /** Deprecated push bridge (SakuBridge.mq5). Audit provenance only (ADR-022). */
  | 'EA_LEGACY';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'TRADING_PROFIT';

export interface AccountDef {
  code: string;
  name: string;
  type: AccountType;
  currency: string;
  isActive?: boolean;
}

export interface JournalEntryRecord {
  accountCode: string;
  amount: number; // signed, positive = debit
  currency: string;
  exchangeRate: number;
}

export interface JournalRecord {
  id: string;
  postedAt: string; // ISO timestamp (append-only)
  date: string; // YYYY-MM-MM business date
  description: string;
  source: SourceType;
  txType?: TransactionType;
  category?: string;
  entries: JournalEntryRecord[];
}

/** Standard chart-of-accounts codes used by all SAKU seeds & mappers. */
export const COA = {
  EQUITY: '3000', // Owner's Equity (opening balances land here)
  INCOME: '4000', // General income (salary, gifts, etc.)
  TRADING_INCOME: '4100', // Realized trading profit (MT5/broker)
  EXPENSE: '5000', // General expense bucket
} as const;

export const ASSET_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set<AccountType>([
  'BANK',
  'EWALLET',
  'CASH',
  'INVESTMENT',
  'TRADING',
]);

export const LIABILITY_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set<AccountType>(['CREDIT_CARD']);

export const PNL_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set<AccountType>([
  'OWNERS_EQUITY',
  'INCOME',
  'EXPENSE',
]);

export * from './journal-mapping';
export * from './balances';
