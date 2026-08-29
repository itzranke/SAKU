/**
 * MockProvider — deterministic fixtures for tests, demos and offline development (ADR-022 M3).
 *
 * Contract the CI smoke test and the web UI rely on:
 *  - exactly THREE closed deals, all with non-zero net P&L, fixed tickets & timestamps;
 *  - TWO snapshot states: the first `getSnapshot()` of a process returns the "before" equity,
 *    every later call returns the "after" one, so the health card visibly moves without a vendor;
 *  - never performs I/O of any kind.
 */
import { Injectable } from '@nestjs/common';
import { NormalizedClosedDeal, normalizeClosedDeal } from '../../trading/mt5-payload';
import { AccountSnapshot, Mt5Provider, ProviderAccount, ProviderTestResult } from './mt5-provider';

const SNAPSHOT_BEFORE: Omit<AccountSnapshot, 'serverTime'> = {
  balance: 10_000,
  equity: 10_072.5,
  margin: 240.75,
  currency: 'USD',
};
const SNAPSHOT_AFTER: Omit<AccountSnapshot, 'serverTime'> = {
  balance: 10_072.5,
  equity: 10_145.25,
  margin: 318.4,
  currency: 'USD',
};

/** Raw MT5-style deal records (provider dialect) — normalized on the way out. */
const RAW_DEALS = [
  {
    ticket: 8_800_001,
    symbol: 'EURUSD',
    type: 'DEAL_TYPE_SELL',
    entryType: 'DEAL_ENTRY_OUT',
    time: '2026-08-27T08:15:00.000Z',
    volume: 0.5,
    price: 1.08421,
    profit: 210.5,
    commission: -3.5,
    swap: -1.2,
  },
  {
    ticket: 8_800_002,
    symbol: 'XAUUSD',
    type: 'DEAL_TYPE_BUY',
    entryType: 'DEAL_ENTRY_OUT',
    time: '2026-08-28T19:40:30.000Z',
    volume: 0.2,
    price: 2_318.44,
    profit: -84.2,
    commission: -2,
    swap: -0.6,
  },
  {
    ticket: 8_800_003,
    symbol: 'GBPJPY',
    type: 'DEAL_TYPE_BUY',
    entryType: 'DEAL_ENTRY_OUT',
    time: '2026-08-29T01:05:00.000Z',
    volume: 0.3,
    price: 195.612,
    profit: 48.5,
    commission: 0,
    swap: 0,
  },
];

const MOCK_LOGIN = '8800001';

@Injectable()
export class MockProvider implements Mt5Provider {
  readonly id = 'mock' as const;
  private snapshotCalls = 0;

  async testAccount(account: ProviderAccount): Promise<ProviderTestResult> {
    return {
      ok: true,
      provider: this.id,
      mode: 'read-only',
      supported: true,
      message: `Mock read-only OK untuk login ${account.login}@${account.server} (fixtures deterministik, tanpa vendor).`,
      snapshot: await this.getSnapshot(account),
    };
  }

  async getSnapshot(_account: ProviderAccount): Promise<AccountSnapshot> {
    const base = this.snapshotCalls++ === 0 ? SNAPSHOT_BEFORE : SNAPSHOT_AFTER;
    return { ...base, serverTime: new Date(`${base === SNAPSHOT_BEFORE ? '2026-08-29T09:00' : '2026-08-29T09:02'}:00.000Z`).toISOString() };
  }

  async getDeals(account: ProviderAccount, sinceIso: string): Promise<NormalizedClosedDeal[]> {
    const login = account.login || MOCK_LOGIN;
    return RAW_DEALS.map((raw) => {
      const { deal } = normalizeClosedDeal({ ...raw, login, currency: SNAPSHOT_BEFORE.currency }, login);
      return deal!;
    }).filter((d) => !sinceIso || !d.time || d.time > sinceIso);
  }

  /** Test helper: makes the two-state snapshot reproducible inside one process. */
  reset(): void {
    this.snapshotCalls = 0;
  }
}
