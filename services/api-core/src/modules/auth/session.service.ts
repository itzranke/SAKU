/**
 * SessionService (ADR-023 fase 1) — server-side sessions untuk kepemilikan data.
 *
 * - Token acak 32-byte (base64url) diterbitkan oleh verify-otp; server HANYA menyimpan
 *   SHA-256(token) → { ownerId, expiresAt } di memori. Token mentah tidak pernah disimpan
 *   dan tidak pernah di-log (hash saja).
 * - TTL default 7 hari (env `SAKU_SESSION_TTL_SEC`, minimal 60 detik). Restart proses =
 *   semua sesi gugur (diterima fase 1, lihat ADR-023 §2.4).
 * - `LOCAL_OWNER` ('user-local') tetap nilai fallback kontrak: request tanpa sesi valid
 *   dianggap pemilik tunggal fase ini — perilaku lama 100% utuh.
 */
import { randomBytes, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';

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

  issue(ownerId: string = LOCAL_OWNER, ttlSec: number = DEFAULT_TTL_SEC): { token: string; expiresAt: Date } {
    const ttl = Math.max(60, Math.floor(Number(ttlSec) || DEFAULT_TTL_SEC));
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + ttl * 1000;
    this.sessions.set(sha256(token), { ownerId, expiresAt });
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
      return null;
    }
    return record.ownerId;
  }

  size(): number {
    return this.sessions.size;
  }
}
