import { describe, expect, it } from 'vitest';
import {
  computeNetPnl,
  dealKey,
  normalizeClosedDeal,
  normalizeMt5SyncPayload,
} from './mt5-payload';

describe('normalizeMt5SyncPayload — bridge dialect (v1.1 SakuBridge)', () => {
  it('reads account_id + bridge deal fields', () => {
    const r = normalizeMt5SyncPayload({
      account_id: '1048291',
      broker: 'HFM MT5',
      currency: 'USD',
      balance: 25000,
      equity: 25400,
      margin: 1200,
      free_margin: 24200,
      timestamp: 1_760_000_000,
      closed_deals: [
        { ticket: 910001, symbol: 'EURUSD', type: 'BUY', lots: 0.5, profit: 120.5, closed_at: 1_760_000_000 },
      ],
    });

    expect(r.errors).toEqual([]);
    expect(r.account).toBe('1048291');
    expect(r.currency).toBe('USD');
    expect(r.snapshot.equity).toBe(25400);
    expect(r.snapshot.freeMargin).toBe(24200);
    expect(r.deals).toHaveLength(1);
    expect(r.deals[0]).toMatchObject({
      ticket: '910001',
      symbol: 'EURUSD',
      type: 'BUY',
      pnl: 120.5,
    });
    expect(r.deals[0].time).toBe(new Date(1_760_000_000 * 1000).toISOString());
  });

  it('rejects payloads without an account (400 surface)', () => {
    const r = normalizeMt5SyncPayload({ currency: 'USD', closed_deals: [{ ticket: 1, profit: 5 }] });
    expect(r.errors).toContain('account (or account_id / account_info.login) is required.');
  });
});

describe('normalizeMt5SyncPayload — provider dialect (ADR-022 / MetaApi)', () => {
  it('accepts {account, account_info, closed_deals:[{login,ticket,time,time_msc,entry,profit,commission,swap,balance,pnl}]}', () => {
    const r = normalizeMt5SyncPayload({
      account: '7788123',
      currency: 'USD',
      account_info: { login: 7788123, server: 'HFM-Server01', balance: 10_000, equity: 10_250.5, currency: 'USD' },
      closed_deals: [
        {
          login: 7788123,
          ticket: 44001,
          time: '2026-08-28T09:15:00Z',
          time_msc: 1_758_993_300_000,
          type: 'SELL',
          entry: 'DEAL_ENTRY_OUT',
          profit: 300,
          commission: -6,
          swap: -1.5,
          balance: 10_292.5,
          currency: 'USD',
          pnl: 292.5,
        },
      ],
    });

    expect(r.errors).toEqual([]);
    expect(r.account).toBe('7788123');
    expect(r.deals[0]).toMatchObject({
      ticket: '44001',
      login: '7788123',
      type: 'SELL',
      entry: 'OUT',
      profit: 300,
      commission: -6,
      swap: -1.5,
      pnl: 292.5,
      balance: 10_292.5,
    });
    // time_msc wins over the ISO string (millisecond precision from the platform).
    expect(r.deals[0].time).toBe('2025-09-27T17:15:00.000Z');
    expect(r.deals[0].timeMsc).toBe(1_758_993_300_000);
  });

  it('a deal without any id is skipped with a warning, not fatal', () => {
    const r = normalizeMt5SyncPayload({ account: '1', closed_deals: [{ profit: 10 }, { ticket: 0, profit: 7 }] });
    expect(r.deals.map((d) => d.ticket)).toEqual(['0']);
    expect(r.warnings).toContain('closed_deal skipped: no ticket/deal/order id');
  });
});

describe('computeNetPnl', () => {
  it('prefers an explicit net pnl', () => {
    expect(computeNetPnl({ profit: 100, commission: -5, swap: -2, pnl: 42 }).pnl).toBe(42);
  });

  it('sums signed commission & swap when pnl is absent', () => {
    expect(computeNetPnl({ profit: 100, commission: -5, swap: -2 }).pnl).toBe(93);
  });

  it('warns when commission arrives positive (possible double netting)', () => {
    const r = computeNetPnl({ profit: 100, commission: 5 });
    expect(r.warnings[0]).toMatch(/positive/);
  });
});

describe('dealKey / normalizeClosedDeal', () => {
  it('builds the processed_deals dedupe key', () => {
    expect(dealKey('1048291', '910001')).toBe('1048291:910001');
  });

  it('falls back to deal/order ids and stringifies numbers', () => {
    const { deal } = normalizeClosedDeal({ order: 512, profit: '-3.25' });
    expect(deal?.ticket).toBe('512');
    expect(deal?.pnl).toBe(-3.25);
  });
});
