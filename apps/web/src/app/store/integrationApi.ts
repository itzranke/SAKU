// RTK Query slice for connector settings (ADR-022 M5).
// SECURITY CONTRACT: the investor password lives ONLY in the form component's local state,
// is sent once on submit, and is cleared immediately. It is never written to the Redux store,
// to localStorage, or into any cache — the store only ever holds the public shape below
// (`hasCredential`, no cipher, no password), which is exactly what the API returns.
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface PublicIntegration {
  id: string;
  ownerId: string;
  type: 'MT5_CLOUD' | 'MT5_STATEMENT';
  label: string;
  login: string;
  server: string;
  port: number | null;
  enabled: boolean;
  hasCredential: boolean;
  credentialMode: 'investor-read-only';
  credentialAlgorithm: 'AES-256-GCM';
  vendorAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionState {
  integrationAccountId: string;
  equity: number;
  balance: number;
  margin: number | null;
  currency: string;
  serverTime: string | null;
  updatedAt: string;
}

export interface AccountStateOverview {
  enabled: boolean;
  provider: string;
  snapshotIntervalSec: number;
  dealsIntervalMin: number;
  state: ConnectionState | null;
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

export interface ProbeResult {
  ok: boolean;
  provider: string;
  mode: 'read-only';
  message: string;
  supported?: boolean;
  latencyMs?: number;
  snapshot?: { balance: number; equity: number; margin: number; currency: string; serverTime: string };
  integrationId: string;
  label: string;
}

export interface SyncNowResult {
  provider: string;
  journalized: number;
  skipped: number;
  accounts: Array<{ login: string; journalized: number; skipped: number; equity: number | null; error?: string }>;
}

/** Payload sent on create/rotate. The password field is write-only from the UI's perspective. */
export interface IntegrationDraft {
  label: string;
  login: string;
  server: string;
  port?: number | null;
  type?: 'MT5_CLOUD' | 'MT5_STATEMENT';
  investor_password?: string;
}

// The browser only ever speaks to the relative proxy (Next rewrites /api/proxy/* -> API core),
// so this works in preview/deploy without leaking a localhost host into client code.
export const integrationApi = createApi({
  reducerPath: 'integrationApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/proxy', headers: { 'Content-Type': 'application/json' } }),
  tagTypes: ['Integrations', 'AccountState'],
  endpoints: (builder) => ({
    listIntegrations: builder.query<{ integrations: PublicIntegration[]; persistence: 'postgres' | 'memory' }, void>({
      query: () => '/integrations',
      providesTags: (result) =>
        result ? [...result.integrations.map((i) => ({ type: 'Integrations' as const, id: i.id })), { type: 'Integrations' as const, id: 'LIST' }] : [{ type: 'Integrations' as const, id: 'LIST' }],
    }),
    accountState: builder.query<AccountStateOverview, void>({
      query: () => '/trading/account-state',
      providesTags: [{ type: 'AccountState', id: 'ONE' }],
    }),
    createIntegration: builder.mutation<{ integration: PublicIntegration; notice: string }, IntegrationDraft>({
      query: (body) => ({ url: '/integrations', method: 'POST', body }),
      invalidatesTags: [{ type: 'Integrations', id: 'LIST' }],
    }),
    patchIntegration: builder.mutation<PublicIntegration, { id: string; body: Partial<IntegrationDraft> & { enabled?: boolean } }>({
      query: ({ id, body }) => ({ url: `/integrations/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Integrations', id: 'LIST' }],
    }),
    deleteIntegration: builder.mutation<{ status: 'removed' }, string>({
      query: (id) => ({ url: `/integrations/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Integrations', id: 'LIST' }, { type: 'AccountState', id: 'ONE' }],
    }),
    testIntegration: builder.mutation<ProbeResult, string>({
      query: (id) => ({ url: `/integrations/${id}/test`, method: 'POST' }),
      invalidatesTags: [{ type: 'AccountState', id: 'ONE' }],
    }),
    syncNow: builder.mutation<SyncNowResult, void>({
      query: () => ({ url: '/trading/sync/now', method: 'POST' }),
      invalidatesTags: [{ type: 'AccountState', id: 'ONE' }],
    }),
  }),
});

export const {
  useListIntegrationsQuery,
  useAccountStateQuery,
  useCreateIntegrationMutation,
  usePatchIntegrationMutation,
  useDeleteIntegrationMutation,
  useTestIntegrationMutation,
  useSyncNowMutation,
} = integrationApi;

/** Error text from the API (Nest exception shape) for inline form display. */
export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any;
  const raw = anyErr?.data?.message ?? anyErr?.error ?? 'SAKU API tidak terjangkau.';
  return Array.isArray(raw) ? raw.join(' ') : String(raw);
}
