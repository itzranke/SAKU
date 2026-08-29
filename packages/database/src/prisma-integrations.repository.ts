/**
 * PrismaIntegrationsRepository — persistent connector registry (ADR-022 M2).
 *
 * Stores ONLY the AES-256-GCM envelope in `credentialCipher`. This class never logs a row
 * and never returns anything but full rows (public shaping happens in api-core), so a
 * plaintext credential can not escape through this adapter.
 */
import { PrismaClient } from '@prisma/client';

export interface IntegrationRow {
  id: string;
  ownerId: string;
  type: 'MT5_CLOUD' | 'MT5_STATEMENT';
  label: string;
  login: string;
  server: string;
  port: number | null;
  enabled: boolean;
  credentialCipher: string;
  vendorAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewIntegrationInput {
  ownerId?: string;
  type: 'MT5_CLOUD' | 'MT5_STATEMENT';
  label: string;
  login: string;
  server: string;
  port?: number | null;
  enabled?: boolean;
  credentialCipher: string;
  vendorAccountId?: string | null;
}

export interface IntegrationPatch {
  label?: string;
  server?: string;
  port?: number | null;
  enabled?: boolean;
  credentialCipher?: string;
  vendorAccountId?: string | null;
}

type RawIntegration = {
  id: string;
  ownerId: string;
  type: string;
  label: string;
  login: string;
  server: string;
  port: number | null;
  enabled: boolean;
  credentialCipher: string;
  vendorAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toRow = (r: RawIntegration): IntegrationRow => ({
  id: r.id,
  ownerId: r.ownerId,
  type: r.type as IntegrationRow['type'],
  label: r.label,
  login: r.login,
  server: r.server,
  port: r.port ?? null,
  enabled: r.enabled,
  credentialCipher: r.credentialCipher,
  vendorAccountId: r.vendorAccountId ?? null,
  createdAt: (r.createdAt as Date).toISOString(),
  updatedAt: (r.updatedAt as Date).toISOString(),
});

export class PrismaIntegrationsRepository {
  readonly persistence = 'postgres' as const;
  private readonly prisma: PrismaClient;
  private connected = false;

  constructor(databaseUrl: string) {
    this.prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }

  private async db(): Promise<PrismaClient> {
    if (!this.connected) {
      await this.prisma.$connect();
      this.connected = true;
    }
    return this.prisma;
  }

  async list(ownerId?: string): Promise<IntegrationRow[]> {
    const prisma = await this.db();
    const rows = (await prisma.integrationAccount.findMany({
      where: ownerId ? { ownerId } : {},
      orderBy: { createdAt: 'asc' },
    })) as unknown as RawIntegration[];
    return rows.map(toRow);
  }

  async find(id: string): Promise<IntegrationRow | null> {
    const prisma = await this.db();
    const row = (await prisma.integrationAccount.findUnique({ where: { id } })) as unknown as
      | RawIntegration
      | null;
    return row ? toRow(row) : null;
  }

  async findByLogin(ownerId: string, type: string, login: string): Promise<IntegrationRow | null> {
    const prisma = await this.db();
    const row = (await prisma.integrationAccount.findUnique({
      where: { ownerId_type_login: { ownerId, type: type as never, login } },
    })) as unknown as RawIntegration | null;
    return row ? toRow(row) : null;
  }

  async create(input: NewIntegrationInput): Promise<IntegrationRow> {
    const prisma = await this.db();
    const ownerId = input.ownerId ?? 'user-local';
    try {
      const row = (await prisma.integrationAccount.create({
        data: {
          ownerId,
          type: input.type as never,
          label: input.label,
          login: input.login,
          server: input.server,
          port: input.port ?? null,
          enabled: input.enabled ?? true,
          credentialCipher: input.credentialCipher,
          vendorAccountId: input.vendorAccountId ?? null,
        },
      })) as unknown as RawIntegration;
      return toRow(row);
    } catch (err) {
      if ((err as any)?.code === 'P2002') {
        throw new Error(
          `Akun ${input.type} "${input.login}" sudah terdaftar untuk owner ini. Gunakan PATCH untuk mengubahnya.`
        );
      }
      throw err;
    }
  }

  async update(id: string, patch: IntegrationPatch): Promise<IntegrationRow | null> {
    const prisma = await this.db();
    try {
      const row = (await prisma.integrationAccount.update({
        where: { id },
        data: patch as never,
      })) as unknown as RawIntegration;
      return toRow(row);
    } catch (err) {
      if ((err as any)?.code === 'P2002' || (err as any)?.code === 'P2025') return null;
      throw err;
    }
  }

  async remove(id: string): Promise<boolean> {
    const prisma = await this.db();
    try {
      await prisma.integrationAccount.delete({ where: { id } });
      return true;
    } catch (err) {
      if ((err as any)?.code === 'P2025') return false;
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.connected = false;
  }
}
