/**
 * TradingService — MT5 bridge ingest. Stores the latest account snapshot AND
 * (since v1.1) ingests closed deals: every non-zero realized P&L becomes an
 * immutable TRADING_PROFIT journal via LedgerService, deduplicated by
 * `account_id:ticket` so re-syncs are idempotent.
 */
import { Injectable, Logger } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';

export interface Mt5Deal {
  ticket: string | number;
  symbol?: string;
  type?: string; // BUY/SELL
  lots?: number;
  open_price?: number;
  close_price?: number;
  profit: number; // signed, in account currency
  closed_at?: number; // epoch seconds
}

export interface Mt5Payload {
  account_id: string;
  broker: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  timestamp: number;
  /** Optional: SAKU account (code or name) receiving realized P&L. Defaults to first TRADING account. */
  ledger_account?: string;
  /** Optional: closed deals within the EA sync window. */
  closed_deals?: Mt5Deal[];
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  private lastMt5State: Mt5Payload | null = null;
  private readonly processedTickets = new Set<string>();
  private readonly processedQueue: string[] = []; // simple LRU cap for the dedupe set
  private readonly maxDedupe = 5000;

  constructor(private readonly ledger: LedgerService) {}

  async syncMt5Payload(payload: Mt5Payload) {
    this.lastMt5State = payload;
    this.logger.log(
      `MT5 state synced for account ${payload.account_id}: balance=${payload.balance} equity=${payload.equity}`
    );

    const posted: Array<{ ticket: string; journalId: string | null; skipped?: string }> = [];
    const skippedDuplicates: string[] = [];

    for (const deal of payload.closed_deals ?? []) {
      const key = `${payload.account_id}:${deal.ticket}`;
      if (this.processedTickets.has(key)) {
        skippedDuplicates.push(String(deal.ticket));
        continue;
      }
      const targetAccount = payload.ledger_account ?? (await this.defaultTradingAccountCode());
      const closedDate = deal.closed_at
        ? new Date(deal.closed_at * 1000).toISOString().slice(0, 10)
        : undefined;
      const result = await this.ledger.postTradeProfit({
        account: targetAccount,
        ticket: String(deal.ticket),
        symbol: deal.symbol,
        profit: Number(deal.profit),
        currency: payload.currency,
        date: closedDate,
      });
      this.rememberTicket(key);
      posted.push({
        ticket: String(deal.ticket),
        journalId: result && (result as any).journal ? (result as any).journal.id : null,
        skipped: (result as any).skipped ? (result as any).reason : undefined,
      });
    }

    return {
      status: 'success',
      syncedAt: new Date().toISOString(),
      account_id: payload.account_id,
      balance: payload.balance,
      equity: payload.equity,
      deals_received: (payload.closed_deals ?? []).length,
      journals_posted: posted.filter((p) => p.journalId).length,
      posted,
      duplicates_ignored: skippedDuplicates.length,
    };
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

  getTradingAccountState() {
    return {
      lastState: this.lastMt5State || {
        account_id: '1048291',
        broker: 'HFM / MetaTrader 5',
        currency: 'USD',
        balance: 25000.0,
        equity: 25400.0,
        margin: 1200.0,
        free_margin: 24200.0,
        timestamp: Date.now(),
      },
      processed_tickets: this.processedTickets.size,
    };
  }
}
