/**
 * Provider registry (ADR-022 M3) — the only place that knows WHICH vendor is wired in.
 * `provider.factory.ts` requires this module lazily so a missing/broken vendor import can never
 * take the API down; it degrades to NullProvider with a warning.
 */
import { Mt5Provider } from './mt5-provider';
import { MockProvider } from './mock.provider';
import { MetaApiProvider, metaApiConfigFromEnv } from './metaapi.provider';
import { NullProvider } from './null.provider';

export function createProvider(kind: string): Mt5Provider | null {
  switch (String(kind ?? '').toLowerCase()) {
    case 'mock':
      return new MockProvider();
    case 'metaapi':
      return new MetaApiProvider(metaApiConfigFromEnv());
    case 'null':
      return new NullProvider();
    default:
      return null;
  }
}
