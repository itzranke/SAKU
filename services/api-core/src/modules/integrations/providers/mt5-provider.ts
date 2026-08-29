/**
 * Mt5Provider — the vendor seam (ADR-022 M2/M3).
 *
 * Everything SAKU knows about "talking to MT5" lives behind this interface, so the middleware
 * vendor can be swapped (MetaApi ↔ mtapi ↔ self-hosted) without touching the ledger, the API
 * contract or the UI. Implementations MUST be read-only: they receive an INVESTOR password and
 * are never allowed to place/close/modify trades, and never allowed to log `account.password`.
 */
import { NormalizedClosedDeal } from '../../trading/mt5-payload';

export interface AccountSnapshot {
  balance: number;
  equity: number;
  margin: number;
  currency: string;
  serverTime: string; // ISO
}

export interface ProviderTestResult {
  ok: boolean;
  provider: string;
  /** Always 'read-only' for SAKU connectors. */
  mode: 'read-only';
  /** Human, actionable message. NEVER echoes the credential. */
  message: string;
  /** Server/broker coverage verdict: drives the "use statement import" fallback copy. */
  supported?: boolean;
  snapshot?: AccountSnapshot;
  /** Milliseconds the probe took (UI health card). */
  latencyMs?: number;
}

/** Credential material handed to a provider for ONE call. Never persisted, never logged. */
export interface ProviderAccount {
  integrationAccountId: string;
  login: string;
  server: string;
  port?: number | null;
  /** Decrypted investor (read-only) password — lives only for the duration of the call. */
  password: string;
  vendorAccountId?: string | null;
  currency?: string;
}

export interface Mt5Provider {
  readonly id: 'metaapi' | 'mock' | 'null';
  /** Connectivity + coverage check. Must never throw for "unsupported server": return ok=false. */
  testAccount(account: ProviderAccount): Promise<ProviderTestResult>;
  getSnapshot(account: ProviderAccount): Promise<AccountSnapshot>;
  /** Closed deals newer than `sinceIso` (exclusive), already normalized to the sync shape. */
  getDeals(account: ProviderAccount, sinceIso: string): Promise<NormalizedClosedDeal[]>;
}

export const UNSUPPORTED_SERVER_MESSAGE =
  'Server/broker tersebut tidak didukung konektor cloud SAKU. Impor statement/CSV MT5 saja (Settings → Import Statement) — tanpa EA, tanpa vendor.';
