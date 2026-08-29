/**
 * SessionStore port (ADR-024 fase 2) — persistensi sesi, opsional.
 *
 * api-core bergantung pada PORT ini, bukan pada Prisma (pola yang sama dengan
 * LEDGER_REPOSITORY / INTEGRATIONS_REPOSITORY):
 *   - DATABASE_URL ada  -> PrismaSessionStore (@saku/database, tabel `auth_sessions`)
 *   - selain itu        -> null (SessionService murni in-memory, perilaku fase 1 persis)
 *
 * Yang disimpan HANYA SHA-256(token). Token mentah tidak pernah menyentuh store ini,
 * tidak pernah di-log, dan tidak pernah keluar dari proses selain sekali saat diterbitkan.
 */
export const SESSION_STORE = 'SESSION_STORE';

export interface PersistedSession {
  tokenHash: string;
  ownerId: string;
  /** epoch ms */
  expiresAt: number;
}

export interface SessionStore {
  /** Semua sesi yang belum kadaluarsa — dipanggil sekali saat boot (hidrasi cache). */
  loadActive(): Promise<PersistedSession[]>;
  save(session: PersistedSession): Promise<void>;
  remove(tokenHash: string): Promise<void>;
  /** Sapu bersih baris kadaluarsa; oportunistik, tidak wajib presisi. */
  purgeExpired(): Promise<void>;
}
