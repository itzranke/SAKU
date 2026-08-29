import { describe, expect, it } from 'vitest';
import { LEGACY_EA_NOTICE, TradingController } from './trading.controller';
import { CryptoService } from '../security/crypto.service';
import { InMemoryIntegrationsRepository } from '../integrations/in-memory-integrations.repository';
import { IntegrationsService } from '../integrations/integrations.service';
import { InMemoryLedgerRepository } from '../ledger/in-memory-ledger.repository';
import { LedgerService } from '../ledger/ledger.service';
import { TradingService } from './trading.service';
import { NullProvider } from '../integrations/providers/null.provider';

/** The deprecated push bridge must keep working — with provenance + a machine-readable notice. */
describe('TradingController — deprecation通道 legacy EA (M3)', () => {
  async function build() {
    const ledgerRepo = new InMemoryLedgerRepository();
    const ledger = new LedgerService(ledgerRepo);
    const trading = new TradingService(ledger);
    const integrations = new IntegrationsService(
      new InMemoryIntegrationsRepository(),
      new CryptoService(),
      new NullProvider()
    );
    const scheduler = {
      syncNow: async () => ({ provider: 'null', journalized: 0, skipped: 0, accounts: [] }),
      overview: async () => ({ enabled: false, provider: 'null', state: null, accounts: [] }),
    } as any;
    return { controller: new TradingController(trading, scheduler), ledger, ledgerRepo };
  }

  const payload = {
    account: '1048291',
    currency: 'USD',
    closed_deals: [{ ticket: 4242, symbol: 'EURUSD', profit: 55, time_msc: 1_756_000_000_000 }],
  } as any;

  it('menandai jurnal dari EA lama sebagai EA_LEGACY + menempelkan notice', async () => {
    const { controller, ledger } = await build();
    const res = await controller.syncMt5(payload, 'saku-bridge');

    expect(res.notice).toBe(LEGACY_EA_NOTICE);
    expect(res.journalized).toBe(1);
    const journals = (await ledger.getJournals(200)).journals.filter((j) => j.description.includes('#4242'));
    expect(journals).toHaveLength(1);
    expect(journals[0].source).toBe('EA_LEGACY');
    expect((await controller.accountState() as any).enabled).toBe(false);
  });

  it('jalur cloud connector (tanpa header) memakai source MT5_SYNC dan tanpa notice', async () => {
    const { controller, ledger } = await build();
    const res = await controller.syncMt5(payload, undefined);
    expect(res.notice).toBeUndefined();
    const journals = (await ledger.getJournals(200)).journals.filter((j) => j.description.includes('#4242'));
    expect(journals[0].source).toBe('MT5_SYNC');
  });

  it('processed_deals tetap membedakan asal deal (MT5_SYNC vs EA_LEGACY)', async () => {
    const { controller, ledgerRepo } = await build();
    await controller.syncMt5({ ...payload, closed_deals: [{ ticket: 99, profit: 10 }] } as any, 'saku-bridge');
    expect(await ledgerRepo.isDealProcessed!('1048291', '99')).toBe(true);
    // same ticket from the connector: already journalized -> skipped, no double post
    const res = await controller.syncMt5({ ...payload, closed_deals: [{ ticket: 99, profit: 10 }] } as any);
    expect(res.journalized).toBe(0);
    expect(res.duplicates_ignored).toBe(1);
  });

  it('POST /trading/sync/deals alias ikut menandai legacy', async () => {
    const { controller } = await build();
    const res = await controller.syncDealsOnly(payload, 'SAKU-BRIDGE/1.1');
    expect(res.notice).toBe(LEGACY_EA_NOTICE);
  });
});
