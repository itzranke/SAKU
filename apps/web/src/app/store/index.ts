import { configureStore } from '@reduxjs/toolkit';
import ledgerReducer from './ledgerSlice';

export function makeLedgerStore() {
  return configureStore({
    reducer: {
      ledger: ledgerReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });
}

export const sakuStore = makeLedgerStore();

export type SakuRootState = ReturnType<typeof sakuStore.getState>;
export type SakuAppDispatch = typeof sakuStore.dispatch;
