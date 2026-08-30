/**
 * SyncSchedulerService — the heart of the EA-free pivot (ADR-022 M3).
 *
 * Two independent timers, both env-driven and BOTH no-ops unless `MT5_CLOUD_ENABLED=true`:
 *
 *  1. snapshot  every MT5_SNAPSHOT_INTERVAL_SEC (default 120) → `account_state_cache`
 *     (equity/balance for the Net Worth + health cards). This path can NOT write journals:
 *     "sync = penghasil entri, bukan editor saldo".
 *  2. deals     every MT5_DEALS_INTERVAL_MIN (default 10) → provider.getDeals(since) →
 *     normalize → the SAME internal pipeline that POST /trading/sync uses
 *     (TRADING_PROFIT journal + `processed_deals` dedupe). One write path, two entrances.
 *
 * `syncNow()` backs POST /trading/sync/now: the "Sync now" button in Settings and the
 * deterministic hook the CI smoke test uses instead of waiting for a cron tick.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { IntegrationsService } from '../integrations/integrations.service';
import {
  AccountStateRow,
  INTEGRATIONS_REPOSITORY,
  IntegrationRow,
  IntegrationsRepository,
} from '../integrations/integrations.repository';
import { MT5_PROVIDER, mt5CloudEnabled, mt5ProviderKind } from '../integrations/providers/provider.factory';
import { Mt5Provider } from '../integrations/providers/mt5-provider';
import { friendlyProviderError } from '../integrations/providers/error-mapping';
import { mt5CloudConnector } from '../connectors/mt5-cloud.connector';
import { NormalizedMt5Sync } from './mt5-payload';
import { TradingService } from './trading.service';

// Cadence truth lives in the MT5 connector descriptor (M6) so the scheduler, the Settings copy
// and CI agree on one set of numbers. These aliases keep existing imports working unchanged.
export const SNAPSHOT_INTERVAL_SEC = mt5CloudConnector.syncIntervalSec;
export const DEALS_INTERVAL_MIN = mt5CloudConnector.dealsIntervalMin;
const FIRST_SYNC_DAYS = mt5CloudConnector.firstSyncDays;

export interface SyncAccountRow {
  login: string;
  journalized: number;
  skipped: number;
  equity: number | null;
  error?: string;
}

export interface AccountStateOverview {
  enabled: boolean;
  provider: string;
  snapshotIntervalSec: number;
  dealsIntervalMin: number;
  /** Latest cached snapshot across connectors (display only), or null. */
  state: {
    integrationAccountId: string;
    equity: number;
    balance: number;
    margin: number | null;
    currency: string;
    serverTime: string | null;
    updatedAt: string;
  } | null;
  accounts: Array<{
    integrationId: string;
    label: string;
    login: string;
    server: string;
    enabled: boolean;
    equity?: number;
    balance?: number;
    currency?: string;
    serverTime?: string | null;
    updatedAt?: string;
    staleAfterSec?: number;
  }>;
  notice: string;
}

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  /** Per-connector "last deal watermark"; the DB dedupe table is the real safety net. */
  private readonly lastDealSync = new Map<string, string>();
  private lastSnapshot: { at: string; count: number } | null = null;

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly trading: TradingService,
    @Inject(MT5_PROVIDER) private readonly provider: Mt5Provider,
    @Inject(INTEGRATIONS_REPOSITORY) private readonly repo: IntegrationsRepository
  ) {}

  @Interval(SNAPSHOT_INTERVAL_SEC > 0 ? SNAPSHOT_INTERVAL_SEC * 1000 : 24 * 60 * 60 * 1000)
  snapshotTick(): void {
    if (!this.active()) return;
    this.runPass({ snapshots: true, deals: false }).catch((err) =>
      this.logger.warn(`snapshot tick failed: ${safeMessage(err)}`)
    );
  }

  @Interval(DEALS_INTERVAL_MIN > 0 ? DEALS_INTERVAL_MIN * 60_000 : 24 * 60 * 60 * 1000)
  dealsTick(): void {
    if (!this.active()) return;
    this.runPass({ snapshots: false, deals: true }).catch((err) =>
      this.logger.warn(`deals tick failed: ${safeMessage(err)}`)
    );
  }

  /** Manual trigger (UI button + CI): snapshot + deals in one pass. */
  async syncNow(): Promise<{
    provider: string;
    journalized: number;
    skipped: number;
    accounts: SyncAccountRow[];
  }> {
    return this.runPass({ snapshots: true, deals: true });
  }

  private async runPass(opts: { snapshots: boolean; deals: boolean }): Promise<{
    provider: string;
    journalized: number;
    skipped: number;
    accounts: SyncAccountRow[];
  }> {
    const rows = (await this.integrations.listRows()).filter((r) => r.enabled);
    const accounts: SyncAccountRow[] = [];
    let journalized = 0;
    let skipped = 0;

    for (const row of rows) {
      const entry: SyncAccountRow = { login: row.login, journalized: 0, skipped: 0, equity: null };
      accounts.push(entry);
      if (this.provider.id === 'null') continue; // no I/O at all while the connector is off
      try {
        const account = this.integrations.toProviderAccount(row);

        if (opts.snapshots) {
          const snapshot = await this.provider.getSnapshot(account);
          await this.integrations.cacheAccountState({
            integrationAccountId: row.id,
            equity: snapshot.equity,
            balance: snapshot.balance,
            margin: snapshot.margin,
            currency: snapshot.currency,
            serverTime: snapshot.serverTime,
          });
          entry.equity = snapshot.equity;
          this.lastSnapshot = { at: new Date().toISOString(), count: (this.lastSnapshot?.count ?? 0) + 1 };
        }

        if (opts.deals) {
          const deals = await this.provider.getDeals(account, this.sinceFor(row));
          if (deals.length) {
            const result = await this.trading.ingestNormalizedDeals(
              await this.normalizedFrom(row, deals),
              'MT5_SYNC'
            );
            entry.journalized = result.journalized;
            entry.skipped = result.skipped;
            journalized += result.journalized;
            skipped += result.skipped;
          }
          this.lastDealSync.set(row.id, new Date().toISOString());
        }
      } catch (err) {
        // Friendly single-line failure for the UI. Never a stack trace, never a credential.
        entry.error = friendlySyncMessage(safeMessage(err));
      }
    }
    return { provider: this.provider.id, journalized, skipped, accounts };
  }

  /** True when timers should do anything at all. CI relies on this being false by default. */
  active(): boolean {
    return mt5CloudEnabled() && this.provider.id !== 'null';
  }

  /** Read-only display state for the dashboard cards; empty (not an error) when disabled. */
  async overview(): Promise<AccountStateOverview> {
    const rows = await this.integrations.listRows();
    const cached: AccountStateRow[] = this.repo?.listAccountState ? await this.repo.listAccountState() : [];
    const byId = new Map<string, AccountStateRow>(cached.map((s) => [s.integrationAccountId, s]));
    const accounts = rows.map((row: IntegrationRow) => {
      const state = byId.get(row.id);
      return {
        integrationId: row.id,
        label: row.label,
        login: row.login,
        server: row.server,
        enabled: row.enabled,
        ...(state
          ? {
              equity: state.equity,
              balance: state.balance,
              currency: state.currency,
              serverTime: state.serverTime,
              updatedAt: state.updatedAt,
              staleAfterSec: Math.max(0, Math.round((Date.now() - Date.parse(state.updatedAt)) / 1000)),
            }
          : {}),
      };
    });
    const newest = [...cached].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] ?? null;
    return {
      enabled: this.active(),
      provider: this.provider.id,
      snapshotIntervalSec: SNAPSHOT_INTERVAL_SEC,
      dealsIntervalMin: DEALS_INTERVAL_MIN,
      state: newest
        ? {
            integrationAccountId: newest.integrationAccountId,
            equity: Number(newest.equity),
            balance: Number(newest.balance),
            margin: newest.margin == null ? null : Number(newest.margin),
            currency: newest.currency,
            serverTime: newest.serverTime,
            updatedAt: newest.updatedAt,
          }
        : null,
      accounts,
      notice: this.active()
        ? 'Equity/balance snapshot adalah data tampilan; saldo jurnal berasal dari deal ber-jurnal (immutable).'
        : 'Konektor MT5 cloud mati (MT5_CLOUD_ENABLED=false). Data tetap masuk lewat import statement/CSV MT5.',
    };
  }

  /**
   * Folds provider deals into the /trading/sync internal shape. Deliberately carries NO
   * balance/equity into the ledger: the snapshot block below is display metadata only.
   */
  private normalizedFrom(row: IntegrationRow, deals: NormalizedMt5Sync['deals']): NormalizedMt5Sync {
    return {
      account: row.login,
      currency: 'USD',
      accountInfo: { login: row.login, server: row.server, source: 'MT5_CLOUD_SCHEDULER' },
      snapshot: {
        login: row.login,
        broker: row.server,
        currency: 'USD',
      },
      deals,
      warnings: [],
      errors: [],
    };
  }

  private sinceFor(row: IntegrationRow): string {
    const seen = this.lastDealSync.get(row.id);
    if (seen) return seen;
    return new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000).toISOString();
  }
}

function safeMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return (m ?? '').slice(0, 400);
}

/** Keeps vendor failures actionable without echoing anything secret. */
export function friendlySyncMessage(raw: string): string {
  if (/METAAPI_TOKEN/i.test(raw)) return 'METAAPI_TOKEN belum diisi di server SAKU.';
  return friendlyProviderError(raw);
}
