import { Injectable } from '@nestjs/common';

export interface Mt5Payload {
  account_id: string;
  broker: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  timestamp: number;
}

@Injectable()
export class TradingService {
  private lastMt5State: Mt5Payload | null = null;

  syncMt5Payload(payload: Mt5Payload) {
    this.lastMt5State = payload;
    console.log(`[SAKU MT5 SYNC] Received MT5 State for Account ${payload.account_id}: Equity = $${payload.equity}`);

    return {
      status: 'success',
      syncedAt: new Date().toISOString(),
      account_id: payload.account_id,
      equity: payload.equity,
      balance: payload.balance,
    };
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
    };
  }
}
