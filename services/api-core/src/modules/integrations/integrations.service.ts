/**
 * IntegrationsService — connector registry + credential custody (ADR-022 M2).
 *
 * Rules enforced HERE (API level), not in the UI:
 *  1. Only an INVESTOR (read-only) password is accepted; master/trader password → HTTP 400
 *     with copy that names "investor password (read-only)" (see credential-policy.ts).
 *  2. The credential is stored ONLY as an AES-256-GCM envelope (`iv:tag:ciphertext`).
 *  3. No response ever carries `credentialCipher` (or any password/token field) — the shape
 *     returned by this service is `PublicIntegration`, and the global RedactionInterceptor is
 *     the backstop.
 *  4. test-connection runs through the read-only provider port; when the connector is off it
 *     answers with an actionable message, never a stack trace.
 */
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CryptoService } from '../security/crypto.service';
import {
  INTEGRATIONS_REPOSITORY,
  IntegrationConflictError,
  IntegrationPatch,
  IntegrationRow,
  IntegrationsRepository,
  PublicIntegration,
  toPublicIntegration,
} from './integrations.repository';
import { applyCredentialPolicy, validateIntegrationFields } from './credential-policy';
import { Mt5Provider, ProviderAccount, ProviderTestResult } from './providers/mt5-provider';
import { friendlyProviderError } from './providers/error-mapping';
import { MT5_PROVIDER } from './providers/provider.factory';
import { LOCAL_OWNER } from '../auth/session.service';

export const ROTATION_NOTICE =
  'Setelah menghubungkan/meputuskan akses, ganti investor password di terminal atau di situs broker: SAKU menyimpannya terenkripsi tetapi tidak menegakkan rotasi.';

export interface CreateIntegrationBody {
  type?: string;
  label?: string;
  login?: string | number;
  server?: string;
  port?: number | string;
  enabled?: boolean;
  investor_password?: string;
  investorPassword?: string;
  password?: string;
  vendorAccountId?: string;
  ownerId?: string;
  [k: string]: unknown;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @Inject(INTEGRATIONS_REPOSITORY) private readonly repo: IntegrationsRepository,
    private readonly crypto: CryptoService,
    @Inject(MT5_PROVIDER) private readonly provider: Mt5Provider
  ) {}

  async list(ownerId?: string): Promise<{ integrations: PublicIntegration[]; persistence: 'postgres' | 'memory' }> {
    const rows = await this.repo.list(ownerId);
    return {
      integrations: rows.map(toPublicIntegration),
      persistence: this.repo.persistence,
    };
  }

  async get(id: string): Promise<PublicIntegration> {
    return toPublicIntegration(await this.mustFind(id));
  }

  /**
   * INTERNAL (scheduler/M3 only): full rows including the sealed credential. Never reachable
   * from a controller — the HTTP surface only ever sees `toPublicIntegration()`.
   */
  listRows(ownerId?: string): Promise<IntegrationRow[]> {
    return this.repo.list(ownerId);
  }

  async rowById(id: string): Promise<IntegrationRow> {
    return this.mustFind(id);
  }

  /** Persist a fresh display snapshot (never writes a journal — see ADR-022). */
  cacheAccountState(input: {
    integrationAccountId: string;
    equity: number;
    balance: number;
    margin?: number | null;
    currency: string;
    serverTime?: string | null;
  }): Promise<unknown> {
    if (!this.repo.upsertAccountState) return Promise.resolve(null);
    return this.repo.upsertAccountState(input);
  }

  /**
   * `ownerId` SELALU dari server (OwnerGuard/ADR-023) — `body.ownerId` dari klien diabaikan.
   * Parameter ini diisi controller dari `req.ownerId`; pemanggil lama (tes/unit) tanpa argumen
   * otomatis memakai `LOCAL_OWNER`, jadi perilaku lama utuh.
   */
  async create(
    body: CreateIntegrationBody,
    ownerId: string = LOCAL_OWNER
  ): Promise<{ integration: PublicIntegration; notice: string }> {
    const fields = validateIntegrationFields(body);
    const credential = applyCredentialPolicy(body, 'create');
    const errors = [...fields.errors, ...credential.errors];
    if (errors.length) throw new BadRequestException(errors.join(' '));

    const type = (body.type ?? 'MT5_CLOUD').toUpperCase() as 'MT5_CLOUD' | 'MT5_STATEMENT';
    const existing = await this.repo.findByLogin(ownerId, type, fields.value!.login);
    if (existing) {
      throw new BadRequestException(
        `Akun ${type} "${fields.value!.login}" sudah terdaftar (id ${existing.id}). Gunakan PATCH /integrations/${existing.id}.`
      );
    }

    // Pengecekan findByLogin() di atas menangani kasus normal; adapter tetap memegang
    // invariant unik (ownerId, type, login) untuk kasus balapan (dua POST bersamaan).
    // Tanpa penanganan ini klien mendapat 500 generik — sekarang 400 ramah (audit #2).
    let row: IntegrationRow;
    try {
      row = await this.repo.create({
        ownerId,
        type,
        label: fields.value!.label,
        login: fields.value!.login,
        server: fields.value!.server,
        port: fields.value!.port ?? null,
        enabled: body.enabled === false ? false : true,
        credentialCipher: this.crypto.encrypt(credential.investorPassword!),
        vendorAccountId: body.vendorAccountId ?? null,
      });
    } catch (err) {
      if (err instanceof IntegrationConflictError) {
        throw new BadRequestException(
          `Akun ${type} "${fields.value!.login}" sudah terdaftar. Muat ulang daftar integrasi, lalu gunakan PATCH /integrations/<id> untuk memperbarui.`
        );
      }
      throw err;
    }
    this.logger.log(
      `Integration ${row.type} ${row.login}@${row.server} registered (${this.repo.persistence}, credential sealed with AES-256-GCM, ${this.crypto.keySource} key).`
    );
    return { integration: toPublicIntegration(row), notice: ROTATION_NOTICE };
  }

  async update(id: string, body: CreateIntegrationBody): Promise<PublicIntegration> {
    const current = await this.mustFind(id);
    const patch: IntegrationPatch = {};

    if (typeof body.label === 'string' && body.label.trim().length >= 2) patch.label = body.label.trim();
    if (typeof body.server === 'string' && body.server.trim().length >= 2) patch.server = body.server.trim();
    if (body.port !== undefined) {
      const port = body.port === null || body.port === '' ? null : Number(body.port);
      if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) {
        throw new BadRequestException('port harus integer 1–65535.');
      }
      patch.port = port;
    }
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (typeof body.vendorAccountId === 'string') patch.vendorAccountId = body.vendorAccountId;

    const credential = applyCredentialPolicy(body, 'update');
    if (credential.errors.length) throw new BadRequestException(credential.errors.join(' '));
    if (credential.investorPassword) patch.credentialCipher = this.crypto.encrypt(credential.investorPassword);

    if (!Object.keys(patch).length) {
      throw new BadRequestException('Tidak ada perubahan yang diakui (label/server/port/enabled/investor password).');
    }
    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Integration ${id} not found.`);
    this.logger.log(`Integration ${id} updated (${Object.keys(patch).join(', ')}).`);
    return toPublicIntegration(updated);
  }

  async remove(id: string): Promise<{ status: 'removed'; id: string; notice: string }> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Integration ${id} not found.`);
    this.logger.log(`Integration ${id} disconnected (credential shredded).`);
    return { status: 'removed', id, notice: ROTATION_NOTICE };
  }

  /** POST /integrations/:id/test — read-only probe; never echoes the credential. */
  async testConnection(id: string): Promise<ProviderTestResult & { integrationId: string; label: string }> {
    const row = await this.mustFind(id);
    const started = Date.now();
    try {
      const result = await this.provider.testAccount(this.toProviderAccount(row));
      return { ...result, latencyMs: Date.now() - started, integrationId: row.id, label: row.label };
    } catch (err) {
      // Friendly failure, never a stack trace in the payload (coverage / vendor outage / bad server).
      return {
        ok: false,
        provider: this.provider.id,
        mode: 'read-only',
        supported: false,
        message: friendlyProviderError(err),
        latencyMs: Date.now() - started,
        integrationId: row.id,
        label: row.label,
      };
    }
  }

  /** Internal: credential material for the scheduler (M3). Never serialized to a response. */
  toProviderAccount(row: IntegrationRow): ProviderAccount {
    return {
      integrationAccountId: row.id,
      login: row.login,
      server: row.server,
      port: row.port ?? null,
      password: this.crypto.decrypt(row.credentialCipher),
      vendorAccountId: row.vendorAccountId ?? undefined,
    };
  }

  private async mustFind(id: string): Promise<IntegrationRow> {
    const row = await this.repo.find(id);
    if (!row) throw new NotFoundException(`Integration ${id} not found.`);
    return row;
  }
}

