/**
 * Connector contract (ADR-022 M6) — the one interface every asset feed implements.
 *
 * SAKU is a pocket financial terminal: jurnal kekayaan, budgeting, aset, hutang. MT5 is
 * *one connector* among many, so the seam stays generic on purpose:
 *
 *   type              what the feed is ('MT5_CLOUD', 'MT5_STATEMENT', tomorrow: 'BANK_BCA', …)
 *   credentialRef     WHERE a credential lives (never the secret itself) + its read-only policy
 *   syncIntervalSec   scheduler cadence; 0 = manual/batch only
 *   normalizer        vendor rows → the single internal deal shape the journal pipeline eats
 *
 * Explicit non-goals (keep it small, no framework theatre): no plug-in discovery, no dynamic
 * module loading, no per-connector DI container. A new provider = one class implementing this
 * interface + one entry in `registry.ts`.
 *
 * Doctrine that must survive any new connector: `normalizer` output feeds the journal path only.
 * Balance/equity are display state; there is no "set balance" and never will be.
 */
import { NormalizedClosedDeal } from '../trading/mt5-payload';

export type ConnectorCredentialRef =
  | {
      /** stored encrypted per-user in `integration_accounts`; SAKU holds the ciphertext only */
      kind: 'encrypted_integration';
      field: 'investor_password';
      mode: 'investor-read-only';
      algorithm: 'AES-256-GCM';
    }
  | {
      /** nothing to store — the user hands over a document/file at their own pace */
      kind: 'none';
    };

export interface ConnectorDescriptor {
  type: string;
  label: string;
  /** human-readable status line for docs/health surfaces */
  status: 'active' | 'manual' | 'planned';
  direction: 'pull' | 'upload';
  syncIntervalSec: number;
  credentialRef: ConnectorCredentialRef;
  /**
   * Read-only DESCRIPTION of the normalize() mapping (for GET /connectors & docs) —
   * never the function itself, never secret material.
   */
  normalizer: string;
}

/**
 * Bidang tambahan yang hanya muncul di permukaan deskripsi (GET /connectors), bukan di
 * kontrak inti — konektor bertipe upload/manual tidak punya cadence penarikan.
 */
export interface ConnectorDescribeExtras {
  /** Cadence penarikan deals (menit); 0 = manual/batch saja. */
  dealsIntervalMin?: number;
  /** Jendela sinkronisasi perdana (hari). */
  firstSyncDays?: number;
}

/** Bentuk yang dikembalikan `describe()` — deskriptor + cadence turunan (bila ada). */
export type ConnectorDescription = ConnectorDescriptor & ConnectorDescribeExtras;

export interface Connector extends ConnectorDescriptor {
  /**
   * Deskriptor untuk permukaan publik (GET /connectors & docs). WAJIB ada di kontrak supaya
   * registry tidak perlu menebak-nebak kelasnya (cabang `else` manual) — konektor baru yang
   * lupa mengimplementasikan ini langsung ketahuan saat kompilasi (audit #4).
   */
  describe(): ConnectorDescription;

  /** Map a raw feed (already vendor-shaped) into internal closed-deal rows. */
  normalize(raw: unknown): { deals: NormalizedClosedDeal[]; errors: string[] };
}
