/**
 * ledger.repository.ts — Storage port for the append-only journal store.
 * api-core never touches raw balances; balances are always derived from journals
 * by @saku/ledger-core. Two adapters exist:
 *   - InMemoryLedgerRepository (default, dev/demo; volatile)
 *   - PrismaLedgerRepository (@saku/database; selected when DATABASE_URL is set)
 * The port is Promise-based so both sync-ish and async adapters can implement it.
 */
import { AccountDef, JournalRecord, LedgerEntryInput, SourceType, TransactionType } from '@saku/ledger-core';

export const LEDGER_REPOSITORY = 'LEDGER_REPOSITORY';

export interface NewJournalInput {
  description: string;
  date: string; // YYYY-MM-DD
  source: SourceType;
  txType?: TransactionType;
  category?: string;
  entries: LedgerEntryInput[];
}

export interface NewAccountInput {
  name: string;
  type: AccountDef['type'];
  currency: string;
  code?: string;
}

export interface LedgerRepository {
  readonly workspaceId: string;
  listAccounts(): Promise<AccountDef[]>;
  addAccount(input: NewAccountInput): Promise<AccountDef>;
  /** APPEND-ONLY. Implementations MUST NOT expose update/delete of journals or legs. */
  appendJournal(input: NewJournalInput): Promise<JournalRecord>;
  listJournals(limit?: number): Promise<JournalRecord[]>;
}
