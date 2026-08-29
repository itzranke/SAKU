/**
 * PrismaSessionStore — persistensi sesi auth (ADR-024 fase 2).
 *
 * Menyimpan HANYA SHA-256(token) di tabel `auth_sessions`. Token mentah tidak pernah
 * sampai ke adapter ini, jadi bocornya database tidak memberi penyerang sesi yang bisa
 * dipakai. Tidak ada baris yang pernah di-log.
 *
 * Kegagalan DB di sini TIDAK boleh menjatuhkan auth: pemanggil (SessionService) memakai
 * cache in-memory sebagai sumber jawaban dan memperlakukan store ini sebagai best-effort.
 */
import { PrismaClient } from '@prisma/client';

export interface PersistedSession {
  tokenHash: string;
  ownerId: string;
  /** epoch ms */
  expiresAt: number;
}

type RawSession = { tokenHash: string; ownerId: string; expiresAt: Date };

export class PrismaSessionStore {
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

  async loadActive(): Promise<PersistedSession[]> {
    const prisma = await this.db();
    const rows = (await (prisma as any).authSession.findMany({
      where: { expiresAt: { gt: new Date() } },
    })) as RawSession[];
    return rows.map((r) => ({
      tokenHash: r.tokenHash,
      ownerId: r.ownerId,
      expiresAt: r.expiresAt.getTime(),
    }));
  }

  async save(session: PersistedSession): Promise<void> {
    const prisma = await this.db();
    const data = {
      tokenHash: session.tokenHash,
      ownerId: session.ownerId,
      expiresAt: new Date(session.expiresAt),
    };
    await (prisma as any).authSession.upsert({
      where: { tokenHash: session.tokenHash },
      create: data,
      update: { ownerId: data.ownerId, expiresAt: data.expiresAt },
    });
  }

  async remove(tokenHash: string): Promise<void> {
    const prisma = await this.db();
    await (prisma as any).authSession.deleteMany({ where: { tokenHash } });
  }

  async purgeExpired(): Promise<void> {
    const prisma = await this.db();
    await (prisma as any).authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}
