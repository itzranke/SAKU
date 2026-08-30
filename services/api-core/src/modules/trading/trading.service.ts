/**
 * TradingService — MT5 ingest endpoint (broker bridge / cloud connector / statement feed).
 *
 * Responsibilities (v1.2, ADR-022 M1):
 *  1. Normalize either accepted payload dialect (see mt5-payload.ts) into one internal shape.
 *  2. Turn every NON-ZERO net realized P&L into an immutable TRADING_PROFIT journal through
 *     LedgerService — the single sanctioned write path. Balance/equity in the payload are
 *     display-only state; they are NEVER journalized and there is no "set balance" route.
 *  3. Idempotency: `account:ticket` dedupe now lives in the persistent `processed_deals`
 *     table and is written in the SAME transaction as its journal. A volatile in-memory Set is
 *     retained ONLY as a fallback for repositories without persistent dedupe (unit tests,
 *     demo/dev boot without DATABASE_URL).
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { DealSource } from '../ledger/ledger.repository';
import {
  dealKey,
  normalizeMt5SyncPayload,
  NormalizedClosedDeal,
  NormalizedMt5Sync,
  RawMt5Deal,
  RawMt5SyncPayload,
} from './mt5-payload';

/** @deprecated kept as a public alias so existing imports keep compiling. */
export type Mt5Payload = RawMt5SyncPayload;
/** @deprecated use NormalizedClosedDeal (both dialects map onto it). */
export type Mt5Deal = RawMt5Deal;

export interface SyncDealReceipt {
  ticket: string;
  journalId: string | null;
  skipped?: string;
  reason?: string;
}

export interface SyncResult {
  status: 'success';
  syncedAt: string;
  /** Legacy field name (bridge dialect) — always the same value as `account`. */
  account_id: string;
  account: string;
  currency: string;
  balance: number;
  equity: number;
  deals_received: number;
  /** Journals actually appended by this call (legacy name). */
  journals_posted: number;
  /** M1 contract (additive, backward compatible): journalized vs skipped counts. */
  journalized: number;
  skipped: number;
  duplicates_ignored: number;
  posted: SyncDealReceipt[];
  /** Which dedupe store did the work. */
  dedupe: 'processed_deals' | 'in-memory';
  warnings: string[];
  /** Present only on the deprecated EA route (M3 / ADR-022). */
  notice?: string;
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  private lastMt5State: RawMt5SyncPayload | null = null;
  /** Volatile fallback dedupe, used only when the repository has no persistent table. */
  private readonly processedTickets = new Set<string>();
  private readonly processedQueue: string[] = []; // simple LRU cap for the dedupe set
  private readonly maxDedupe = 5000;

  constructor(private readonly ledger: LedgerService) {}

  async syncMt5Payload(payload: RawMt5SyncPayload, options?: { source?: DealSource }): Promise<SyncResult> {
    const normalized = normalizeMt5SyncPayload(payload ?? ({} as RawMt5SyncPayload));
    if (normalized.errors.length) {
      throw new BadRequestException(normalized.errors.join(' '));
    }
    this.lastMt5State = payload;
    return this.ingest(normalized, options?.source ?? 'MT5_SYNC');
  }

  /**
   * Internal entry point for the M3 scheduler: already-normalized provider deals run through
   * the exact same journalize + dedupe pipeline as POST /trading/sync (one write path, ADR-022).
   */
  ingestNormalizedDeals(
    normalized: NormalizedMt5Sync,
    source: DealSource = 'MT5_SYNC'
  ): Promise<SyncResult> {
    if (normalized.errors.length) throw new BadRequestException(normalized.errors.join(' '));
    return this.ingest(normalized, source);
  }

  private async ingest(normalized: NormalizedMt5Sync, source: DealSource): Promise<SyncResult> {
    // 'postgres' -> processed_deals table | 'memory' -> adapter Map | 'none' -> this service's Set
    const dedupeMode = this.ledger.dedupeMode();
    const volatileFallback = dedupeMode === 'none';

    this.logger.log(
      `MT5 sync account ${normalized.account}: deals=${normalized.deals.length}, dedupe=${dedupeMode}`
    );

    const posted: SyncDealReceipt[] = [];
    const targetAccount = normalized.ledgerAccount ?? (await this.defaultTradingAccountCode());
    let journalized = 0;
    let duplicates = 0;
    let zeroProfit = 0;

    for (const deal of normalized.deals) {
      const key = dealKey(normalized.account, deal.ticket);
      if (volatileFallback && this.processedTickets.has(key)) {
        duplicates += 1;
        posted.push({
          ticket: deal.ticket,
          journalId: null,
          skipped: 'duplicate',
          reason: 'deal already journalized (in-memory)',
        });
        continue;
      }
      const result = await this.ledger.postBrokerDeal({
        account: targetAccount,
        login: normalized.account,
        ticket: deal.ticket,
        symbol: deal.symbol,
        profit: deal.pnl,
        currency: deal.currency ?? normalized.currency,
        date: businessDate(deal),
        source,
      });
      if (result.kind === 'duplicate') {
        duplicates += 1;
        posted.push({ ticket: deal.ticket, journalId: null, skipped: 'duplicate', reason: result.reason });
        continue;
      }
      if (result.kind === 'skipped') {
        zeroProfit += 1;
        posted.push({ ticket: deal.ticket, journalId: null, skipped: 'zero-profit', reason: result.reason });
        continue;
      }
      if (volatileFallback) this.rememberTicket(key);
      journalized += 1;
      posted.push({ ticket: deal.ticket, journalId: result.journal.id });
    }

    return {
      status: 'success',
      syncedAt: new Date().toISOString(),
      account_id: normalized.account,
      account: normalized.account,
      currency: normalized.currency,
      balance: numberOr(normalized.snapshot.balance, 0),
      equity: numberOr(normalized.snapshot.equity, 0),
      deals_received: normalized.deals.length,
      journals_posted: journalized,
      journalized,
      skipped: duplicates + zeroProfit,
      duplicates_ignored: duplicates,
      posted,
      dedupe: dedupeMode === 'postgres' ? 'processed_deals' : 'in-memory',
      warnings: normalized.warnings,
    };
  }

  getNormalized(payload: RawMt5SyncPayload): NormalizedMt5Sync {
    return normalizeMt5SyncPayload(payload);
  }

  private async defaultTradingAccountCode(): Promise<string> {
    const { accounts } = await this.ledger.listAccounts();
    const trading = accounts.find((a) => a.type === 'TRADING' && a.isActive !== false);
    return trading ? trading.code : '1400';
  }

  private rememberTicket(key: string) {
    this.processedTickets.add(key);
    this.processedQueue.push(key);
    while (this.processedQueue.length > this.maxDedupe) {
      const old = this.processedQueue.shift()!;
      if (this.processedQueue.indexOf(old) === -1) this.processedTickets.delete(old);
    }
  }

  /**
   * `GET /api/v1/trading/state` — last ingest state + dedupe counter (bridge compat,
   * see trading.controller.ts:52).
   *
   * Asal-usul `fallbackState()` (diverifikasi 2026-08-30, laporan audit handoff §12.2 #12):
   * peninggalan era bridge/EA pra-ADR-022. Tidak ada kode web yang memanggil endpoint ini —
   * UI memakai `GET /trading/account-state`. Kontraknya DIPERTAHANKAN apa adanya (bisa saja
   * masih dipakai EA lama di luar repo), dan yang ditambah hanya penanda `demo`: supaya angka
   * contoh tidak pernah dikira sebagai data broker yang nyata.
   */
  async getTradingAccountState() {
    const processedDeals = await this.ledger.countProcessedDeals();
    return {
      lastState: this.lastMt5State ?? fallbackState(),
      /**
       * `true` = angka contoh: `lastState` berasal dari `fallbackState()`, bukan dari ingest
       * mana pun.
       *
       * CATATAN JUJUR (diverifikasi smoke 2026-08-30): penanda ini mengikuti jalur
       * **`/trading/sync`** (bridge/EA) karena `lastMt5State` hanya diisi di situ. Jalur
       * cloud (`POST /trading/sync/now`, scheduler) menyimpan snapshotnya di
       * `account_state_cache` dan MEMANG tidak mengisi `lastMt5State`, jadi `demo` bisa
       * tetap `true` walau konektor sudah pernah sinkron. Untuk status konektor yang benar,
       * pakai `GET /trading/account-state`.
       */
      demo: this.lastMt5State === null,
      processed_tickets: processedDeals || this.processedTickets.size,
    };
  }
}

/** MT5 business date of the deal; falls back to "today" like the pre-M1 bridge behaviour. */
function businessDate(deal: NormalizedClosedDeal): string | undefined {
  return deal.time ? deal.time.slice(0, 10) : undefined;
}

const numberOr = (v: number | undefined, fallback: number): number =>
  v == null || Number.isNaN(v) ? fallback : v;

/**
 * Demo state kept for `GET /trading/state` when nothing has synced yet (UI never renders empty).
 *
 * ponytail: angka contoh statis (akun 1048291 "HFM / MetaTrader 5"), BUKAN data broker.
 * Ini peninggalan bridge/EA pra-ADR-022; jalur upgrade yang benar = hapus bersamaan dengan
 * endpoint "bridge compat" kalau EA terakhir sudah pensiun. Selama endpoint hidup, pemanggil
 * WAJIB membaca penanda `demo` — jangan pernah merender angka ini seolah saldo nyata.
 */
function fallbackState() {
  return {
    account_id: '1048291',
    broker: 'HFM / MetaTrader 5',
    currency: 'USD',
    balance: 25000.0,
    equity: 25400.0,
    margin: 1200.0,
    free_margin: 24200.0,
    timestamp: Date.now(),
  };
}
