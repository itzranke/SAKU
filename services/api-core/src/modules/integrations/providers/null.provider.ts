/**
 * NullProvider — the safe default (ADR-022 M2/M3): when `MT5_CLOUD_ENABLED` is not `true`,
 * the connector does NOTHING. No HTTP call, no scheduler work, no throw — the CI pipeline and
 * a fresh clone therefore never touch a vendor, and the UI degrades to an empty health card.
 */
import { Injectable, Logger } from '@nestjs/common';
import { AccountSnapshot, Mt5Provider, ProviderAccount, ProviderTestResult } from './mt5-provider';
import { NormalizedClosedDeal } from '../../trading/mt5-payload';

export const PROVIDER_OFF_MESSAGE =
  'Konektor MT5 cloud belum diaktifkan (MT5_CLOUD_ENABLED=false). Simpan kredensial investor (read-only) dan aktifkan flag, atau gunakan import statement/CSV MT5.';

@Injectable()
export class NullProvider implements Mt5Provider {
  readonly id = 'null' as const;
  private readonly logger = new Logger(NullProvider.name);

  async testAccount(_account: ProviderAccount): Promise<ProviderTestResult> {
    return {
      ok: false,
      provider: this.id,
      mode: 'read-only',
      message: PROVIDER_OFF_MESSAGE,
      supported: false,
    };
  }

  async getSnapshot(_account: ProviderAccount): Promise<AccountSnapshot> {
    throw new Error(PROVIDER_OFF_MESSAGE);
  }

  async getDeals(_account: ProviderAccount, _sinceIso: string): Promise<NormalizedClosedDeal[]> {
    this.logger.debug('getDeals() called while the connector is off — returning no deals (no-op).');
    return [];
  }
}
