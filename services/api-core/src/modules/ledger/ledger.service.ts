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
  LedgerRepository,
  NewAccountInput,
} from './ledger.repository';

export interface RawJournalBody {
  description: string;
  date?: string;
  source?: SourceType;
  entries: Array<{ accountId: string; amount: number; currency?: string; exchangeRate?: number }>;
}

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
