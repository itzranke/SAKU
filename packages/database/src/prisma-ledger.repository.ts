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

const toNumber = (v: unknown): number => Number(v == null ? 0 : String(v));

type EntryRow = { accountId: string; amount: unknown; currency: string; exchangeRate: unknown };
type AccountRow = { id: string; code: string; name: string; type: string; currency: string; isActive: boolean };

export class PrismaLedgerRepository {
  readonly workspaceId: string;
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

    const accounts = await this.accounts();
    const byCode = new Map<string, AccountRow>(accounts.map((a) => [a.code, a]));
    const legs = input.entries.map((e) => {
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

    const created = await prisma.$transaction(async (tx: any) => {
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
    });

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
