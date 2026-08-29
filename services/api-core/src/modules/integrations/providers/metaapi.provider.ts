/**
 * MetaApiProvider — server-side MT5 pull through MetaApi.cloud REST (ADR-022 M3).
 *
 * Verified against the vendor docs (Aug 2026), NOT against stale assumptions:
 *   client API   GET  https://mt-client-api-v1.{region}.agiliumtrade.ai
 *                  /users/current/accounts/:accountId/account-information?refreshTerminalState=true
 *                  /users/current/accounts/:accountId/history-deals/time/:startTime/:endTime
 *                header `auth-token: <METAAPI_TOKEN>`; time range start inclusive, end exclusive;
 *                deal rows use `id` for the ticket and `DEAL_ENTRY_*` / `DEAL_TYPE_*` enums.
 *   provisioning  POST https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts
 *                POST .../users/current/accounts/:id/start  (only registers/starts a reader)
 *                region is a query param on the provisioning API.
 *
 * READ-ONLY BY CONSTRUCTION (the security doctrine of this epic):
 *   - the payload we send to the vendor carries the INVESTOR password the user typed;
 *   - this class only ever issues the two GETs above plus provisioning POSTs; there is no
 *     order/position/trade RPC call anywhere in it, and `assertReadOnlyPath()` fails loudly if
 *     someone ever wires one in;
 *   - the token and the decrypted password never enter a log line (see secret-redaction).
 *
 * Coverage rule: an unsupported broker server must produce a FRIENDLY failure
 * ("server tidak didukung, gunakan import statement"), never a stack trace and never an
 * automatic fallback to the legacy EA.
 */
import { Injectable, Logger } from '@nestjs/common';
import { NormalizedClosedDeal, normalizeClosedDeal } from '../../trading/mt5-payload';
import { friendlyProviderError } from './error-mapping';
import {
  AccountSnapshot,
  Mt5Provider,
  ProviderAccount,
  ProviderTestResult,
  UNSUPPORTED_SERVER_MESSAGE,
} from './mt5-provider';

export type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;

export interface MetaApiConfig {
  token: string;
  region: string;
  clientBaseUrl: string;
  provisioningBaseUrl: string;
  timeoutMs: number;
  fetchImpl: FetchLike;
}

export function metaApiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MetaApiConfig {
  const region = (env.METAAPI_REGION || 'new-york').trim();
  return {
    token: (env.METAAPI_TOKEN || '').trim(),
    region,
    clientBaseUrl: (env.METAAPI_CLIENT_URL || `https://mt-client-api-v1.${region}.agiliumtrade.ai`).replace(/\/$/, ''),
    provisioningBaseUrl: (env.METAAPI_PROVISIONING_URL || 'https://mt-provisioning-api-v1.agiliumtrade.ai').replace(/\/$/, ''),
    timeoutMs: Number(env.METAAPI_TIMEOUT_MS || 15_000),
    fetchImpl: ((...args: Parameters<typeof fetch>) => (fetch as any)(...args)) as FetchLike,
  };
}

@Injectable()
export class MetaApiProvider implements Mt5Provider {
  readonly id = 'metaapi' as const;
  private readonly logger = new Logger(MetaApiProvider.name);

  constructor(private readonly config: MetaApiConfig = metaApiConfigFromEnv()) {}

  async testAccount(account: ProviderAccount): Promise<ProviderTestResult> {
    const started = Date.now();
    if (!this.config.token) {
      return {
        ok: false,
        provider: this.id,
        mode: 'read-only',
        supported: false,
        message: 'METAAPI_TOKEN belum diisi di server SAKU. Tanpa token vendor, gunakan import statement/CSV MT5.',
      };
    }
    try {
      const accountId = await this.ensureAccountId(account);
      const info = await this.getJson(
        `${this.config.clientBaseUrl}/users/current/accounts/${encodeURIComponent(accountId)}/account-information`,
        { refreshTerminalState: true }
      );
      const snapshot = mapAccountInformation(info);
      return {
        ok: true,
        provider: this.id,
        mode: 'read-only',
        supported: true,
        message: `Terhubung (read-only) ke ${info?.server ?? account.server} sebagai login ${account.login}.`,
        snapshot,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.id,
        mode: 'read-only',
        supported: false,
        message: friendlyError((err as Error).message),
        latencyMs: Date.now() - started,
      };
    }
  }

  async getSnapshot(account: ProviderAccount): Promise<AccountSnapshot> {
    const accountId = await this.ensureAccountId(account);
    const info = await this.getJson(
      `${this.config.clientBaseUrl}/users/current/accounts/${encodeURIComponent(accountId)}/account-information`,
      { refreshTerminalState: true }
    );
    return mapAccountInformation(info);
  }

  async getDeals(account: ProviderAccount, sinceIso: string): Promise<NormalizedClosedDeal[]> {
    const accountId = await this.ensureAccountId(account);
    const until = new Date().toISOString();
    const rows = await this.getJson(
      `${this.config.clientBaseUrl}/users/current/accounts/${encodeURIComponent(
        accountId
      )}/history-deals/time/${encodeURIComponent(sinceIso)}/${encodeURIComponent(until)}`,
      { limit: 1000, offset: 0 }
    );
    const list = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];
    const deals: NormalizedClosedDeal[] = [];
    for (const raw of list) {
      const { deal, warnings } = normalizeClosedDeal({ ...raw, login: account.login }, account.login);
      if (deal) deals.push(deal);
      warnings.forEach((w) => this.logger.debug?.(`metaapi deal skipped: ${w}`));
    }
    return deals;
  }

  /**
   * Resolves the MetaApi account id. SAKU stores it in `vendorAccountId` after the first
   * successful provisioning so we never re-create accounts on every tick (each MetaApi
   * account costs a slot on the plan).
   */
  private async ensureAccountId(account: ProviderAccount): Promise<string> {
    if (account.vendorAccountId) return account.vendorAccountId;
    if (!this.config.token) throw new Error('METAAPI_TOKEN missing');
    const created = await this.postJson(
      `${this.config.provisioningBaseUrl}/users/current/accounts?region=${encodeURIComponent(this.config.region)}`,
      {
        name: `SAKU ${account.login}@${account.server}`,
        type: 'cloud',
        platform: 'mt5',
        login: account.login,
        // Investor (read-only) password: MetaApi rejects master passwords for read-only use,
        // and SAKU never asks for one (ADR-022).
        password: account.password,
        server: account.server,
        // 2.5s streaming interval is the vendor default for state polling; we only read snapshots.
        quoteStreamingIntervalInSeconds: 2.5,
        reliability: 'regular',
      }
    );
    const id = created?.id ?? created?.accountId;
    if (!id) throw new Error('provisioning response did not include an account id');
    try {
      await this.postJson(
        `${this.config.provisioningBaseUrl}/users/current/accounts/${encodeURIComponent(id)}/start`,
        {}
      );
    } catch (err) {
      this.logger.warn(`MetaApi account ${id} created but start() failed: ${friendlyError((err as Error).message)}`);
    }
    return id;
  }

  private async getJson(url: string, query: Record<string, unknown>): Promise<any> {
    return this.request('GET', appendQuery(url, query));
  }

  private async postJson(url: string, body: unknown): Promise<any> {
    assertReadOnlyPath('POST', url);
    return this.request('POST', url, body);
  }

  private async request(method: 'GET' | 'POST', url: string, body?: unknown): Promise<any> {
    assertReadOnlyPath(method, url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await this.config.fetchImpl(url, {
        method,
        signal: controller.signal as any,
        headers: { 'Content-Type': 'application/json', 'auth-token': this.config.token, Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = res.ok ? await safeJson(res) : { ...(await safeJson(res)), __status: res.status };
      if (!res.ok) {
        throw new Error(`${payload?.message ?? payload?.error ?? `HTTP ${res.status}`} ${payload?.details ?? ''}`.trim());
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function safeJson(res: { json(): Promise<any> }): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function appendQuery(url: string, query: Record<string, unknown>): string {
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${url}?${parts.join('&')}` : url;
}

/** Guardrail: SAKU must never send a trading command to the vendor. */
export function assertReadOnlyPath(method: string, url: string): void {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const trading = /\/(trade|orders?|positions?|deals?|execute|create-market|modify|cancel|close)\b/i;
  if (method === 'GET' && trading.test(path)) throw new Error(`read-only violation: GET ${path}`);
  if (method === 'POST' && !/\/users\/current\/accounts(\?|$|\/[^/]+\/(start|stop)$)/.test(path)) {
    throw new Error(`read-only violation: POST ${path}`);
  }
}

function mapAccountInformation(info: any): AccountSnapshot {
  return {
    balance: Number(info?.balance ?? 0),
    equity: Number(info?.equity ?? info?.balance ?? 0),
    margin: Number(info?.margin ?? 0),
    currency: String(info?.currency ?? 'USD').toUpperCase(),
    // MetaApi's account-information payload carries no server timestamp: stamp the fetch time
    // (display only — this value never reaches the ledger).
    serverTime: new Date().toISOString(),
  };
}

/** Kept as a named export so existing callers/tests stay valid. */
export const friendlyError = friendlyProviderError;
