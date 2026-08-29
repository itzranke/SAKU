import { describe, expect, it } from 'vitest';
import { MockProvider } from './mock.provider';
import { MetaApiProvider, assertReadOnlyPath, friendlyError } from './metaapi.provider';

const account = {
  integrationAccountId: 'int-1',
  login: '8800001',
  server: 'Mock-Demo',
  port: null,
  password: 'investor-secret',
  vendorAccountId: 'vendor-abc',
};

describe('MockProvider — determinisme fixture (M3)', () => {
  it('menghasilkan tepat 3 deal closed dengan net P&L bertanda', async () => {
    const deals = await new MockProvider().getDeals(account as any, '1970-01-01T00:00:00.000Z');
    expect(deals).toHaveLength(3);
    expect(deals.map((d) => d.ticket)).toEqual(['8800001', '8800002', '8800003']);
    expect(deals.map((d) => d.pnl)).toEqual([205.8, -86.8, 48.5]);
    expect(deals.every((d) => d.entry === 'OUT' && d.symbol && d.time)).toBe(true);
    expect(deals[0].type).toBe('SELL');
    expect(deals[1].type).toBe('BUY');
  });

  it('filter `since` membuang deal lama (watermark scheduler)', async () => {
    const p = new MockProvider();
    const afterAug28 = await p.getDeals(account as any, '2026-08-28T00:00:00.000Z');
    expect(afterAug28.map((d) => d.ticket)).toEqual(['8800002', '8800003']);
  });

  it('snapshot berubah deterministik: panggilan pertama vs berikutnya', async () => {
    const p = new MockProvider();
    const first = await p.getSnapshot(account as any);
    const second = await p.getSnapshot(account as any);
    const third = await p.getSnapshot(account as any);
    expect(first).toMatchObject({ balance: 10_000, equity: 10_072.5, currency: 'USD' });
    expect(second).toMatchObject({ balance: 10_072.5, equity: 10_145.25 });
    expect(third.equity).toBe(second.equity);
    p.reset();
    expect((await p.getSnapshot(account as any)).equity).toBe(10_072.5);
  });

  it('testAccount selalu read-only OK tanpa I/O', async () => {
    const res = await new MockProvider().testAccount(account as any);
    expect(res).toMatchObject({ ok: true, mode: 'read-only', provider: 'mock', supported: true });
    expect(res.message).not.toContain('investor-secret');
  });
});

describe('MetaApi REST mapping (fetch disuntik — CI tidak menyentuh vendor)', () => {
  const calls: Array<{ url: string; method: string; headers: any; body?: string }> = [];
  const responses: Record<string, unknown> = {
    'account-information': {
      broker: 'True ECN Trading Ltd',
      currency: 'USD',
      server: 'ICMarketsSC-Demo',
      balance: 7319.9,
      equity: 7306.65,
      margin: 184.1,
      freeMargin: 7120.22,
      login: 367906877,
    },
    'history-deals': [
      {
        id: '46648037',
        commission: -0.42,
        entryType: 'DEAL_ENTRY_OUT',
        profit: 12.5,
        swap: -0.1,
        symbol: 'AUDNZD',
        time: '2026-08-28T05:30:04.361Z',
        type: 'DEAL_TYPE_SELL',
        volume: 0.12,
        price: 1.05068,
      },
      {
        id: '46648099',
        commission: 0,
        entryType: 'DEAL_ENTRY_IN',
        profit: 0,
        swap: 0,
        symbol: 'AUDNZD',
        time: '2026-08-27T05:30:04.361Z',
        type: 'DEAL_TYPE_BUY',
        volume: 0.12,
        price: 1.048,
      },
    ],
  };

  const provider = new MetaApiProvider({
    token: 'metaapi-token-xyz',
    region: 'new-york',
    clientBaseUrl: 'https://mt-client-api-v1.new-york.agiliumtrade.ai',
    provisioningBaseUrl: 'https://mt-provisioning-api-v1.agiliumtrade.ai',
    timeoutMs: 5000,
    fetchImpl: async (url: string, init: any) => {
      calls.push({ url, method: init?.method ?? 'GET', headers: init?.headers, body: init?.body });
      const key = url.includes('account-information')
        ? 'account-information'
        : url.includes('history-deals')
        ? 'history-deals'
        : 'other';
      const body = (responses as any)[key] ?? {};
      return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
    },
  });

  it('GET account-information memakai header auth-token dan memetakan snapshot', async () => {
    const snap = await provider.getSnapshot({ ...account, vendorAccountId: 'acct-9' } as any);
    expect(snap).toMatchObject({ balance: 7319.9, equity: 7306.65, margin: 184.1, currency: 'USD' });
    const last = calls[calls.length - 1];
    expect(last.method).toBe('GET');
    expect(last.url).toContain('/users/current/accounts/acct-9/account-information');
    expect(last.url).toContain('refreshTerminalState=true');
    expect(last.headers['auth-token']).toBe('metaapi-token-xyz');
  });

  it('history-deals dipetakan ke bentuk closed_deals M1 (id→ticket, DEAL_TYPE_*, net pnl)', async () => {
    const deals = await provider.getDeals({ ...account, vendorAccountId: 'acct-9' } as any, '2026-08-01T00:00:00.000Z');
    expect(deals).toHaveLength(2);
    expect(deals[0]).toMatchObject({
      ticket: '46648037',
      symbol: 'AUDNZD',
      type: 'SELL',
      entry: 'OUT',
      lots: 0.12,
      closePrice: 1.05068,
      pnl: 11.98, // 12.5 - 0.42 - 0.1
      time: '2026-08-28T05:30:04.361Z',
    });
    expect(deals[1]).toMatchObject({ entry: 'IN', openPrice: 1.048, pnl: 0 });
    const url = calls[calls.length - 1].url;
    expect(url).toContain('/users/current/accounts/acct-9/history-deals/time/');
    expect(decodeURIComponent(url)).toContain('2026-08-01T00:00:00.000Z');
    expect(decodeURIComponent(url)).toContain('limit=1000');
  });

  it('tanpa vendorAccountId: akun read-only diprovisioning sekali (POST) lalu dipakai lagi', async () => {
    const p = new MetaApiProvider({
      token: 'tok',
      region: 'new-york',
      clientBaseUrl: 'https://mt-client-api-v1.new-york.agiliumtrade.ai',
      provisioningBaseUrl: 'https://mt-provisioning-api-v1.agiliumtrade.ai',
      timeoutMs: 5000,
      fetchImpl: async (url: string, init: any) => {
        calls.push({ url, method: init?.method ?? 'GET', headers: init?.headers, body: init?.body });
        const key = url.includes('account-information')
          ? 'account-information'
          : url.includes('history-deals')
          ? 'history-deals'
          : 'other';
        const body = (responses as any)[key] ?? { id: 'acct-new' };
        return { ok: true, status: 200, json: async () => body, text: async () => '' };
      },
    });
    const noVendor = { ...account, vendorAccountId: null };
    await p.getSnapshot(noVendor as any);
    const provisioning = calls.filter((c) => c.method === 'POST');
    expect(provisioning.map((c) => c.url)).toEqual([
      'https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts?region=new-york',
      'https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts/acct-new/start',
    ]);
    const payload = JSON.parse(provisioning[0].body!);
    expect(payload).toMatchObject({ platform: 'mt5', type: 'cloud', login: '8800001', server: 'Mock-Demo' });
    expect(payload.password).toBe('investor-secret'); // yang dikirim = investor password user
  });

  it('hanya endpoint read-only yang boleh dipanggil (guard)', () => {
    expect(() => assertReadOnlyPath('GET', 'https://x/users/current/accounts/a/account-information')).not.toThrow();
    expect(() => assertReadOnlyPath('GET', 'https://x/users/current/accounts/a/positions')).toThrow(/read-only violation/);
    expect(() => assertReadOnlyPath('GET', 'https://x/users/current/accounts/a/trade')).toThrow(/read-only violation/);
    expect(() => assertReadOnlyPath('POST', 'https://x/users/current/accounts/a/close-position')).toThrow(/read-only violation/);
    expect(() => assertReadOnlyPath('POST', 'https://x/users/current/accounts?region=r')).not.toThrow();
    expect(() => assertReadOnlyPath('POST', 'https://x/users/current/accounts/a/start')).not.toThrow();
  });

  it('tanpa METAAPI_TOKEN: testAccount gagal dengan saran, bukan exception', async () => {
    const p = new MetaApiProvider({
      token: '',
      region: 'new-york',
      clientBaseUrl: 'https://x',
      provisioningBaseUrl: 'https://y',
      timeoutMs: 1000,
      fetchImpl: async () => {
        throw new Error('harus tidak dipanggil');
      },
    });
    const res = await p.testAccount(account as any);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/METAAPI_TOKEN/);
  });

  it('pesan error vendor diterjemahkan (E_AUTH / E_SRV_NOT_FOUND / kuota)', () => {
    expect(friendlyError('E_AUTH')).toMatch(/investor password \(read-only\) ditolak/);
    expect(friendlyError('E_SRV_NOT_FOUND')).toMatch(/tidak didukung konektor|Impor statement/i);
    expect(friendlyError('402 payment required')).toMatch(/Kuota/);
    expect(friendlyError('')).toMatch(/tidak didukung/);
  });
});
