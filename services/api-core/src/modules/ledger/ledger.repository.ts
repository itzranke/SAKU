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

/**
 * M1 / ADR-022 — closed-deal idempotency contract.
 * `account` is the broker login, `ticket` the MT5 deal ticket (or a stable hash for
 * statement rows). A deal is journalized at most ONCE, ever — the marker row lives in
 * the persistent `processed_deals` table and is written in the SAME transaction as the
 * journal, so a crash can never produce a half-applied sync.
 */
export type DealSource = 'MT5_SYNC' | 'STATEMENT' | 'EA_LEGACY';

export interface ProcessedDealRef {
  account: string;
  ticket: string;
  source: DealSource;
}

export interface DedupeAppendResult {
  duplicate: boolean;
  journal: JournalRecord | null;
}

export interface LedgerRepository {
  readonly workspaceId: string;
  /**
   * Where this adapter keeps its state. 'postgres' also means `processed_deals` dedupe
   * survives an API restart; 'memory' is dev/demo only.
   */
  readonly persistence?: 'postgres' | 'memory';
  listAccounts(): Promise<AccountDef[]>;
  addAccount(input: NewAccountInput): Promise<AccountDef>;
  /** APPEND-ONLY. Implementations MUST NOT expose update/delete of journals or legs. */
  appendJournal(input: NewJournalInput): Promise<JournalRecord>;
  listJournals(limit?: number): Promise<JournalRecord[]>;
  /**
   * Optional atomic "append journal + mark deal processed" (persistent adapters and the
   * in-memory dev adapter implement it). Callers fall back to `appendJournal` when absent.
   */
  appendJournalOncePerDeal?(input: NewJournalInput, deal: ProcessedDealRef): Promise<DedupeAppendResult>;
  isDealProcessed?(account: string, ticket: string): Promise<boolean>;
  countProcessedDeals?(account?: string): Promise<number>;
}

