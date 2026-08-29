// Redux Toolkit (rtk) slice for the SAKU dashboard — the store is a READ-MODEL
// projection of the immutable double-entry ledger exposed by @saku/api-core.
// Every successful write response carries a fresh snapshot, so balances in the
// UI are always derived from journals (never edited raw on the client).
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ApiAccountBalance {
  code: string;
  name: string;
  type: string;
  currency: string;
  balanceNative: number;
  balanceBaseIDR: number;
  lastEntryAt?: string;
}

export interface ApiJournalRow {
  id: string;
  date: string;
  description: string;
  source: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'TRADING_PROFIT' | string;
  account: string;
  amount: number; // signed, base IDR
  currency: string;
  category?: string;
}

export interface ApiSnapshot {
  workspaceId: string;
  baseCurrency: 'IDR';
  accounts: ApiAccountBalance[];
  totals: {
    totalAssetsIDR: number;
    totalDebtsIDR: number;
    netWorthIDR: number;
    journalCount: number;
    liquidityCashIDR: number;
  };
  recentJournals: ApiJournalRow[];
  generatedAt: string;
}

export interface SimpleTransactionBody {
  amount: number; // positive magnitude
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'TRADING_PROFIT';
  description: string;
  account: string; // name or code
  targetAccount?: string;
  category?: string;
  date?: string;
  currency?: string;
  exchangeRate?: number;
  source?: 'MANUAL' | 'STATEMENT_IMPORT' | 'BOT_CAPTURE';
}

export interface LedgerStoreState {
  source: 'sample' | 'live' | 'error';
  status: 'idle' | 'loading' | 'ready';
  lastSyncAt?: string;
  error?: string | null;
  netWorthIDR: number;
  totalAssetsIDR: number;
  totalDebtsIDR: number;
  liquidityCashIDR: number;
  journalCount: number;
  accounts: ApiAccountBalance[];
  transactions: ApiJournalRow[];
}

// Offline/sample fallback mirrors the seeded demo journals so the very first
// paint (or a cold start without the API) still looks complete; it is replaced
// wholesale by the API snapshot on success.
const SAMPLE_STATE = {
  source: 'sample' as const,
  netWorthIDR: 995620000,
  totalAssetsIDR: 1145390000,
  totalDebtsIDR: 149770000,
  liquidityCashIDR: 278750000,
  journalCount: 5,
  accounts: [
    { code: '1010', name: 'Bank BCA', type: 'BANK', currency: 'IDR', balanceNative: 220000000, balanceBaseIDR: 220000000 },
    { code: '1020', name: 'Bank Mandiri', type: 'BANK', currency: 'IDR', balanceNative: 44500000, balanceBaseIDR: 44500000 },
    { code: '1110', name: 'GoPay', type: 'EWALLET', currency: 'IDR', balanceNative: 12500000, balanceBaseIDR: 12500000 },
    { code: '1200', name: 'Physical Cash Wallet', type: 'CASH', currency: 'IDR', balanceNative: 3000000, balanceBaseIDR: 3000000 },
    { code: '1300', name: 'IDX Equities', type: 'INVESTMENT', currency: 'IDR', balanceNative: 450000000, balanceBaseIDR: 450000000 },
    { code: '1400', name: 'MetaTrader 5 Forex', type: 'TRADING', currency: 'USD', balanceNative: 25880, balanceBaseIDR: 401140000 },
    { code: '2010', name: 'BCA Credit Card', type: 'CREDIT_CARD', currency: 'IDR', balanceNative: -149770000, balanceBaseIDR: -149770000 },
  ],
  transactions: [
    { id: 'sample-1', date: '2026-08-28', description: 'Gaji Bulanan', account: 'Bank BCA', amount: 35000000, type: 'INCOME', source: 'MANUAL', currency: 'IDR' },
    { id: 'sample-2', date: '2026-08-28', description: 'Transfer ke MT5 Broker', account: 'Bank Mandiri', amount: -15500000, type: 'TRANSFER', source: 'MANUAL', currency: 'IDR' },
    { id: 'sample-3', date: '2026-08-27', description: 'Pembayaran Tagihan Listrik', account: 'GoPay', amount: -1250000, type: 'EXPENSE', source: 'MANUAL', currency: 'IDR' },
    { id: 'sample-4', date: '2026-08-26', description: 'Profit Trade EURUSD (MT5)', account: 'MetaTrader 5 Forex', amount: 7440000, type: 'TRADING_PROFIT', source: 'MT5_SYNC', currency: 'IDR' },
  ],
};

const initialState: LedgerStoreState = {
  ...SAMPLE_STATE,
  status: 'idle',
  error: null,
};

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/proxy${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as any)?.message || `SAKU API error (HTTP ${res.status})`);
  }
  return body as any;
}

export const fetchSnapshot = createAsyncThunk<ApiSnapshot>('ledger/fetchSnapshot', async () => {
  return apiFetch('/ledger/snapshot?recentLimit=25');
});

export const postTransaction = createAsyncThunk<{ journal: unknown; snapshot: ApiSnapshot }, SimpleTransactionBody>(
  'ledger/postTransaction',
  async (body) => {
    return apiFetch('/ledger/transaction', { method: 'POST', body: JSON.stringify(body) });
  }
);

const applySnapshot = (state: LedgerStoreState, snapshot: ApiSnapshot) => {
  state.source = 'live';
  state.error = null;
  state.lastSyncAt = snapshot.generatedAt;
  state.accounts = snapshot.accounts;
  state.transactions = snapshot.recentJournals;
  state.netWorthIDR = snapshot.totals.netWorthIDR;
  state.totalAssetsIDR = snapshot.totals.totalAssetsIDR;
  state.totalDebtsIDR = snapshot.totals.totalDebtsIDR;
  state.liquidityCashIDR = snapshot.totals.liquidityCashIDR;
  state.journalCount = snapshot.totals.journalCount;
};

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    markSyncing(state) {
      state.status = 'loading';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSnapshot.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSnapshot.fulfilled, (state, action: PayloadAction<ApiSnapshot>) => {
        state.status = 'ready';
        applySnapshot(state, action.payload);
      })
      .addCase(fetchSnapshot.rejected, (state, action) => {
        state.status = 'ready';
        state.source = 'error';
        state.error = action.error.message ?? 'SAKU Core API tidak terjangkau.';
      })
      .addCase(postTransaction.fulfilled, (state, action) => {
        applySnapshot(state, action.payload.snapshot);
      })
      .addCase(postTransaction.rejected, (state, action) => {
        state.error = action.error.message ?? 'Jurnal ditolak validator.';
      });
  },
});

export const { markSyncing } = ledgerSlice.actions;

/** Converts a (possibly signed) UI transaction into the positive-magnitude API contract. */
export function toApiTransaction(uiTx: {
  amount: number;
  type: SimpleTransactionBody['type'];
  description: string;
  account: string;
  targetAccount?: string;
  category?: string;
  date?: string;
  currency?: string;
  source?: SimpleTransactionBody['source'];
}): SimpleTransactionBody {
  return {
    amount: Math.abs(uiTx.amount),
    type: uiTx.type,
    description: uiTx.description,
    account: uiTx.account,
    targetAccount: uiTx.targetAccount,
    category: uiTx.category,
    date: uiTx.date,
    currency: uiTx.currency,
    source: uiTx.source ?? 'MANUAL',
  };
}

export default ledgerSlice.reducer;
