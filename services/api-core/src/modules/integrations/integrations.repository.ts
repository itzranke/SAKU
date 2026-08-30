/**
 * Integrations storage port (ADR-022 M2). Mirrors the ledger pattern: api-core depends on the
 * PORT, never on Prisma. Selected in app.module:
 *   - DATABASE_URL present -> PrismaIntegrationsRepository (@saku/database, PostgreSQL)
 *   - otherwise            -> InMemoryIntegrationsRepository (dev/demo/tests, volatile)
 *
 * Rows ALWAYS carry `credentialCipher` (envelope `iv:tag:ciphertext`). Anything that leaves
 * the process must go through `toPublicIntegration()` below.
 */
export const INTEGRATIONS_REPOSITORY = 'INTEGRATIONS_REPOSITORY';

export type IntegrationType = 'MT5_CLOUD' | 'MT5_STATEMENT';

export interface IntegrationRow {
  id: string;
  ownerId: string;
  type: IntegrationType;
  label: string;
  login: string;
  server: string;
  port: number | null;
  enabled: boolean;
  credentialCipher: string;
  vendorAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewIntegrationInput {
  ownerId?: string;
  type: IntegrationType;
  label: string;
  login: string;
  server: string;
  port?: number | null;
  enabled?: boolean;
  credentialCipher: string;
  vendorAccountId?: string | null;
}

export interface IntegrationPatch {
  label?: string;
  server?: string;
  port?: number | null;
  enabled?: boolean;
  credentialCipher?: string;
  vendorAccountId?: string | null;
}

/** The ONLY shape allowed on the wire. Credential fields are not merely emptied — they are absent. */
export interface PublicIntegration {
  id: string;
  ownerId: string;
  type: IntegrationType;
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

export function toPublicIntegration(row: IntegrationRow): PublicIntegration {
  return {
    id: row.id,
    ownerId: row.ownerId,
    type: row.type,
    label: row.label,
    login: row.login,
    server: row.server,
    port: row.port ?? null,
    enabled: row.enabled,
    hasCredential: Boolean(row.credentialCipher),
    credentialMode: 'investor-read-only',
    credentialAlgorithm: 'AES-256-GCM',
    vendorAccountId: row.vendorAccountId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Display-only snapshot cache (ADR-022 M3). Written by the scheduler, read by
 * GET /trading/account-state. Deliberately NOT a ledger source: no code path may post a
 * balance from here — saldo hanya boleh lahir dari jurnal berimbang.
 */
export interface AccountStateRow {
  integrationAccountId: string;
  equity: number;
  balance: number;
  margin: number | null;
  currency: string;
  serverTime: string | null;
  updatedAt: string;
}

export interface AccountStateInput {
  integrationAccountId: string;
  equity: number;
  balance: number;
  margin?: number | null;
  currency: string;
  serverTime?: string | null;
}

export interface IntegrationsRepository {
  readonly persistence: 'postgres' | 'memory';
  list(ownerId?: string): Promise<IntegrationRow[]>;
  find(id: string): Promise<IntegrationRow | null>;
  findByLogin(ownerId: string, type: IntegrationType, login: string): Promise<IntegrationRow | null>;
  create(input: NewIntegrationInput): Promise<IntegrationRow>;
  update(id: string, patch: IntegrationPatch): Promise<IntegrationRow | null>;
  remove(id: string): Promise<boolean>;
  upsertAccountState?(input: AccountStateInput): Promise<AccountStateRow>;
  listAccountState?(): Promise<AccountStateRow[]>;
}

/**
 * Invariant unik `(ownerId, type, login)` dilanggar — dilempar adapter penyimpanan saat
 * pengecekan `findByLogin()` di service kalah balapan dengan penulisan lain (audit #2).
 *
 * ponytail: kelas ini hidup di PORT (bukan di adapter in-memory) supaya service boleh
 * menangkapnya TANPA mengimpor adapter tertentu — arah dependensi tetap adapter → port.
 * Penanggung jawab: IntegrationsService.create() menerjemahkannya jadi HTTP 400 ramah.
 */
export class IntegrationConflictError extends Error {
  constructor(ownerId: string, type: string, login: string) {
    super(`Akun ${type} "${login}" sudah terdaftar untuk owner ini. Gunakan PATCH untuk mengubahnya.`);
    this.name = 'IntegrationConflictError';
  }
}
