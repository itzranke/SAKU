/**
 * balances.ts — Derives account balances, aggregates (net worth) and recent
 * journal "display rows" purely from append-only journals. This is the ONLY
 * sanctioned way to read money out of the engine: balances are NEVER stored raw.
 */
import { AccountDef, JournalRecord } from './index';
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
export declare function computeAccountBalances(accounts: AccountDef[], journals: JournalRecord[]): AccountBalance[];
export interface JournalDisplayRow {
    id: string;
    date: string;
    description: string;
    source: string;
    type: string;
    account: string;
    amount: number;
    currency: string;
    category?: string;
}
/**
 * Chooses the "primary" leg of a journal for the transaction list:
 * the first asset/liability leg (P&L + equity legs are excluded because they
 * are the accounting counterpart, not what the user perceives as "the money").
 */
export declare function journalToDisplayRow(journal: JournalRecord, accounts: AccountDef[]): JournalDisplayRow;
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
export declare function buildLedgerSnapshot(workspaceId: string, accounts: AccountDef[], journals: JournalRecord[], opts?: {
    recentLimit?: number;
}): LedgerSnapshot;
