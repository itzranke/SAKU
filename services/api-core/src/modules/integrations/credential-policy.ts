/**
 * credential-policy.ts — the SAKU custody rule, enforced at the API level (ADR-022 M2):
 *
 *   "SAKU hanya menerima INVESTOR password (read-only). Master/trader password ditolak."
 *
 * Pure (no Nest imports) so it is unit-testable and reusable by the bot/CLI surfaces.
 */
import { isSensitiveFieldName } from '../security/secret-redaction';

export const INVESTOR_FIELD_ALIASES = [
  'investor_password',
  'investorPassword',
  'investor',
  'password',
  'readOnlyPassword',
  'read_only_password',
];

/** Normalised names that must NEVER be accepted, whatever their value. */
const FORBIDDEN_FIELDS = [
  'masterpassword',
  'master',
  'masterpass',
  'traderpassword',
  'trader',
  'traderpass',
  'sessiontoken',
  'session',
  'apikey',
  'authorization',
  'credentialcipher', // server-side only; clients may not write ciphertext directly
  'cipher',
];

const MAX_SECRET_LENGTH = 128;

export const INVESTOR_READONLY_HINT =
  'SAKU hanya menerima investor password (read-only). Master/trader password tidak pernah diterima — lihat docs/22_MT5_INVESTOR_SYNC_ADR.md.';

export interface CredentialPolicyResult {
  /** The investor (read-only) password, when one was supplied. */
  investorPassword?: string;
  errors: string[];
}

const norm = (k: string) => String(k ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Validates a credential-bearing payload and extracts the ONE accepted secret field.
 * `mode`:
 *   - 'create' : a credential is required
 *   - 'update' : credential optional (absent = keep stored one)
 */
export function applyCredentialPolicy(
  body: Record<string, unknown> | null | undefined,
  mode: 'create' | 'update' = 'create'
): CredentialPolicyResult {
  const errors: string[] = [];
  const source = (body ?? {}) as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const n = norm(key);
    if (!n) continue;
    if (FORBIDDEN_FIELDS.includes(n) || (n.includes('master') && isSensitiveFieldName(key))) {
      errors.push(`Field "${key}" ditolak: ${INVESTOR_READONLY_HINT}`);
    }
  }

  let investorPassword: string | undefined;
  for (const alias of INVESTOR_FIELD_ALIASES) {
    const raw = source[alias];
    if (raw === undefined || raw === null || raw === '') continue;
    if (typeof raw !== 'string') {
      errors.push('investor password (read-only) harus berupa string.');
      break;
    }
    if (raw.length > MAX_SECRET_LENGTH) {
      errors.push(`investor password (read-only) terlalu panjang (maks ${MAX_SECRET_LENGTH} karakter).`);
      break;
    }
    investorPassword = raw;
    break;
  }

  if (mode === 'create' && !investorPassword && !errors.length) {
    errors.push('investor_password wajib diisi — SAKU hanya menerima investor password (read-only).');
  }

  return { investorPassword, errors };
}

export interface IntegrationFieldErrors {
  errors: string[];
  value?: { label: string; login: string; server: string; port?: number };
}

/** Structural validation of the MT5 account identity fields. */
export function validateIntegrationFields(body: Record<string, unknown> | null | undefined): IntegrationFieldErrors {
  const source = (body ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const label = typeof source.label === 'string' ? source.label.trim() : '';
  const login = source.login === undefined || source.login === null ? '' : String(source.login).trim();
  const server = typeof source.server === 'string' ? source.server.trim() : '';
  const type = typeof source.type === 'string' ? source.type.toUpperCase() : '';

  if (type && type !== 'MT5_CLOUD' && type !== 'MT5_STATEMENT') {
    errors.push('type harus MT5_CLOUD atau MT5_STATEMENT.');
  }
  if (label.length < 2 || label.length > 64) errors.push('label wajib diisi (2–64 karakter).');
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(login)) errors.push('login akun harus 3–32 karakter alfanumerik.');
  if (server.length < 2 || server.length > 128) errors.push('server (nama broker/server MT5) wajib diisi (2–128 karakter).');
  let port: number | undefined;
  if (source.port !== undefined && source.port !== null && source.port !== '') {
    port = Number(source.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('port harus integer 1–65535.');
  }
  if (errors.length) return { errors };
  return {
    errors,
    value: { label, login, server, port },
  };
}
