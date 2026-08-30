import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryLedgerRepository } from '../ledger/in-memory-ledger.repository';
import { LedgerService } from '../ledger/ledger.service';
import { TradingService } from './trading.service';
import { RawMt5SyncPayload } from './mt5-payload';

/** Provider-dialect payload (ADR-022) with two closed deals + one zero-P&L deal. */
const payload = (account: string, prefix = 900): RawMt5SyncPayload =>
  ({
    account,
    currency: 'USD',
    account_info: { login: Number(account), server: 'HFM-Demo', balance: 10_000, equity: 10_150 },
    closed_deals: [
      { ticket: `${prefix}1`, profit: 100, commission: -4, swap: -1, pnl: 95, time_msc: 1_756_000_000_000 },
      { ticket: `${prefix}2`, profit: -50, commission: -2, swap: 0, time_msc: 1_756_000_600_000 },
      { ticket: `${prefix}3`, profit: 0, commission: 0, swap: 0, time_msc: 1_756_001_200_000 },
    ],
  }) as RawMt5SyncPayload;

describe('TradingService — M1 journalize + persistent-dedupe pipeline', () => {
  let repo: InMemoryLedgerRepository;
  let ledger: LedgerService;
  let trading: TradingService;

  beforeEach(() => {
    repo = new InMemoryLedgerRepository();
    ledger = new LedgerService(repo);
    trading = new TradingService(ledger);
  });

  it('journals net P&L per deal, skips zero-P&L, and reports journalized/skipped', async () => {
    const res = await trading.syncMt5Payload(payload('1048291'));

    expect(res.status).toBe('success');
    expect(res.account_id).toBe('1048291'); // legacy key still present
    expect(res.deals_received).toBe(3);
    expect(res.journalized).toBe(2);
    expect(res.journals_posted).toBe(2);
    expect(res.skipped).toBe(1); // the zero-P&L deal
    expect(res.duplicates_ignored).toBe(0);
    expect(res.posted.map((p) => p.ticket)).toEqual(['9001', '9002', '9003']);
    expect(res.posted[2].skipped).toBe('zero-profit');

    const journals = (await ledger.getJournals(200)).journals.filter(
      (j) => j.source === 'MT5_SYNC' && j.description.includes('#900')
    );
    expect(journals).toHaveLength(2);
    // +95 USD profit -> debit trading account, credit 4100 (rate 15500)
    const win = journals.find((j) => j.description.includes('#9001'))!;
    expect(win.txType).toBe('TRADING_PROFIT');
    expect(win.entries.find((e) => e.accountCode === '1400')!.amount).toBe(95);
    // -52 USD loss -> credit trading account
    const loss = journals.find((j) => j.description.includes('#9002'))!;
    expect(loss.entries.find((e) => e.accountCode === '1400')!.amount).toBe(-52);
  });

  it('is idempotent: the same payload posted twice journalsizes nothing the second time', async () => {
    const first = await trading.syncMt5Payload(payload('1048291'));
    const second = await trading.syncMt5Payload(payload('1048291'));

    expect(first.journalized).toBe(2);
    expect(second.journalized).toBe(0);
    expect(second.skipped).toBe(3); // 2 duplicates + 1 zero-P&L
    expect(second.duplicates_ignored).toBe(2);
    expect(second.dedupe).toBe('in-memory'); // volatile adapter store; the Postgres table answers 'processed_deals' (CI job db-persistence-smoke)

    const journals = (await ledger.getJournals(200)).journals.filter((j) => j.description.includes('#9001'));
    expect(journals).toHaveLength(1);
    expect(await repo.countProcessedDeals!('1048291')).toBe(2);
  });

  it('reports the same snapshot totals after a duplicate re-sync (nothing moved)', async () => {
    await trading.syncMt5Payload(payload('1048291'));
    const before = await ledger.getSnapshot();
    await trading.syncMt5Payload(payload('1048291'));
    const after = await ledger.getSnapshot();

    expect(after.totals).toEqual(before.totals);
    expect(after.totals.journalCount).toBe(before.totals.journalCount);
  });

  it('rejects payloads without an account', async () => {
    await expect(trading.syncMt5Payload({ closed_deals: [{ ticket: 1, profit: 5 }] } as RawMt5SyncPayload)).rejects.toThrow(
      /account .* is required/
    );
  });

  it('falls back to a volatile dedupe Set when the store has no dedupe support', async () => {
    const inner = new InMemoryLedgerRepository();
    // A repository adapter that predates M1 (no dedupe capability at all).
    const naive = {
      workspaceId: inner.workspaceId,
      persistence: 'memory' as const,
      listAccounts: () => inner.listAccounts(),
      addAccount: (i: never) => inner.addAccount(i),
      appendJournal: (i: never) => inner.appendJournal(i),
      listJournals: (l?: number) => inner.listJournals(l),
    };
    const service = new TradingService(new LedgerService(naive as any));

    const first = await service.syncMt5Payload(payload('555'));
    const second = await service.syncMt5Payload(payload('555'));

    expect(first.dedupe).toBe('in-memory');
    expect(first.journalized).toBe(2);
    expect(second.journalized).toBe(0);
    expect(second.dedupe).toBe('in-memory');
  });
});

describe('TradingService — GET /trading/state menandai angka contoh (audit #12)', () => {
  let ledger: LedgerService;
  let trading: TradingService;

  beforeEach(() => {
    ledger = new LedgerService(new InMemoryLedgerRepository());
    trading = new TradingService(ledger);
  });

  it('demo: true sebelum pernah sinkron — angka fallback tidak boleh dikira data broker', async () => {
    const state = await trading.getTradingAccountState();

    expect(state.demo).toBe(true);
    expect(state.lastState).toMatchObject({ account_id: '1048291', currency: 'USD' });
    expect(state.processed_tickets).toBe(0);
  });

  it('demo: false setelah sinkron — state berasal dari payload ingest terakhir', async () => {
    await trading.syncMt5Payload(payload('1048291'));
    const state = await trading.getTradingAccountState();

    expect(state.demo).toBe(false);
    // Setelah sinkron, lastState = payload mentah terakhir (dialek provider: `account` +
    // `account_info`), BUKAN lagi bentuk contoh `account_id`/`balance` dari fallbackState().
    expect(state.lastState.account).toBe('1048291');
    expect(state.lastState.account_info.balance).toBe(10_000);
    expect(state.processed_tickets).toBeGreaterThan(0);
  });
});
