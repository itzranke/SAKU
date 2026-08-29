/**
 * PrismaLedgerRepository — persistent adapter for the SAKU append-only ledger.
 * Persists journals + legs only (PostgreSQL / TimescaleDB via Prisma). Balances
 * are NEVER stored as raw columns; every read of "saldo" happens by deriving
 * journals with @saku/ledger-core (buildLedgerSnapshot).
 *
 * Selected by @saku/api-core only when DATABASE_URL is present
 * (see buildLedgerRepository in services/api-core/src/app.module.ts).
 */
import { PrismaClient } from '@prisma/client';
import { AccountDef, JournalRecord, validateJournalEntries } from '@saku/ledger-core';

export interface NewJournalInput {
  description: string;
  date: string;
  source: 'MANUAL' | 'STATEMENT_IMPORT' | 'MT5_SYNC' | 'BOT_CAPTURE' | 'RECONCILIATION';
  txType?: string;
  category?: string;
  entries: Array<{ accountId: string; amount: number; currency: string; exchangeRate?: number }>;
}

export interface NewAccountInput {
  name: string;
  type: AccountDef['type'];
  currency: string;
  code?: string;
}

/** M1 / ADR-022 — identity of an ingested closed deal used for idempotency. */
export type DealSource = 'MT5_SYNC' | 'STATEMENT' | 'EA_LEGACY';

export interface ProcessedDealRef {
  /** Broker login / account id (matches the dedupe key `account:ticket`). */
  account: string;
  ticket: string;
  source: DealSource;
}

export interface DedupeAppendResult {
  /** True when this (account, ticket) already produced a journal earlier. */
  duplicate: boolean;
  journal: JournalRecord | null;
}

type LegRow = {
  accountId: string;
  accountCode: string;
  amount: number;
  currency: string;
  exchangeRate: number;
};

const toNumber = (v: unknown): number => Number(v == null ? 0 : String(v));

/** Internal control-flow marker: the (account, ticket) pair already has a journal. */
export class DealAlreadyProcessedError extends Error {
  constructor(account?: string, ticket?: string) {
    super(`Deal ${account ?? ''}:${ticket ?? ''} was already journalized (processed_deals).`);
    this.name = 'DealAlreadyProcessedError';
  }
}


type EntryRow = { accountId: string; amount: unknown; currency: string; exchangeRate: unknown };
type AccountRow = { id: string; code: string; name: string; type: string; currency: string; isActive: boolean };

export class PrismaLedgerRepository {
  readonly workspaceId: string;
  readonly persistence = 'postgres' as const;
  private readonly prisma: PrismaClient;
  private connected = false;

  constructor(databaseUrl: string, workspaceId = 'default-workspace-id') {
    this.workspaceId = workspaceId;
    this.prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }

  private async db(): Promise<PrismaClient> {
    if (!this.connected) {
      await this.prisma.$connect();
      this.connected = true;
    }
    return this.prisma;
  }

  /** Ensures the workspace row exists (idempotent). Accounts are created via db:seed. */
  async bootstrap(): Promise<void> {
    const prisma = await this.db();
    await prisma.workspace.upsert({
      where: { id: this.workspaceId },
      update: {},
      create: { id: this.workspaceId, name: 'Personal Workspace', baseCurrency: 'IDR' },
    });
  }

  private async accounts(): Promise<AccountRow[]> {
    const prisma = await this.db();
    return prisma.account.findMany({
      where: { workspaceId: this.workspaceId },
      orderBy: { code: 'asc' },
    }) as unknown as AccountRow[];
  }

  async listAccounts(): Promise<AccountDef[]> {
    const rows = await this.accounts();
    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      type: r.type as AccountDef['type'],
      currency: r.currency,
      isActive: r.isActive,
    }));
  }

  async addAccount(input: NewAccountInput): Promise<AccountDef> {
    const prisma = await this.db();
    const existing = await prisma.account.findFirst({ where: { workspaceId: this.workspaceId, name: input.name } });
    if (existing) throw new Error(`Account name "${input.name}" already exists.`);
    let code = input.code;
    if (code) {
      const dup = await prisma.account.findFirst({ where: { workspaceId: this.workspaceId, code } });
      if (dup) throw new Error(`Account code "${code}" already exists.`);
    } else {
      const all = await prisma.account.findMany({ where: { workspaceId: this.workspaceId }, select: { code: true } });
      const used = new Set<string>(all.map((a: { code: string }) => a.code));
      let n = 1140;
      while (used.has(String(n))) n += 10;
      code = String(n);
    }
    const row = (await prisma.account.create({
      data: {
        workspaceId: this.workspaceId,
        code,
        name: input.name,
        type: input.type as never,
        currency: (input.currency ?? 'IDR').toUpperCase(),
      },
    })) as unknown as AccountRow;
    return { code: row.code, name: row.name, type: row.type as AccountDef['type'], currency: row.currency, isActive: row.isActive };
  }

  /**
   * APPEND-ONLY write. Validates balance (defense-in-depth: the service also
   * validates) then persists journal + legs atomically in one transaction.
   */
  async appendJournal(input: NewJournalInput): Promise<JournalRecord> {
    const validation = validateJournalEntries(input.entries);
    if (!validation.isValid) throw new Error(validation.error ?? 'Unbalanced journal.');
    const prisma = await this.db();
    const legs = await this.buildLegs(input);

    const created = await prisma.$transaction(async (tx: any) => this.insertJournal(tx, input, legs));
    return this.toJournalRecord(created, input, legs);
  }

  /**
   * M1 / ADR-022 — atomic "journal + dedupe marker" write.
   *
   * The journal append and the `processed_deals` insert share ONE transaction, so:
   *   * a failed journal write leaves no dedupe row (the deal is retried later);
   *   * a dedupe row is never present without its journal (no silently "lost" deals).
   * A concurrent duplicate surfaces as a unique-violation (P2002) that rolls the whole
   * transaction back and is reported as `{ duplicate: true }`.
   */
  async appendJournalOncePerDeal(input: NewJournalInput, deal: ProcessedDealRef): Promise<DedupeAppendResult> {
    const validation = validateJournalEntries(input.entries);
    if (!validation.isValid) throw new Error(validation.error ?? 'Unbalanced journal.');
    const prisma = await this.db();
    const legs = await this.buildLegs(input);

    try {
      const created = await prisma.$transaction(async (tx: any) => {
        const seen = await tx.processedDeal.findUnique({
          where: { account_ticket: { account: deal.account, ticket: deal.ticket } },
        });
        if (seen) throw new DealAlreadyProcessedError();
        const journal = await this.insertJournal(tx, input, legs);
        await tx.processedDeal.create({
          data: { account: deal.account, ticket: deal.ticket, source: deal.source as never },
        });
        return journal;
      });
      return { duplicate: false, journal: this.toJournalRecord(created, input, legs) };
    } catch (err) {
      if (err instanceof DealAlreadyProcessedError || (err as any)?.code === 'P2002') {
        return { duplicate: true, journal: null }; // transaction rolled back — nothing was written
      }
      throw err;
    }
  }

  /** Read-only probe used by /trading/state and the CI smoke test. */
  async isDealProcessed(account: string, ticket: string): Promise<boolean> {
    const prisma = await this.db();
    const hit = await prisma.processedDeal.findUnique({
      where: { account_ticket: { account, ticket } },
    });
    return Boolean(hit);
  }

  async countProcessedDeals(account?: string): Promise<number> {
    const prisma = await this.db();
    return prisma.processedDeal.count({ where: account ? { account } : {} });
  }

  private async buildLegs(input: NewJournalInput): Promise<LegRow[]> {
    const accounts = await this.accounts();
    const byCode = new Map<string, AccountRow>(accounts.map((a) => [a.code, a]));
    return input.entries.map((e) => {
      const acc = byCode.get(e.accountId);
      if (!acc) {
        throw new Error(
          `Unknown account code "${e.accountId}" for workspace ${this.workspaceId}. Seed the chart of accounts (pnpm --filter @saku/database db:seed).`
        );
      }
      return {
        accountId: acc.id,
        accountCode: acc.code,
        amount: e.amount,
        currency: e.currency ?? acc.currency,
        exchangeRate: e.exchangeRate ?? 1,
      };
    });
  }

  private async insertJournal(tx: any, input: NewJournalInput, legs: LegRow[]) {
    const journal = await tx.ledgerJournal.create({
      data: {
        workspaceId: this.workspaceId,
        description: input.description,
        source: input.source as never,
        txType: input.txType,
        category: input.category,
        postedAt: new Date(`${input.date}T00:00:00.000Z`),
      },
    });
    await tx.ledgerEntry.createMany({
      data: legs.map((l) => ({
        journalId: journal.id,
        accountId: l.accountId,
        amount: l.amount,
        currency: l.currency,
        exchangeRate: l.exchangeRate,
      })),
    });
    return journal;
  }

  private toJournalRecord(created: any, input: NewJournalInput, legs: LegRow[]): JournalRecord {
    return {
      id: created.id,
      postedAt: created.postedAt.toISOString(),
      date: input.date,
      description: created.description,
      source: created.source,
      txType: created.txType ?? undefined,
      category: created.category ?? undefined,
      entries: legs.map((l) => ({
        accountCode: l.accountCode,
        amount: l.amount,
        currency: l.currency,
        exchangeRate: l.exchangeRate,
      })),
    };
  }

  async listJournals(limit?: number): Promise<JournalRecord[]> {
    const prisma = await this.db();
    const accounts = await this.accounts();
    const idToCode = new Map<string, string>(accounts.map((a) => [a.id, a.code]));

    const where = { workspaceId: this.workspaceId };
    const total = await prisma.ledgerJournal.count({ where });
    const skip = limit && limit < total ? total - limit : 0;

    const journals = await prisma.ledgerJournal.findMany({
      where,
      orderBy: { postedAt: 'asc' },
      skip,
      include: { entries: true },
    });

    return journals.map((j: any) => ({
      id: j.id,
      postedAt: j.postedAt.toISOString(),
      date: (j.postedAt as Date).toISOString().slice(0, 10),
      description: j.description,
      source: j.source,
      txType: j.txType ?? undefined,
      category: j.category ?? undefined,
      entries: (j.entries as EntryRow[]).map((e) => ({
        accountCode: idToCode.get(e.accountId) ?? e.accountId,
        amount: toNumber(e.amount),
        currency: e.currency,
        exchangeRate: toNumber(e.exchangeRate),
      })),
    })) as JournalRecord[];
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.connected = false;
  }
}
