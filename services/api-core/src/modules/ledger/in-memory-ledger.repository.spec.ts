import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryLedgerRepository } from './in-memory-ledger.repository';
import { NewJournalInput } from './ledger.repository';

const dealJournal = (ticket: string, over: Partial<NewJournalInput> = {}): NewJournalInput => ({
  description: `MT5 EURUSD #${ticket} — Realized P&L`,
  date: '2026-08-28',
  source: 'MT5_SYNC',
  txType: 'TRADING_PROFIT',
  entries: [
    { accountId: '1400', amount: 120.5, currency: 'USD', exchangeRate: 15500 },
    { accountId: '4100', amount: -120.5 * 15500, currency: 'IDR', exchangeRate: 1 },
  ],
  ...over,
});

describe('InMemoryLedgerRepository — M1 dedupe mirror of processed_deals', () => {
  let repo: InMemoryLedgerRepository;
  beforeEach(() => {
    repo = new InMemoryLedgerRepository();
  });

  it('journals a deal once and reports the repeat as a duplicate', async () => {
    const first = await repo.appendJournalOncePerDeal!(dealJournal('9001'), {
      account: '1048291',
      ticket: '9001',
      source: 'MT5_SYNC',
    });
    expect(first.duplicate).toBe(false);
    expect(first.journal).not.toBeNull();

    const second = await repo.appendJournalOncePerDeal!(dealJournal('9001'), {
      account: '1048291',
      ticket: '9001',
      source: 'MT5_SYNC',
    });
    expect(second.duplicate).toBe(true);
    expect(second.journal).toBeNull();

    expect(await repo.isDealProcessed!('1048291', '9001')).toBe(true);
    expect(await repo.isDealProcessed!('1048291', '9002')).toBe(false);
    expect(await repo.countProcessedDeals!('1048291')).toBe(1);
    expect((await repo.listJournals()).filter((j) => j.description.includes('#9001'))).toHaveLength(1);
  });

  it('scopes dedupe per account: same ticket on another login is a NEW deal', async () => {
    await repo.appendJournalOncePerDeal!(dealJournal('5'), { account: 'AAA', ticket: '5', source: 'MT5_SYNC' });
    const other = await repo.appendJournalOncePerDeal!(dealJournal('5'), {
      account: 'BBB',
      ticket: '5',
      source: 'STATEMENT',
    });
    expect(other.duplicate).toBe(false);
    expect(await repo.countProcessedDeals!()).toBe(2);
  });

  it('never leaves a marker behind when the journal is rejected (all-or-nothing)', async () => {
    const broken = dealJournal('777', {
      entries: [
        { accountId: '1400', amount: 100, currency: 'USD', exchangeRate: 15500 },
        { accountId: '4100', amount: -42, currency: 'IDR', exchangeRate: 1 },
      ],
    });
    await expect(
      repo.appendJournalOncePerDeal!(broken, { account: 'AAA', ticket: '777', source: 'MT5_SYNC' })
    ).rejects.toThrow();

    expect(await repo.isDealProcessed!('AAA', '777')).toBe(false);
    expect((await repo.listJournals()).some((j) => j.description.includes('#777'))).toBe(false);
  });
});
