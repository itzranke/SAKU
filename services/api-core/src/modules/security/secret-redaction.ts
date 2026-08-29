/**
 * secret-redaction.ts — the "credentials never reach logs / responses" rule (ADR-022 M2).
 *
 * Two different jobs, deliberately separate:
 *   - redactForLog(): keep the KEY visible, replace the VALUE  -> debuggable logs
 *   - stripSensitive(): remove the KEY entirely                 -> API responses / errors
 *
 * Field names are matched on a normalised form (lowercased, `_`/`-`/spaces removed) and by
 * SUBSTRING, so `password`, `investor_password`, `masterPassword`, `sessionToken`,
 * `credentialCipher`, `apiKey`, `Authorization` are all caught, while `login`, `label` and
 * `server` (which are NOT secrets in SAKU's doctrine) pass through untouched.
 */

const SENSITIVE_NEEDLES = [
  'password',
  'passwd',
  'passphrase',
  'token',
  'cipher',
  'secret',
  'apikey',
  'authorization',
  'cookie',
];

/**
 * Whole-field names that are secrets by themselves (no substring needed). Deliberately narrow:
 * `key`/`keys` are NOT here — /security/rate-limit-check legitimately answers with the client
 * `key` (an IP), and stripping it would break an existing contract.
 */
const SENSITIVE_EXACT = new Set([
  'credential',
  'credentials',
  'pwd',
  'passphrase',
  'secret',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'authtoken',
  'sessiontoken',
]);

export const REDACTED = '[REDACTED]';

export function normalizeFieldName(key: string): string {
  return String(key ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * `password`/`investorPassword`/`master_password`/`sessionToken`/`credentialCipher` → true.
 * `credentialMode`, `hasCredential`, `vendorAccountId`, `label`, `login` → false, so the public
 * integration shape survives the global interceptor untouched.
 */
export function isSensitiveFieldName(key: string): boolean {
  const n = normalizeFieldName(key);
  if (!n) return false;
  if (SENSITIVE_EXACT.has(n)) return true;
  return SENSITIVE_NEEDLES.some((needle) => n.includes(needle));
}

/** Deep clone with sensitive VALUES replaced by `[REDACTED]` (keys kept). */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (value == null || depth > 8) return value;
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveFieldName(k) ? REDACTED : redactForLog(v, depth + 1);
  }
  return out;
}

/** Deep copy with sensitive keys REMOVED — used for anything that leaves the server. */
export function stripSensitive<T = unknown>(value: unknown, depth = 0): T {
  if (value == null || depth > 8) return value as T;
  if (Array.isArray(value)) return value.map((v) => stripSensitive(v, depth + 1)) as T;
  if (typeof value !== 'object') return value as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveFieldName(k)) continue;
    out[k] = stripSensitive(v, depth + 1);
  }
  return out as T;
}

/**
 * Textual fallback for free-form log lines (`sync failed for 700001 password=hunter2`,
 * JSON dumped by a third-party error, `Authorization: Bearer …`). Key matching mirrors
 * `SENSITIVE_NEEDLES`, and both `key: "value"` / `key=value` / `"key":"value"` are handled.
 */
const KEY =
  "[A-Za-z0-9_-]*?(?:password|passwd|passphrase|token|secret|cipher|api[-_]?key|authorization|cookie)[A-Za-z0-9_-]*?";
const SECRET_TEXT_RE = new RegExp(
  // 1) quoted value: key":"v" | key='v' | key: "v"
  `(${KEY})("|')?(\\s*[=:]\\s*)("|')(.*?)\\4` +
    // 2) bare value: key=value | key: value
    `|(${KEY})("|')?(\\s*[=:]\\s*)([^\\s,;}&"']+)`,
  'gi'
);

export function redactSecretText(text: string): string {
  if (typeof text !== 'string' || !text) return text;
  const bearerFree = text.replace(/(Bearer\s+)[A-Za-z0-9._~+\/=-]{6,}/gi, `$1${REDACTED}`);
  return bearerFree.replace(
    SECRET_TEXT_RE,
    (
      _m,
      key1?: string,
      keyQuote?: string,
      sep?: string,
      valQuote?: string,
      _val?: string,
      key2?: string,
      bareKeyQuote?: string,
      bareSep?: string,
      _bareVal?: string
    ) => {
      if (key1 !== undefined) return `${key1}${keyQuote ?? ''}${sep}${valQuote}${REDACTED}${valQuote}`;
      return `${key2}${bareKeyQuote ?? ''}${bareSep}${REDACTED}`;
    }
  );
}


/** Scrub one console argument (exported for tests; used by the console wrapper). */
export function scrubLogArg(arg: unknown): unknown {
  if (typeof arg === 'string') return redactSecretText(arg);
  if (arg instanceof Error) return arg; // stacks don't carry request bodies; don't mangle them
  if (arg && typeof arg === 'object') {
    const redacted = redactForLog(arg);
    try {
      // Keep object shape for pretty-printers, but never leak a sensitive value.
      return JSON.parse(JSON.stringify(redacted));
    } catch {
      return redactSecretText(Object.prototype.toString.call(arg)); // circular/exotic -> no leak
    }
  }
  return arg;
}

export const scrubLogArgs = (args: unknown[]): unknown[] => args.map(scrubLogArg);

let patched = false;

/**
 * Global safety net: wrap the console sinks so ANY accidental `console.log(body)` (ours or a
 * dependency's) is scrubbed. Idempotent; never throws; keeps console semantics.
 */
export function installConsoleRedaction(): void {
  if (patched) return;
  patched = true;
  for (const level of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
    const original = (console as any)[level] as (...args: unknown[]) => void;
    if (typeof original !== 'function' || (original as any).__sakuRedacted) continue;
    const wrapped = function (...args: unknown[]) {
      return original.apply(console, scrubLogArgs(args));
    };
    (wrapped as any).__sakuRedacted = true;
    (console as any)[level] = wrapped;
  }
}

