/**
 * Mt5CloudConnector (ADR-022 M6) — the MT5 feed as a `Connector`.
 *
 * Thin by design: it does NOT re-implement anything. It owns the *env truth* (cadence +
 * first-sync window + which provider to dial) and delegates work:
 *   deals     → SyncSchedulerService → Mt5Provider.getDeals → normalize → /trading/sync pipeline
 *   snapshot  → account_state_cache (display only)
 * Importing the intervals from here (instead of scattering `process.env` reads) is what keeps
 * the scheduler, the Settings UI copy and the CI smoke test agreeing on one set of numbers.
 */
import { normalizeMt5SyncPayload, RawMt5SyncPayload } from '../trading/mt5-payload';
import { Connector } from './connector';

export const MT5_SNAPSHOT_INTERVAL_SEC = Math.max(0, Number(process.env.MT5_SNAPSHOT_INTERVAL_SEC ?? 120) || 0);
export const MT5_DEALS_INTERVAL_MIN = Math.max(0, Number(process.env.MT5_DEALS_INTERVAL_MIN ?? 10) || 0);
export const MT5_FIRST_SYNC_DAYS = Math.max(1, Number(process.env.MT5_FIRST_SYNC_DAYS ?? 30) || 30);

export class Mt5CloudConnector implements Connector {
  readonly type = 'MT5_CLOUD';
  readonly label = 'MT5 cloud connector (investor password, read-only)';
  readonly status = 'active' as const;
  readonly direction = 'pull' as const;
  readonly credentialRef = {
    kind: 'encrypted_integration',
    field: 'investor_password',
    mode: 'investor-read-only',
    algorithm: 'AES-256-GCM',
  } as const;

  /** Snapshot cadence (display refresh); deal cadence exposed separately below. */
  get syncIntervalSec(): number {
    return MT5_SNAPSHOT_INTERVAL_SEC;
  }

  get dealsIntervalMin(): number {
    return MT5_DEALS_INTERVAL_MIN;
  }

  get firstSyncDays(): number {
    return MT5_FIRST_SYNC_DAYS;
  }

  describe(): {
    type: string;
    label: string;
    status: string;
    direction: string;
    syncIntervalSec: number;
    dealsIntervalMin: number;
    firstSyncDays: number;
    credentialRef: Connector['credentialRef'];
  } {
    return {
      type: this.type,
      label: this.label,
      status: this.status,
      direction: this.direction,
      syncIntervalSec: this.syncIntervalSec,
      dealsIntervalMin: this.dealsIntervalMin,
      firstSyncDays: this.firstSyncDays,
      credentialRef: this.credentialRef,
    };
  }

  /** Both accepted dialects (bridge v1.1 + provider/MetaApi) land on the same internal shape. */
  normalize(raw: unknown) {
    const normalized = normalizeMt5SyncPayload((raw ?? {}) as RawMt5SyncPayload);
    return { deals: normalized.deals, errors: normalized.errors };
  }
}

export const mt5CloudConnector = new Mt5CloudConnector();
