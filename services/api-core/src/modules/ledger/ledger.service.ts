/**
 * LedgerService — the single write path into the immutable double-entry ledger.
 * Every money movement (manual, statement import, bot capture, MT5 P&L) becomes
 * a validated, balanced journal. There is intentionally NO edit or delete API;
 * corrections are made with reversing journals (source RECONCILIATION).
 */
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AccountDef,
  buildDraftJournalFromTransaction,
  buildLedgerSnapshot,
  JournalRecord,
  LedgerEntryInput,
  LedgerSnapshot,
  SimpleTransactionInput,
  SourceType,
  validateJournalEntries,
} from '@saku/ledger-core';
import {
  LEDGER_REPOSITORY,
  DealSource,
  LedgerRepository,
  NewAccountInput,
  NewJournalInput,
} from './ledger.repository';

export interface RawJournalBody {
  description: string;
  date?: string;
  source?: SourceType;
  entries: Array<{ accountId: string; amount: number; currency?: string; exchangeRate?: number }>;
}

/** Input of the idempotent broker-deal write path (see LedgerService.postBrokerDeal). */
export interface BrokerDealInput {
  /** SAKU ledger account (code or name) that receives the realized P&L. */
  account: string;
  /** Broker login used as the dedupe key together with `ticket`. */
  login: string;
  ticket: string;
  symbol?: string;
  /** Signed NET P&L (profit + commission + swap), account currency. */
  profit: number;
  currency?: string;
  exchangeRate?: number;
  date?: string; // YYYY-MM-DD
  source?: DealSource;
}

export type BrokerDealResult =
  | { kind: 'posted'; ticket: string; journal: JournalRecord; dedupeApplied: boolean }
  | { kind: 'duplicate'; ticket: string; reason: string }
  | { kind: 'skipped'; ticket: string; reason: string };

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(@Inject(LEDGER_REPOSITORY) private readonly repo: LedgerRepository) {}

  async getSnapshot(recentLimit = 25): Promise<LedgerSnapshot> {
    const [accounts, journals] = await Promise.all([this.repo.listAccounts(), this.repo.listJournals()]);
    return buildLedgerSnapshot(this.repo.workspaceId, accounts, journals, { recentLimit });
  }

  async listAccounts() {
    return { workspaceId: this.repo.workspaceId, accounts: await this.repo.listAccounts() };
  }

  async createAccount(body: NewAccountInput & { initialBalance?: number }) {
    const account = await this.repo.addAccount({
      name: body.name,
      type: body.type,
      currency: body.currency,
      code: body.code,
    });
    let journal: JournalRecord | null = null;
    const initial = Number(body.initialBalance ?? 0);
    if (initial !== 0) {
      // Opening balance must also flow through a balanced journal (never a raw number).
      const accounts = await this.repo.listAccounts();
      const equity = accounts.find((a) => a.code === '3000');
      if (!equity) throw new BadRequestException("Owner's Equity account (3000) is missing; cannot post opening balance.");
      const entries: LedgerEntryInput[] = [
        { accountId: account.code, amount: initial, currency: account.currency },
        {
          accountId: equity.code,
          amount: -initial * (account.currency === 'IDR' ? 1 : (account.currency === 'USD' ? 15500 : 1)),
          currency: 'IDR',
          exchangeRate: 1,
        },
      ];
      const validation = validateJournalEntries(entries);
      if (!validation.isValid) throw new BadRequestException(validation.error);
      journal = await this.repo.appendJournal({
        description: `Saldo awal akun ${account.name}`,
        date: new Date().toISOString().slice(0, 10),
        source: 'MANUAL',
        entries,
      });
    }
    this.logger.log(`Account ${account.code} (${account.name}) registered${journal ? ' with opening journal' : ''}.`);
    return { account, journal, snapshot: await this.getSnapshot() };
  }

  /** POST /ledger/transaction — maps the simple UX transaction to double-entry legs. */
  async postSimpleTransaction(tx: SimpleTransactionInput, source: SourceType = 'MANUAL') {
    if (!tx.description || !tx.description.trim()) {
      throw new BadRequestException('description is required.');
    }
    const accounts = await this.repo.listAccounts();
    let draft;
    try {
      draft = buildDraftJournalFromTransaction(tx, accounts, source);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    if (!draft.validation.isValid) {
      throw new BadRequestException(draft.validation.error ?? 'Unbalanced journal.');
    }
    const journal = await this.repo.appendJournal({
      description: draft.description,
      date: draft.date,
      source: draft.source,
      txType: draft.txType,
      category: draft.category,
      entries: draft.entries,
    });
    this.logger.log(`Journal ${journal.id} posted (${draft.txType} ${draft.validation.totalDebits} base-IDR, ${source}).`);
    return { journal, validation: draft.validation, snapshot: await this.getSnapshot() };
  }

  /** POST /ledger/journal — raw double-entry legs for power users & bots. */
  async postRawJournal(body: RawJournalBody) {
    const accounts = await this.repo.listAccounts();
    const known = new Map<string, AccountDef>(accounts.map((a) => [a.code, a]));
    const entries: LedgerEntryInput[] = (body.entries ?? []).map((e) => ({
      accountId: this.resolveCode(e.accountId, known),
      amount: Number(e.amount),
      currency: e.currency ?? known.get(this.resolveCode(e.accountId, known))?.currency ?? 'IDR',
      exchangeRate: e.exchangeRate,
    }));
    const validation = validateJournalEntries(entries);
    if (!validation.isValid) throw new BadRequestException(validation.error);
    const journal = await this.repo.appendJournal({
      description: body.description?.trim() || 'Jurnal manual',
      date: body.date ?? new Date().toISOString().slice(0, 10),
      source: body.source ?? 'MANUAL',
      entries,
    });
    return { journal, validation, snapshot: await this.getSnapshot() };
  }

  /** Internal write path for broker P&L (MT5 sync). Zero-profit deals produce no journal. */
  async postTradeProfit(input: {
    account: string;
    ticket: string;
    symbol?: string;
    profit: number;
    currency?: string;
    exchangeRate?: number;
    date?: string;
  }) {
    if (!input.profit || Number.isNaN(input.profit) || input.profit === 0) {
      return { skipped: true as const, reason: 'zero-profit deal produces no journal' };
    }
    return this.postSimpleTransaction(
      {
        amount: input.profit, // negative magnitude = loss branch inside the engine mapper
        type: 'TRADING_PROFIT',
        description: `MT5 ${input.symbol ?? 'Trade'} #${input.ticket} — Realized P&L`,
        account: input.account,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        date: input.date,
      },
      'MT5_SYNC'
    );
  }

  /**
   * M1 / ADR-022 — journalizing path for one closed broker deal.
   *
   * Unlike `postTradeProfit` (which is the generic write used by the legacy bridge),
   * this route is idempotent at the STORAGE level: the journal and its
   * `processed_deals` marker are written by `appendJournalOncePerDeal` in a single
   * transaction, so re-running a sync (or restarting the API) never double-posts.
   *
   * `source` is the ingest channel (MT5_SYNC from the cloud connector, STATEMENT from
   * the reconciliation import, EA_LEGACY from the deprecated bridge). Journals are
   * recorded with the matching ledger SourceType.
   */
  async postBrokerDeal(input: BrokerDealInput): Promise<BrokerDealResult> {
    const net = Number(input.profit);
    if (!net || Number.isNaN(net)) {
      return { kind: 'skipped', ticket: input.ticket, reason: 'zero-profit deal produces no journal' };
    }
    const dealSource: DealSource = input.source ?? 'MT5_SYNC';
    // Provenance is preserved in the immutable journal: cloud sync, statement reconciliation
    // and the deprecated push bridge each get their own SourceType (ADR-022 M3).
    const journalSource: SourceType =
      dealSource === 'STATEMENT' ? 'STATEMENT_IMPORT' : dealSource === 'EA_LEGACY' ? 'EA_LEGACY' : 'MT5_SYNC';

    const accounts = await this.repo.listAccounts();
    let draft;
    try {
      draft = buildDraftJournalFromTransaction(
        {
          amount: net, // signed: the mapper routes losses to the expense leg
          type: 'TRADING_PROFIT',
          description: `MT5 ${input.symbol ?? 'Trade'} #${input.ticket} — Realized P&L`,
          account: input.account,
          currency: input.currency,
          exchangeRate: input.exchangeRate,
          date: input.date,
        },
        accounts,
        journalSource
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    if (!draft.validation.isValid) {
      throw new BadRequestException(draft.validation.error ?? 'Unbalanced journal.');
    }

    const journalInput: NewJournalInput = {
      description: draft.description,
      date: draft.date,
      source: draft.source,
      txType: draft.txType,
      category: draft.category,
      entries: draft.entries,
    };

    if (!this.repo.appendJournalOncePerDeal) {
      // Repository without persistent dedupe -> caller keeps its volatile Set fallback.
      const journal = await this.repo.appendJournal(journalInput);
      return { kind: 'posted', ticket: input.ticket, journal, dedupeApplied: false };
    }

    const result = await this.repo.appendJournalOncePerDeal(journalInput, {
      account: input.login,
      ticket: input.ticket,
      source: dealSource,
    });
    if (result.duplicate) {
      return {
        kind: 'duplicate',
        ticket: input.ticket,
        reason: `deal ${input.login}:${input.ticket} already journalized (dedupe store)`,
      };
    }
    this.logger.log(
      `Journal ${result.journal!.id} posted from deal ${input.login}:${input.ticket} (${dealSource}, ${draft.validation.totalDebits} base-IDR).`
    );
    return { kind: 'posted', ticket: input.ticket, journal: result.journal!, dedupeApplied: true };
  }

  /** Dedupe bookkeeping for /trading/state + ops dashboards. */
  async countProcessedDeals(login?: string): Promise<number> {
    if (!this.repo.countProcessedDeals) return 0;
    return this.repo.countProcessedDeals(login);
  }

  /**
   * Which dedupe store is live:
   *  - 'postgres'  -> `processed_deals` table; dedupe survives restarts (M1 contract)
   *  - 'memory'    -> adapter-local dedupe (dev/demo InMemoryLedgerRepository)
   *  - 'none'      -> adapter has no dedupe support; callers fall back to their volatile Set
   */
  dedupeMode(): 'postgres' | 'memory' | 'none' {
    if (typeof this.repo.appendJournalOncePerDeal !== 'function') return 'none';
    return this.repo.persistence === 'postgres' ? 'postgres' : 'memory';
  }

  async getJournals(limit?: number) {
    return { workspaceId: this.repo.workspaceId, journals: await this.repo.listJournals(limit ?? 50) };
  }

  /** Accepts account code OR name (case-insensitive), like the engine resolver. */
  private resolveCode(query: string, known: Map<string, AccountDef>): string {
    const byCode = known.get(query);
    if (byCode) return byCode.code;
    const q = (query ?? '').trim().toLowerCase();
    for (const a of known.values()) {
      if (a.name.toLowerCase() === q) return a.code;
    }
    throw new NotFoundException(`Unknown account "${query}".`);
  }
}
