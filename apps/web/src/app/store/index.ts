import { configureStore } from '@reduxjs/toolkit';
import ledgerReducer from './ledgerSlice';
import { integrationApi } from './integrationApi';

export function makeLedgerStore() {
  return configureStore({
    reducer: {
      ledger: ledgerReducer,
      [integrationApi.reducerPath]: integrationApi.reducer,
    },
    // RTK Query cache + refetching; keeps the integrations panel honest without extra thunks.
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(integrationApi.middleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
}

export const sakuStore = makeLedgerStore();

export type SakuRootState = ReturnType<typeof sakuStore.getState>;
export type SakuAppDispatch = typeof sakuStore.dispatch;
