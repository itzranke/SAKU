/**
 * error-mapping.ts — vendor failure -> one actionable Indonesian sentence (ADR-022 risk rule:
 * "test-connection WAJIB gagal dengan pesan ramah 'server tidak didukung, gunakan import
 * statement' (bukan stack trace)"). Shared by the MetaApi adapter and the scheduler so every
 * entrance says the same thing, and no provider-specific wording leaks into the UI.
 */
import { UNSUPPORTED_SERVER_MESSAGE } from './mt5-provider';

const RULES: Array<{ test: RegExp; message: string }> = [
  {
    test: /E_AUTH|invalid login or password|unauthoriz|401|403|wrong password/i,
    message:
      'Login/investor password (read-only) ditolak broker. Periksa investor password & nama server di Settings → Integrations, lalu simpan ulang.',
  },
  {
    test: /E_SRV_NOT_FOUND|not found|unsupported|no such server|E_SERVER_TIMEZONE|provisioning|server/i,
    message: UNSUPPORTED_SERVER_MESSAGE,
  },
  {
    test: /limit|quota|402|payment|plan/i,
    message: 'Kuota/paket MetaApi tidak mengizinkan panggilan lagi. Tambah akun di vendor atau gunakan import statement/CSV MT5.',
  },
  {
    test: /timeout|ETIMEDOUT|ECONN|ENOTFOUND|EAI_AGAIN|network/i,
    message: 'Konektor cloud tidak terjangkau dari server SAKU. Coba lagi nanti, atau gunakan import statement/CSV MT5.',
  },
];

/** Never returns a stack, a credential, or more than one line. */
export function friendlyProviderError(raw: unknown): string {
  const message = String(raw ?? '').split('\n')[0].trim();
  if (!message) return UNSUPPORTED_SERVER_MESSAGE;
  const hit = RULES.find((r) => r.test.test(message));
  if (hit) return hit.message;
  return message.length > 200 ? `${message.slice(0, 197)}…` : message;
}
