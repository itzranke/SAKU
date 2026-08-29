/**
 * mt5-payload.ts — PURE normalizer for MT5 sync payloads (no NestJS, no I/O).
 *
 * SAKU accepts TWO payload dialects on POST /api/v1/trading/sync and folds them into
 * one internal shape, because both are live contracts (see docs/22 ADR-022, M1):
 *
 *  A) "bridge" dialect (shipped since v1.1, still used by SakuBridge.mq5):
 *     { account_id, broker, currency, balance, equity, margin, free_margin, timestamp,
 *       ledger_account?, closed_deals: [{ ticket, symbol, type, lots, open_price,
 *                                         close_price, profit, closed_at }] }
 *
 *  B) "provider" dialect (MetaApi/MT5 deal records, documented in ADR-022):
 *     { account, currency, account_info,
 *       closed_deals: [{ login, ticket, time, time_msc, type, entry, profit,
 *                        commission, swap, balance, currency, pnl }] }
 *
 * Money rule (doctrine, do not relax): only `pnl` (signed NET realized result) reaches
 * the ledger, and it reaches it through the balanced-journal write path. Balance/equity
 * fields are DISPLAY ONLY — nothing here may be used to "set" a saldo.
 */

export type EntryKind = 'IN' | 'OUT' | 'INOUT';

export interface RawMt5Deal {
  ticket?: string | number;
  deal?: string | number;
  order?: string | number;
  login?: string | number;
  symbol?: string;
  type?: string;
  entry?: string;
  action?: string; // MetaApi uses `action` for deal entry (DEAL_ENTRY_OUT etc.)
  lots?: number | string;
  volume?: number | string;
  open_price?: number | string;
  close_price?: number | string;
  price_open?: number | string;
  price_close?: number | string;
  profit?: number | string;
  commission?: number | string;
  swap?: number | string;
  fee?: number | string;
  pnl?: number | string;
  balance?: number | string;
  currency?: string;
  time?: string | number;
  time_msc?: number | string;
  closed_at?: number | string;
}

export interface RawMt5SyncPayload {
  account?: string | number;
  account_id?: string | number;
  account_info?: Record<string, unknown>;
  broker?: string;
  server?: string;
  currency?: string;
  balance?: number | string;
  equity?: number | string;
  margin?: number | string;
  free_margin?: number | string;
  margin_free?: number | string;
  timestamp?: number | string;
  server_time?: string | number;
  serverTime?: string | number;
  /** Optional: SAKU ledger account (code or name) receiving realized P&L. */
  ledger_account?: string;
  closed_deals?: RawMt5Deal[];
  deals?: RawMt5Deal[];
  [k: string]: unknown;
}

export interface NormalizedClosedDeal {
  ticket: string;
  login?: string;
  symbol?: string;
  type?: string; // BUY | SELL
  entry?: EntryKind;
  lots?: number;
  openPrice?: number;
  closePrice?: number;
  /** Gross deal profit as reported by the platform. */
  profit: number;
  /** Signed, MT5 convention: negative = cost. */
  commission: number;
  swap: number;
  /** Signed NET realized result = the only number allowed to reach the journal. */
  pnl: number;
  balance?: number;
  currency?: string;
  /** ISO-8601 close time (business date of the journal). */
  time?: string;
  timeMsc?: number;
}

export interface NormalizedAccountSnapshot {
  login?: string;
  broker?: string;
  currency: string;
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  serverTime?: string;
}

export interface NormalizedMt5Sync {
  /** Broker login / account id: the dedupe namespace for `processed_deals.account`. */
  account: string;
  currency: string;
  ledgerAccount?: string;
  snapshot: NormalizedAccountSnapshot;
  accountInfo?: Record<string, unknown>;
  deals: NormalizedClosedDeal[];
  warnings: string[];
  errors: string[];
}

const num = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
};

/** Epoch seconds | epoch millis | ISO string -> ISO string (+ millis), or undefined. */
export function toIsoTime(value: unknown): string | undefined {
  const n = num(value);
  if (n !== undefined) {
    // Heuristic used by both MT5 dumps: > 1e11 means milliseconds.
    const ms = n > 1e11 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const s = str(value);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function toMillis(iso: string | undefined): number | undefined {
  return iso ? Date.parse(iso) : undefined;
}

function normalizeEntry(...values: Array<string | undefined>): EntryKind | undefined {
  for (const raw of values) {
    const v = (raw ?? '').toUpperCase();
    if (!v) continue;
    if (v.includes('INOUT')) return 'INOUT';
    if (v.includes('OUT')) return 'OUT';
    if (v.includes('IN')) return 'IN';
  }
  return undefined;
}

/**
 * NET realized result of a deal.
 * `pnl` wins when the producer already netted it; otherwise profit + commission + swap
 * (MT5 stores commission/swap signed, negative = cost). A POSITIVE commission is unusual
 * — most likely the producer already netted it — so we surface a warning instead of
 * silently crediting the trader twice.
 */
export function computeNetPnl(deal: RawMt5Deal): { pnl: number; warnings: string[] } {
  const warnings: string[] = [];
  const profit = num(deal.profit) ?? 0;
  const commission = num(deal.commission) ?? num(deal.fee) ?? 0;
  const swap = num(deal.swap) ?? 0;
  const explicit = num(deal.pnl);
  if (explicit !== undefined) {
    if (commission > 0 || swap > 0) warnings.push('pnl already provided; commission/swap ignored');
    return { pnl: explicit, warnings };
  }
  if (commission > 0) warnings.push('commission is positive — expected signed (negative = cost); check for double netting');
  return { pnl: profit + commission + swap, warnings };
}

export function normalizeClosedDeal(deal: RawMt5Deal, accountFallback?: string): {
  deal?: NormalizedClosedDeal;
  warnings: string[];
} {
  const warnings: string[] = [];
  const ticket = str(deal.ticket ?? deal.deal ?? deal.order);
  if (!ticket) {
    return { warnings: ['closed_deal skipped: no ticket/deal/order id'] };
  }
  const { pnl, warnings: pnlWarnings } = computeNetPnl(deal);
  warnings.push(...pnlWarnings.map((w) => `deal ${ticket}: ${w}`));

  const iso =
    toIsoTime(deal.time_msc) ??
    toIsoTime(deal.time) ??
    toIsoTime(deal.closed_at);
  if (!iso && (deal.time ?? deal.time_msc ?? deal.closed_at) != null) {
    warnings.push(`deal ${ticket}: unparseable time, journal dated today`);
  }

  const typeRaw = (str(deal.type) ?? '').toUpperCase();
  return {
    warnings,
    deal: {
      ticket,
      login: str(deal.login) ?? str(accountFallback),
      symbol: str(deal.symbol),
      type: typeRaw === 'BUY' || typeRaw === 'SELL' ? typeRaw : undefined,
      entry: normalizeEntry(str(deal.entry), str(deal.action)),
      lots: num(deal.lots ?? deal.volume),
      openPrice: num(deal.open_price ?? deal.price_open),
      closePrice: num(deal.close_price ?? deal.price_close),
      profit: num(deal.profit) ?? 0,
      commission: num(deal.commission ?? deal.fee) ?? 0,
      swap: num(deal.swap) ?? 0,
      pnl,
      balance: num(deal.balance),
      currency: str(deal.currency),
      time: iso,
      timeMsc: toMillis(iso),
    },
  };
}

/** Folds either payload dialect into one shape; `errors` blocks the request (HTTP 400). */
export function normalizeMt5SyncPayload(body: RawMt5SyncPayload): NormalizedMt5Sync {
  const warnings: string[] = [];
  const errors: string[] = [];

  const info = (body.account_info ?? {}) as Record<string, unknown>;
  const account =
    str(body.account) ?? str(body.account_id) ?? str(info.login) ?? str(info.id) ?? str(info.account);
  if (!account) errors.push('account (or account_id / account_info.login) is required.');

  const currency = (str(body.currency) ?? str(info.currency) ?? 'USD').toUpperCase();
  const rawDeals = Array.isArray(body.closed_deals) ? body.closed_deals : Array.isArray(body.deals) ? body.deals : [];
  if (!Array.isArray(body.closed_deals) && !Array.isArray(body.deals) && body.closed_deals != null) {
    errors.push('closed_deals must be an array.');
  }

  const deals: NormalizedClosedDeal[] = [];
  for (const raw of rawDeals) {
    const { deal, warnings: w } = normalizeClosedDeal(raw, account);
    warnings.push(...w);
    if (deal) deals.push(deal);
  }

  const serverTime = toIsoTime(body.server_time ?? body.serverTime) ?? toIsoTime(body.timestamp);

  return {
    account: account ?? 'unknown',
    currency,
    ledgerAccount: str(body.ledger_account),
    accountInfo: body.account_info,
    warnings,
    errors,
    deals,
    snapshot: {
      login: account,
      broker: str(body.broker) ?? str(info.broker) ?? str(info.server),
      currency,
      balance: num(body.balance) ?? num(info.balance),
      equity: num(body.equity) ?? num(info.equity),
      margin: num(body.margin) ?? num(info.margin),
      freeMargin: num(body.free_margin ?? body.margin_free) ?? num(info.free_margin),
      serverTime,
    },
  };
}

/** The dedupe key persisted in processed_deals and mirrored by the volatile fallback. */
export function dealKey(login: string, ticket: string): string {
  return `${login}:${ticket}`;
}
