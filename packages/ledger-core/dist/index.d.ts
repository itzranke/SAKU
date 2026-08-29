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
    amount: number;
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
export declare function validateJournalEntries(entries: LedgerEntryInput[]): JournalValidationResult;
export type AccountType = 'BANK' | 'EWALLET' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT' | 'TRADING' | 'OWNERS_EQUITY' | 'INCOME' | 'EXPENSE';
export type SourceType = 'MANUAL' | 'STATEMENT_IMPORT' | 'MT5_SYNC' | 'BOT_CAPTURE' | 'RECONCILIATION';
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
    amount: number;
    currency: string;
    exchangeRate: number;
}
export interface JournalRecord {
    id: string;
    postedAt: string;
    date: string;
    description: string;
    source: SourceType;
    txType?: TransactionType;
    category?: string;
    entries: JournalEntryRecord[];
}
/** Standard chart-of-accounts codes used by all SAKU seeds & mappers. */
export declare const COA: {
    readonly EQUITY: "3000";
    readonly INCOME: "4000";
    readonly TRADING_INCOME: "4100";
    readonly EXPENSE: "5000";
};
export declare const ASSET_ACCOUNT_TYPES: ReadonlySet<AccountType>;
export declare const LIABILITY_ACCOUNT_TYPES: ReadonlySet<AccountType>;
export declare const PNL_ACCOUNT_TYPES: ReadonlySet<AccountType>;
export * from './journal-mapping';
export * from './balances';
