/**
 * Provider selection (ADR-022 M2/M3) — env-driven, off by default.
 *
 *   MT5_CLOUD_ENABLED=false|unset  -> NullProvider  (scheduler no-op, zero outbound traffic)
 *   MT5_CLOUD_ENABLED=true +
 *   MT5_PROVIDER=mock              -> MockProvider  (deterministic fixtures: tests, demo, CI)
 *   MT5_PROVIDER=metaapi (default) -> MetaApiAdapter (needs METAAPI_TOKEN; read-only mode)
 *
 * The mock/null pair means CI and `pnpm dev` exercise the whole sync pipeline without a vendor
 * account, and a user with no cloud connector still gets the journal + statement flow.
 */
import { Logger } from '@nestjs/common';
import { Mt5Provider } from './mt5-provider';
import { NullProvider } from './null.provider';

export const MT5_PROVIDER = 'MT5_PROVIDER';

export function mt5CloudEnabled(): boolean {
  return String(process.env.MT5_CLOUD_ENABLED ?? 'false').toLowerCase() === 'true';
}

export function mt5ProviderKind(): 'metaapi' | 'mock' | 'null' {
  if (!mt5CloudEnabled()) return 'null';
  const requested = String(process.env.MT5_PROVIDER ?? 'metaapi').toLowerCase();
  if (requested === 'mock') return 'mock';
  return 'metaapi';
}

/**
 * Factory used by AppModule. In M2 only the null branch exists; M3 registers mock/MetaApi here.
 * Kept lazy + guarded (like buildLedgerRepository) so a missing optional dependency can never
 * take the API down.
 */
export function buildMt5Provider(): Mt5Provider {
  const kind = mt5ProviderKind();
  if (kind === 'null') {
    new Logger('Mt5Bootstrap').log(
      'MT5 cloud connector OFF (MT5_CLOUD_ENABLED unset/false) — scheduler no-op, use statement import for reconciliation.'
    );
    return new NullProvider();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const registry = require('./registry.js') as { createProvider: (k: string) => Mt5Provider | null };
    const provider = registry.createProvider(kind);
    if (provider) {
      new Logger('Mt5Bootstrap').log(`MT5 cloud connector ON — provider "${provider.id}" (read-only).`);
      return provider;
    }
  } catch (err) {
    new Logger('Mt5Bootstrap').warn(
      `Provider "${kind}" failed to load (${(err as Error).message}); falling back to NullProvider.`
    );
  }
  return new NullProvider();
}
