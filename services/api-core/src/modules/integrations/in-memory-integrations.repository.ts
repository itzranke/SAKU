/**
 * InMemoryIntegrationsRepository — volatile dev/demo/test adapter for M2.
 * Same semantics as the Prisma adapter (unique (ownerId, type, login)), so behaviour never
 * differs between "no database" mode and production; only durability does.
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LOCAL_OWNER } from '../auth/session.service';
import {
  AccountStateInput,
  AccountStateRow,
  IntegrationConflictError,
  IntegrationPatch,
  IntegrationRow,
  IntegrationsRepository,
  NewIntegrationInput,
} from './integrations.repository';

@Injectable()
export class InMemoryIntegrationsRepository implements IntegrationsRepository {
  readonly persistence = 'memory' as const;
  private readonly rows = new Map<string, IntegrationRow>();
  private readonly states = new Map<string, AccountStateRow>();

  list(ownerId?: string): Promise<IntegrationRow[]> {
    const all = [...this.rows.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return Promise.resolve(ownerId ? all.filter((r) => r.ownerId === ownerId) : all);
  }

  find(id: string): Promise<IntegrationRow | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  findByLogin(ownerId: string, type: string, login: string): Promise<IntegrationRow | null> {
    const hit = [...this.rows.values()].find(
      (r) => r.ownerId === ownerId && r.type === type && r.login === login
    );
    return Promise.resolve(hit ?? null);
  }

  create(input: NewIntegrationInput): Promise<IntegrationRow> {
    const ownerId = input.ownerId ?? LOCAL_OWNER;
    if (this.clashes(ownerId, input.type, input.login)) {
      return Promise.reject(new IntegrationConflictError(ownerId, input.type, input.login));
    }
    const now = new Date().toISOString();
    const row: IntegrationRow = {
      id: randomUUID(),
      ownerId,
      type: input.type,
      label: input.label,
      login: input.login,
      server: input.server,
      port: input.port ?? null,
      enabled: input.enabled ?? true,
      credentialCipher: input.credentialCipher,
      vendorAccountId: input.vendorAccountId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return Promise.resolve({ ...row });
  }

  update(id: string, patch: IntegrationPatch): Promise<IntegrationRow | null> {
    const row = this.rows.get(id);
    if (!row) return Promise.resolve(null);
    const next: IntegrationRow = {
      ...row,
      ...patch,
      port: patch.port === undefined ? row.port : patch.port,
      enabled: patch.enabled === undefined ? row.enabled : patch.enabled,
      vendorAccountId:
        patch.vendorAccountId === undefined ? row.vendorAccountId : patch.vendorAccountId,
      credentialCipher: patch.credentialCipher ?? row.credentialCipher,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(id, next);
    return Promise.resolve({ ...next });
  }

  remove(id: string): Promise<boolean> {
    this.states.delete(id);
    return Promise.resolve(this.rows.delete(id));
  }

  /** Display-only snapshot cache (never a ledger source). */
  upsertAccountState(input: AccountStateInput): Promise<AccountStateRow> {
    const row: AccountStateRow = {
      integrationAccountId: input.integrationAccountId,
      equity: input.equity,
      balance: input.balance,
      margin: input.margin ?? null,
      currency: input.currency,
      serverTime: input.serverTime ?? null,
      updatedAt: new Date().toISOString(),
    };
    this.states.set(row.integrationAccountId, row);
    return Promise.resolve({ ...row });
  }

  listAccountState(): Promise<AccountStateRow[]> {
    return Promise.resolve([...this.states.values()].map((s) => ({ ...s })));
  }

  private clashes(ownerId: string, type: string, login: string): boolean {
    return [...this.rows.values()].some((r) => r.ownerId === ownerId && r.type === type && r.login === login);
  }
}


