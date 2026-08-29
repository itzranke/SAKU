/**
 * ADR-023 fase 1: sesi server-side — token acak, hanya hash yang tersimpan, TTL berlaku,
 * token asing → null (pemanggil memfallback ke LOCAL_OWNER).
 */
import { describe, expect, it } from 'vitest';
import { LOCAL_OWNER, SessionService } from './session.service';

describe('SessionService (ADR-023)', () => {
  it('menerbitkan token yang bisa di-resolve kembali ke ownerId-nya', () => {
    const sessions = new SessionService();
    const { token, expiresAt } = sessions.issue('owner-A');
    expect(token.length).toBeGreaterThan(30);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(sessions.resolve(token)).toBe('owner-A');
    expect(sessions.size()).toBe(1);
  });

  it('token asing / kosong / malformed → null (fallback kecil milik pemanggil)', () => {
    const sessions = new SessionService();
    sessions.issue('owner-A');
    expect(sessions.resolve('token-ngarang')).toBeNull();
    expect(sessions.resolve(undefined)).toBeNull();
    expect(sessions.resolve('')).toBeNull();
    expect(sessions.resolve(['bukan-token'])).toBeNull();
  });

  it('yang tersimpan HANYA hash (hex 64) — token mentah tidak berada di memori', () => {
    const sessions = new SessionService();
    const { token } = sessions.issue('owner-A');
    for (const key of (sessions as any).sessions.keys()) {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
      expect(key).not.toBe(token);
    }
  });

  it('sesi kadaluarsa → null dan dibuang', () => {
    const sessions = new SessionService();
    const { token } = sessions.issue('owner-A', 1); // TTL minimal 60s di-issue(); uji lewat record:
    const key = [...(sessions as any).sessions.keys()][0];
    (sessions as any).sessions.get(key).expiresAt = Date.now() - 1;
    expect(sessions.resolve(token)).toBeNull();
    expect(sessions.size()).toBe(0);
  });

  it('LOCAL_OWNER tetap "user-local" (kontrak lama, jangan berubah diam-diam)', () => {
    expect(LOCAL_OWNER).toBe('user-local');
    const sessions = new SessionService();
    const { token } = sessions.issue();
    expect(sessions.resolve(token)).toBe('user-local');
  });
});
