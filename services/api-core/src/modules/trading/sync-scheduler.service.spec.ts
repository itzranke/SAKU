import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from '../security/crypto.service';
import { InMemoryIntegrationsRepository } from '../integrations/in-memory-integrations.repository';
import { IntegrationsService } from '../integrations/integrations.service';
import { InMemoryLedgerRepository } from '../ledger/in-memory-ledger.repository';
import { LedgerService } from '../ledger/ledger.service';
import { TradingService } from './trading.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { MockProvider } from '../integrations/providers/mock.provider';
import { NullProvider } from '../integrations/providers/null.provider';
import { Mt5Provider, ProviderAccount, ProviderTestResult, AccountSnapshot } from '../integrations/providers/mt5-provider';
import { NormalizedClosedDeal } from './mt5-payload';

/** Counts every provider interaction so "flag off => zero outbound call" is provable. */
class CountingProvider implements Mt5Provider {
  calls = { test: 0, snapshot: 0, deals: 0 };
  constructor(private readonly inner: Mt5Provider) {
    this.id = inner.id;
  }
  readonly id: Mt5Provider['id'];
  async testAccount(a: ProviderAccount): Promise<ProviderTestResult> {
    this.calls.test++;
    return this.inner.testAccount(a);
  }
  async getSnapshot(a: ProviderAccount): Promise<AccountSnapshot> {
    this.calls.snapshot++;
    return this.inner.getSnapshot(a);
  }
  async getDeals(a: ProviderAccount, since: string): Promise<NormalizedClosedDeal[]> {
    this.calls.deals++;
    return this.inner.getDeals(a, since);
  }
}

const SECRET = 'investor-read-only-secret';

async function harness(provider: Mt5Provider) {
  process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
  const ledgerRepo = new InMemoryLedgerRepository();
  const ledger = new LedgerService(ledgerRepo);
  const trading = new TradingService(ledger);
  const intRepo = new InMemoryIntegrationsRepository();
  const crypto = new CryptoService();
  const integrations = new IntegrationsService(intRepo, crypto, provider);
  const scheduler = new SyncSchedulerService(integrations, trading, provider, intRepo as any);
  await integrations.create({
    type: 'MT5_CLOUD',
    label: 'HFM Live',
    login: '8800001',
    server: 'Mock-Demo01',
    investor_password: SECRET,
  } as any);
  return { scheduler, trading, ledger, ledgerRepo, intRepo, integrations, crypto };
}

describe('SyncSchedulerService (M3 inti pivot)', () => {
  let ctx: Awaited<ReturnType<typeof harness>>;
  let counting: CountingProvider;

  beforeEach(async () => {
    counting = new CountingProvider(new MockProvider());
    ctx = await harness(counting);
  });

  it('jalur mock: snapshot cache terisi + 3 deal jadi jurnal TRADING_PROFIT ber-source MT5_SYNC', async () => {
    const res = await ctx.scheduler.syncNow();
    expect(res).toMatchObject({ provider: 'mock', journalized: 3, skipped: 0 });
    expect(res.accounts[0]).toMatchObject({ login: '8800001', journalized: 3, equity: 10_072.5 });

    const overview = await ctx.scheduler.overview();
    expect(overview.state).toMatchObject({ equity: 10_072.5, currency: 'USD' });
    expect(overview.accounts[0]).toMatchObject({ label: 'HFM Live', login: '8800001', enabled: true });

    const journals = (await ctx.ledger.getJournals(200)).journals.filter(
      (j) => j.source === 'MT5_SYNC' && j.description.includes('#88000')
    );
    expect(journals).toHaveLength(3);
    expect(journals.map((j) => j.description).join(' ')).toMatch(/#8800001/);
    // net P&L 205.8 USD -> base IDR via rate 15500
    const win = journals.find((j) => j.description.includes('#8800001'))!;
    expect(win.entries.find((e) => e.accountCode === '1400')!.amount).toBeCloseTo(205.8, 4);
  });

  it('idempoten lintas tick: watermark + processed_deals membuat pass kedua nol jurnal', async () => {
    const first = await ctx.scheduler.syncNow();
    const second = await ctx.scheduler.syncNow();
    expect(first.journalized).toBe(3);
    expect(second.journalized).toBe(0);
    expect(second.skipped).toBeGreaterThanOrEqual(0); // watermark membuang deal sebelum pipeline
    const journals = (await ctx.ledger.getJournals(200)).journals.filter(
      (j) => j.source === 'MT5_SYNC' && j.description.includes('#88000')
    );
    expect(journals).toHaveLength(3);
  });

  it('snapshot TIDAK PERNAH menulis jurnal (doktrin immutable)', async () => {
    const before = (await ctx.ledger.getSnapshot()).totals;
    await ctx.scheduler.syncNow();
    const cached = await ctx.intRepo.listAccountState!();
    expect(cached[0].equity).toBe(10_072.5);
    // jurnal bertambah HANYA karena deal; total aset berubah = 3 jurnal P&L, bukan karena saldo mentah
    const after = (await ctx.ledger.getSnapshot()).totals;
    expect(after.journalCount).toBe(before.journalCount + 3);
    expect(after.netWorthIDR).not.toBe(before.netWorthIDR);
  });

  it('flag OFF (NullProvider): tidak ada panggilan provider sama sekali, overview kosong tanpa error', async () => {
    const spy = new CountingProvider(new NullProvider());
    const off = await harness(spy);
    // MT5_CLOUD_ENABLED tidak diset di test environment -> scheduler mati
    const res = await off.scheduler.syncNow();
    expect(res).toMatchObject({ provider: 'null', journalized: 0, skipped: 0 });
    expect(spy.calls).toEqual({ test: 0, snapshot: 0, deals: 0 });
    expect(off.scheduler.active()).toBe(false);

    const overview = await off.scheduler.overview();
    expect(overview.enabled).toBe(false);
    expect(overview.provider).toBe('null');
    expect(overview.state).toBeNull();
    expect(overview.notice).toMatch(/MT5_CLOUD_ENABLED=false/);
    // integrasi tetap terdaftar & kredensial aman, hanya tidak disinkron
    expect(overview.accounts).toHaveLength(1);
  });

  it('kabel provider error -> pesan ramah di hasil sync, tanpa stack trace & tanpa kredensial', async () => {
    const broken: Mt5Provider = {
      id: 'metaapi',
      testAccount: async () => {
        throw new Error('HTTP 404 E_SRV_NOT_FOUND for server UNKNOWN-BROKER');
      },
      getSnapshot: async () => {
        throw new Error('HTTP 404 E_SRV_NOT_FOUND for server UNKNOWN-BROKER');
      },
      getDeals: async () => [],
    };
    const env = process.env.MT5_CLOUD_ENABLED;
    process.env.MT5_CLOUD_ENABLED = 'true';
    try {
      const c = await harness(broken);
      const res = await c.scheduler.syncNow();
      expect(res.journalized).toBe(0);
      expect(res.accounts[0].error).toMatch(/tidak didukung|statement/i);
      expect(JSON.stringify(res)).not.toContain(SECRET);
      expect(JSON.stringify(res)).not.toContain('    at ');
    } finally {
      if (env === undefined) delete process.env.MT5_CLOUD_ENABLED;
      else process.env.MT5_CLOUD_ENABLED = env;
    }
  });

  it('integration nonaktif dilewati (toggle enabled)', async () => {
    const row = (await ctx.integrations.listRows())[0];
    await ctx.integrations.update(row.id, { enabled: false } as any);
    const res = await ctx.scheduler.syncNow();
    expect(res.accounts).toHaveLength(0);
    expect(res.journalized).toBe(0);
  });
});
