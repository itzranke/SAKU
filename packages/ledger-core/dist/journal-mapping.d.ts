/**
 * journal-mapping.ts — Pure mappers from "simple transaction" (UX model) to
 * strict double-entry legs (accounting model). No I/O, no framework imports.
 */
import { AccountDef, JournalValidationResult, LedgerEntryInput, SourceType, TransactionType } from './index';
/** Base-currency (IDR) conversion defaults. Callers may override per-leg. */
export declare const DEFAULT_EXCHANGE_RATES: Record<string, number>;
export interface SimpleTransactionInput {
    /** Positive magnitude. Sign is derived from `type`. */
    amount: number;
    type: TransactionType;
    description: string;
    /** Account name OR code (matched case-insensitively against `accounts`). */
    account: string;
    /** For TRANSFER: destination account name/code. */
    targetAccount?: string;
    category?: string;
    date?: string;
    currency?: string;
    exchangeRate?: number;
}
export declare class UnknownAccountError extends Error {
    readonly query: string;
    constructor(query: string);
}
export declare function resolveAccount(accounts: AccountDef[], query: string): AccountDef;
export declare function rateFor(currency: string, explicit?: number): number;
/**
 * Maps a simple UX transaction to balanced double-entry legs against a CoA.
 * Rules:
 *  - INCOME          : Debit <account>, Credit 4000 (or 4100 for TRADING_PROFIT)
 *  - TRADING_PROFIT  : Debit <trading account>, Credit 4100 (base-currency legs)
 *  - EXPENSE         : Debit 5000 (category metadata), Credit <account>
 *  - TRANSFER        : Debit <target>, Credit <source>
 * Negative profit (trading loss) is an EXPENSE-style inversion: Debit 5000, Credit account.
 */
export declare function buildJournalLegs(tx: SimpleTransactionInput, accounts: AccountDef[]): LedgerEntryInput[];
export interface DraftJournal {
    description: string;
    date: string;
    source: SourceType;
    txType: TransactionType;
    category?: string;
    entries: LedgerEntryInput[];
    validation: JournalValidationResult;
}
/** Build a validated journal draft from a simple transaction (does NOT persist). */
export declare function buildDraftJournalFromTransaction(tx: SimpleTransactionInput, accounts: AccountDef[], source?: SourceType): DraftJournal;
/** MT5 / broker realized-P&L payloads map 1:1 onto trading profit/loss journals. */
export interface TradeProfitInput {
    account: string;
    profit: number;
    currency: string;
    exchangeRate?: number;
    description: string;
    date?: string;
}
export declare function tradeProfitToTransaction(p: TradeProfitInput): SimpleTransactionInput;
