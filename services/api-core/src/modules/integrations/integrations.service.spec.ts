import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from '../security/crypto.service';
import { InMemoryIntegrationsRepository } from './in-memory-integrations.repository';
import { IntegrationsService } from './integrations.service';
import { stripSensitive } from '../security/secret-redaction';
import { NullProvider } from './providers/null.provider';
import { Mt5Provider, ProviderAccount, ProviderTestResult, AccountSnapshot } from './providers/mt5-provider';
import { NormalizedClosedDeal } from '../trading/mt5-payload';

const SECRET = 'Invest0r-ReadOnly-91827364';

/** Records what the provider was handed so the read-only contract can be asserted. */
class SpyProvider implements Mt5Provider {
  readonly id = 'mock' as const;
  seen: ProviderAccount[] = [];
  snapshot: AccountSnapshot = {
    balance: 9_900,
    equity: 10_145.5,
    margin: 320,
    currency: 'USD',
    serverTime: '2026-08-29T10:00:00.000Z',
  };
  constructor(private readonly failWith?: string) {}
  async testAccount(account: ProviderAccount): Promise<ProviderTestResult> {
    this.seen.push(account);
    if (this.failWith) throw new Error(this.failWith);
    return { ok: true, provider: this.id, mode: 'read-only', message: 'Koneksi read-only OK.', supported: true, snapshot: this.snapshot };
  }
  async getSnapshot(): Promise<AccountSnapshot> {
    return this.snapshot;
  }
  async getDeals(): Promise<NormalizedClosedDeal[]> {
    return [];
  }
}

const validBody = () => ({
  type: 'MT5_CLOUD',
  label: 'HFM Live',
  login: '700001',
  server: 'HFM-Demo01',
  port: 443,
  investor_password: SECRET,
});

describe('IntegrationsService — custody, sealing, and non-leaky responses (M2)', () => {
  let repo: InMemoryIntegrationsRepository;
  let crypto: CryptoService;
  let provider: SpyProvider;
  let service: IntegrationsService;

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    repo = new InMemoryIntegrationsRepository();
    crypto = new CryptoService();
    provider = new SpyProvider();
    service = new IntegrationsService(repo, crypto, provider);
  });

  it('stores ONLY an AES-GCM envelope; the plaintext never touches the row', async () => {
    const { integration } = await service.create(validBody() as any);
    const row = await repo.find(integration.id);

    expect(row).not.toBeNull();
    expect(row!.credentialCipher).not.toContain(SECRET);
    expect(CryptoService.looksLikeEnvelope(row!.credentialCipher)).toBe(true);
    // ...and the envelope really decrypts back to the investor password (round-trip).
    expect(crypto.decrypt(row!.credentialCipher)).toBe(SECRET);
  });

  it('no response shape carries credential fields — not even nested', async () => {
    const created = await service.create(validBody() as any);
    expect(JSON.stringify(created)).not.toContain(SECRET);
    expect('credentialCipher' in created.integration).toBe(false);
    expect(created.integration).toMatchObject({
      type: 'MT5_CLOUD',
      login: '700001',
      enabled: true,
      hasCredential: true,
      credentialMode: 'investor-read-only',
      credentialAlgorithm: 'AES-256-GCM',
    });
    expect(created.notice).toMatch(/ganti investor password/i);

    const list = await service.list();
    expect(JSON.stringify(list)).not.toContain(SECRET);
    // The global interceptor must have nothing left to hide, i.e. double-stripping is a no-op:
    expect(stripSensitive(list)).toEqual(list);
  });

  it('refuses master password at the API level with actionable copy', async () => {
    await expect(
      service.create({ ...validBody(), master_password: 'tidak-boleh' } as any)
    ).rejects.toThrow(/investor password \(read-only\)/);
    expect(await repo.list()).toHaveLength(0);
  });

  it('rejects duplicate (owner,type,login) instead of silently overwriting', async () => {
    await service.create(validBody() as any);
    await expect(service.create(validBody() as any)).rejects.toThrow(/sudah terdaftar/);
  });

  it('PATCH rotates the credential (new envelope) and toggles enabled without touching it', async () => {
    const { integration } = await service.create(validBody() as any);
    const before = (await repo.find(integration.id))!.credentialCipher;

    const rotated = await service.update(integration.id, { investor_password: 'N3w-Invest0r-Pass' } as any);
    const after = (await repo.find(integration.id))!;
    expect(after.credentialCipher).not.toBe(before);
    expect(crypto.decrypt(after.credentialCipher)).toBe('N3w-Invest0r-Pass');
    expect(JSON.stringify(rotated)).not.toContain('N3w-Invest0r-Pass');

    const toggled = await service.update(integration.id, { enabled: false } as any);
    expect(toggled.enabled).toBe(false);
    expect(crypto.decrypt((await repo.find(integration.id))!.credentialCipher)).toBe('N3w-Invest0r-Pass');
  });

  it('DELETE shreds the credential (disconnect) and answers with the rotation notice', async () => {
    const { integration } = await service.create(validBody() as any);
    const removed = await service.remove(integration.id);
    expect(removed.status).toBe('removed');
    expect(await repo.find(integration.id)).toBeNull();
    await expect(service.remove(integration.id)).rejects.toThrow(/not found/);
  });

  it('test-connection decrypts for the provider, reports read-only, and never leaks the secret', async () => {
    const { integration } = await service.create(validBody() as any);
    const result = await service.testConnection(integration.id);

    expect(result).toMatchObject({ ok: true, mode: 'read-only', provider: 'mock' });
    expect(result.snapshot?.equity).toBe(10_145.5);
    expect(JSON.stringify(result)).not.toContain(SECRET);
    // read-only doctrine: what the provider receives is the investor password, nothing else
    expect(provider.seen[0]).toMatchObject({ login: '700001', server: 'HFM-Demo01', port: 443 });
    expect(provider.seen[0].password).toBe(SECRET);
  });

  it('unsupported server / vendor outage -> friendly message, no stack trace', async () => {
    const failing = new IntegrationsService(repo, crypto, new SpyProvider('HTTP 404: server "UNKNOWN-BROKER" not found in connector coverage'));
    const { integration } = await service.create(validBody() as any);
    const result = await failing.testConnection(integration.id);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak didukung konektor cloud|Impor statement/i);
    expect(JSON.stringify(result)).not.toContain('stack');
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it('with the connector off the probe is a no-op with guidance (CI/flag-off contract)', async () => {
    const off = new IntegrationsService(repo, crypto, new NullProvider());
    const { integration } = await service.create(validBody() as any);
    const result = await off.testConnection(integration.id);
    expect(result).toMatchObject({ ok: false, provider: 'null', mode: 'read-only', supported: false });
    expect(result.message).toMatch(/MT5_CLOUD_ENABLED=false/);
  });

  it('unknown id -> 404, empty patch -> 400', async () => {
    await expect(service.get('missing')).rejects.toThrow(/not found/);
    const { integration } = await service.create(validBody() as any);
    await expect(service.update(integration.id, {} as any)).rejects.toThrow(/Tidak ada perubahan/);
  });
});

/** ADR-023: ownerId selalu dari server — field dari klien diabaikan, param konteks dihormati. */
describe('IntegrationsService — kepemilikan (ADR-023)', () => {
  let repo: InMemoryIntegrationsRepository;
  let crypto: CryptoService;
  let provider: SpyProvider;
  let service: IntegrationsService;

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    repo = new InMemoryIntegrationsRepository();
    crypto = new CryptoService();
    provider = new SpyProvider();
    service = new IntegrationsService(repo, crypto, provider);
  });

  it('body.ownerId dari klien DIABAIKAN — baris selalu milik fallback user-local', async () => {
    const { integration } = await service.create({ ...validBody(), ownerId: 'penyusup' } as any);
    const row = await repo.find(integration.id);
    expect(row!.ownerId).toBe('user-local');
    const listed = await service.list('user-local');
    expect(listed.integrations.map((i) => i.id)).toContain(integration.id);
  });

  it('owner dari konteks sesi (param) dipakai sebagai pemilik baris', async () => {
    const { integration } = await service.create(validBody() as any, 'owner-sesi-A');
    const row = await repo.find(integration.id);
    expect(row!.ownerId).toBe('owner-sesi-A');
    const forA = await service.list('owner-sesi-A');
    const forLocal = await service.list('user-local');
    expect(forA.integrations.map((i) => i.id)).toContain(integration.id);
    expect(forLocal.integrations.map((i) => i.id)).not.toContain(integration.id);
  });
});
