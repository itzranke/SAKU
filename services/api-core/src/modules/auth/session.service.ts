/**
 * SessionService (ADR-023 fase 1) — server-side sessions untuk kepemilikan data.
 *
 * - Token acak 32-byte (base64url) diterbitkan oleh verify-otp; server HANYA menyimpan
 *   SHA-256(token) → { ownerId, expiresAt } di memori. Token mentah tidak pernah disimpan
 *   dan tidak pernah di-log (hash saja).
 * - TTL default 7 hari (env `SAKU_SESSION_TTL_SEC`, minimal 60 detik). Restart proses =
 *   semua sesi gugur (diterima fase 1, lihat ADR-023 §2.4).
 * ADR-024 fase 2 (aditif): bila `SESSION_STORE` tersedia (DATABASE_URL ada), setiap sesi
 *   ditulis-lanjut (write-through) ke tabel `auth_sessions` dan cache in-memory dihidrasi
 *   saat boot, sehingga sesi selamat dari restart. Store bersifat BEST-EFFORT: kegagalan DB
 *   tidak pernah menjatuhkan auth — jawaban selalu dilayani dari cache in-memory, yang juga
 *   membuat seluruh perilaku fase 1 (tanpa DATABASE_URL) identik.
 *
 * - `LOCAL_OWNER` ('user-local') tetap nilai fallback kontrak: request tanpa sesi valid
 *   dianggap pemilik tunggal fase ini — perilaku lama 100% utuh.
 */
import { randomBytes, createHash } from 'crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { SESSION_STORE, SessionStore } from './session.store';

/** Fallback ownerId fase single-user (nilai kontrak lama, jangan diubah). */
export const LOCAL_OWNER = 'user-local';

interface SessionRecord {
  ownerId: string;
  expiresAt: number;
}

const DEFAULT_TTL_SEC = 7 * 24 * 60 * 60; // 7 hari

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class SessionService {
  /** key = SHA-256(token); token mentah tidak pernah berada di memori ini. */
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly logger = new Logger(SessionService.name);
  private hydrated: Promise<void> | null = null;

  constructor(@Optional() @Inject(SESSION_STORE) private readonly store?: SessionStore | null) {}

  /** Best-effort: kegagalan store tidak boleh merambat ke jalur request. */
  private quiet(op: string, run: () => Promise<unknown>): void {
    void Promise.resolve()
      .then(run)
      .catch((err) => this.logger.warn(`session store ${op} gagal: ${(err as Error).message}`));
  }

  /**
   * Hidrasi cache dari `auth_sessions` (dipanggil saat bootstrap; idempoten).
   * Tanpa store → no-op, jadi jalur in-memory fase 1 tidak berubah sama sekali.
   */
  async hydrate(): Promise<void> {
    if (!this.store) return;
    if (!this.hydrated) {
      this.hydrated = (async () => {
        const rows = await this.store!.loadActive();
        const now = Date.now();
        for (const row of rows) {
          if (row.expiresAt > now) {
            this.sessions.set(row.tokenHash, { ownerId: row.ownerId, expiresAt: row.expiresAt });
          }
        }
        this.logger.log(`hidrasi sesi: ${this.sessions.size} sesi aktif dipulihkan dari auth_sessions`);
      })().catch((err) => {
        this.hydrated = null;
        this.logger.warn(`hidrasi sesi gagal: ${(err as Error).message}`);
      });
    }
    return this.hydrated ?? undefined;
  }

  issue(ownerId: string = LOCAL_OWNER, ttlSec: number = DEFAULT_TTL_SEC): { token: string; expiresAt: Date } {
    const ttl = Math.max(60, Math.floor(Number(ttlSec) || DEFAULT_TTL_SEC));
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + ttl * 1000;
    const tokenHash = sha256(token);
    this.sessions.set(tokenHash, { ownerId, expiresAt });
    if (this.store) {
      this.quiet('save', () => this.store!.save({ tokenHash, ownerId, expiresAt }));
      this.quiet('purgeExpired', () => this.store!.purgeExpired());
    }
    return { token, expiresAt: new Date(expiresAt) };
  }

  /** ownerId bila token valid & belum kadaluarsa; selain itu `null` (fallback ke LOCAL_OWNER oleh pemanggil). */
  resolve(token?: string | string[] | readonly string[]): string | null {
    const raw = Array.isArray(token) ? token[0] : token;
    if (typeof raw !== 'string' || raw.length === 0) return null;
    const key = sha256(raw.trim());
    const record = this.sessions.get(key);
    if (!record) return null;
    if (Date.now() >= record.expiresAt) {
      this.sessions.delete(key);
      if (this.store) this.quiet('remove', () => this.store!.remove(key));
      return null;
    }
    return record.ownerId;
  }

  /**
   * Cabut sesi (ADR-024 §2.2 — logout). Idempoten & tidak membocorkan keberadaan token:
   * memanggilnya dengan token asing tetap sukses tanpa efek.
   */
  revoke(token?: string | string[] | readonly string[]): void {
    const raw = Array.isArray(token) ? token[0] : token;
    if (typeof raw !== 'string' || raw.length === 0) return;
    const key = sha256(raw.trim());
    this.sessions.delete(key);
    if (this.store) this.quiet('remove', () => this.store!.remove(key));
  }

  size(): number {
    return this.sessions.size;
  }
}
