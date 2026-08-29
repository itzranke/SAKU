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

/**
 * ADR-024 fase 2: store persisten bersifat aditif & best-effort.
 * Kontrak yang diuji: write-through, hidrasi lintas "restart", revoke, dan — yang terpenting —
 * kegagalan store TIDAK PERNAH menjatuhkan auth.
 */
describe('SessionService + SessionStore (ADR-024 fase 2)', () => {
  const makeStore = () => {
    const rows = new Map<string, { tokenHash: string; ownerId: string; expiresAt: number }>();
    return {
      rows,
      loadActive: async () => [...rows.values()].filter((r) => r.expiresAt > Date.now()),
      save: async (s: { tokenHash: string; ownerId: string; expiresAt: number }) => {
        rows.set(s.tokenHash, s);
      },
      remove: async (h: string) => {
        rows.delete(h);
      },
      purgeExpired: async () => {
        for (const [k, v] of rows) if (v.expiresAt <= Date.now()) rows.delete(k);
      },
    };
  };
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('write-through: sesi baru tersimpan sebagai HASH di store (bukan token mentah)', async () => {
    const store = makeStore();
    const sessions = new SessionService(store);
    const { token } = sessions.issue('owner-A');
    await flush();
    expect(store.rows.size).toBe(1);
    const [row] = [...store.rows.values()];
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toBe(token);
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.ownerId).toBe('owner-A');
  });

  it('hidrasi: sesi tetap valid setelah proses "restart"', async () => {
    const store = makeStore();
    const first = new SessionService(store);
    const { token } = first.issue('owner-A');
    await flush();

    const afterRestart = new SessionService(store);
    expect(afterRestart.resolve(token)).toBeNull(); // belum dihidrasi
    await afterRestart.hydrate();
    expect(afterRestart.resolve(token)).toBe('owner-A');
  });

  it('hidrasi mengabaikan baris kadaluarsa', async () => {
    const store = makeStore();
    store.rows.set('a'.repeat(64), { tokenHash: 'a'.repeat(64), ownerId: 'owner-X', expiresAt: Date.now() - 1 });
    const sessions = new SessionService(store);
    await sessions.hydrate();
    expect(sessions.size()).toBe(0);
  });

  it('revoke: sesi hilang dari memori dan dari store, dan idempoten untuk token asing', async () => {
    const store = makeStore();
    const sessions = new SessionService(store);
    const { token } = sessions.issue('owner-A');
    await flush();
    sessions.revoke(token);
    await flush();
    expect(sessions.resolve(token)).toBeNull();
    expect(store.rows.size).toBe(0);
    expect(() => sessions.revoke('token-ngarang')).not.toThrow();
    expect(() => sessions.revoke(undefined)).not.toThrow();
  });

  it('store yang selalu gagal TIDAK menjatuhkan auth (best-effort)', async () => {
    const broken = {
      loadActive: async () => {
        throw new Error('db mati');
      },
      save: async () => {
        throw new Error('db mati');
      },
      remove: async () => {
        throw new Error('db mati');
      },
      purgeExpired: async () => {
        throw new Error('db mati');
      },
    };
    const sessions = new SessionService(broken);
    await expect(sessions.hydrate()).resolves.toBeUndefined();
    const { token } = sessions.issue('owner-A');
    await flush();
    expect(sessions.resolve(token)).toBe('owner-A'); // dilayani dari cache in-memory
  });

  it('tanpa store: perilaku fase 1 identik (hydrate = no-op)', async () => {
    const sessions = new SessionService();
    await expect(sessions.hydrate()).resolves.toBeUndefined();
    const { token } = sessions.issue('owner-A');
    expect(sessions.resolve(token)).toBe('owner-A');
  });
});
