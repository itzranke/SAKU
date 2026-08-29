// Redux Toolkit (rtk) State Management Slice for SAKU Financial OS
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AccountState {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  eqIDR?: number;
}

export interface TransactionState {
  id: string;
  date: string;
  description: string;
  account: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'TRADING_PROFIT';
  currency?: string;
}

export interface LedgerStoreState {
  netWorthIDR: number;
  totalAssetsIDR: number;
  totalDebtsIDR: number;
  accounts: AccountState[];
  transactions: TransactionState[];
}

const initialState: LedgerStoreState = {
  netWorthIDR: 1450230000,
  totalAssetsIDR: 1600000000,
  totalDebtsIDR: 149770000,
  accounts: [
    { id: '1', name: 'Bank BCA', type: 'BANK', balance: 185000000, currency: 'IDR' },
    { id: '2', name: 'Bank Mandiri', type: 'BANK', balance: 60000000, currency: 'IDR' },
    { id: '3', name: 'GoPay / OVO', type: 'EWALLET', balance: 12500000, currency: 'IDR' },
    { id: '4', name: 'Physical Cash', type: 'CASH', balance: 3000000, currency: 'IDR' },
    { id: '5', name: 'IDX Equities', type: 'INVESTMENT', balance: 450000000, currency: 'IDR' },
    { id: '6', name: 'MetaTrader 5 Forex', type: 'TRADING', balance: 25400, currency: 'USD', eqIDR: 393700000 },
  ],
  transactions: [
    { id: 't1', date: '2026-08-28', description: 'Gaji Bulanan', account: 'Bank BCA', amount: 35000000, type: 'INCOME' },
    { id: 't2', date: '2026-08-28', description: 'Transfer ke MT5 Broker', account: 'Bank Mandiri', amount: -15500000, type: 'TRANSFER' },
    { id: 't3', date: '2026-08-27', description: 'Pembayaran Tagihan Listrik', account: 'GoPay / OVO', amount: -1250000, type: 'EXPENSE' },
    { id: 't4', date: '2026-08-26', description: 'Profit Trade EURUSD (MT5)', account: 'MetaTrader 5', amount: 480, type: 'TRADING_PROFIT', currency: 'USD' },
  ],
};

export const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    addTransaction: (state, action: PayloadAction<TransactionState>) => {
      state.transactions.unshift(action.payload);

      // Reactive Balance Updates
      const acc = state.accounts.find((a) => a.name === action.payload.account);
      if (acc) {
        acc.balance += action.payload.amount;
      }

      state.netWorthIDR += action.payload.amount;
      state.totalAssetsIDR += action.payload.amount;
    },
  },
});

export const { addTransaction } = ledgerSlice.actions;
export default ledgerSlice.reducer;
