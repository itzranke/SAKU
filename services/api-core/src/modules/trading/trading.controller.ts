/**
 * Trading routes (ADR-022).
 *
 *   POST /api/v1/trading/sync        ingest closed deals + account state. Serves BOTH the
 *                                    cloud-connector pipeline and the DEPRECATED push bridge;
 *                                    a bridge request (header `X-Saku-Client: saku-bridge`) is
 *                                    still honored, journalled with source EA_LEGACY, and gets a
 *                                    machine-readable deprecation notice.
 *   POST /api/v1/trading/sync/deals  convenience alias (state-free pushes).
 *   POST /api/v1/trading/sync/now    run one connector pass NOW (snapshot + deals). No-op while
 *                                    MT5_CLOUD_ENABLED=false. Used by Settings → "Sync now".
 *   GET  /api/v1/trading/account-state   read-only display snapshot (never a ledger source).
 *   GET  /api/v1/trading/state           last ingest state + dedupe counter (bridge compat).
 *
 * There is no route that writes a balance: money enters only as balanced journals.
 */
import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { TradingService, Mt5Payload } from './trading.service';
import { SyncSchedulerService } from './sync-scheduler.service';

export const LEGACY_EA_NOTICE = 'legacy-ea-deprecated; migrate to integrations';

@Controller('trading')
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly scheduler: SyncSchedulerService
  ) {}

  @Post('sync')
  syncMt5(@Body() payload: Mt5Payload, @Headers('x-saku-client') client?: string) {
    return this.ingest(payload, client);
  }

  @Post('sync/deals')
  syncDealsOnly(@Body() payload: Mt5Payload, @Headers('x-saku-client') client?: string) {
    // Convenience for bridges that only push closed deals (no state change).
    return this.ingest(payload, client);
  }

  @Post('sync/now')
  syncNow() {
    return this.scheduler.syncNow();
  }

  @Get('account-state')
  accountState() {
    return this.scheduler.overview();
  }

  @Get('state')
  getTradingState() {
    return this.tradingService.getTradingAccountState();
  }

  private async ingest(payload: Mt5Payload, client?: string) {
    const legacyBridge = String(client ?? '').toLowerCase().includes('saku-bridge');
    const result = await this.tradingService.syncMt5Payload(payload, {
      // Provenance stays auditable: journals from the deprecated push bridge are labelled
      // EA_LEGACY, everything else (connector, statement reconciliation) keeps its own source.
      source: legacyBridge ? 'EA_LEGACY' : 'MT5_SYNC',
    });
    if (legacyBridge) {
      return { ...result, notice: LEGACY_EA_NOTICE };
    }
    return result;
  }
}
