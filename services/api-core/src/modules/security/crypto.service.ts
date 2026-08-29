/**
 * CryptoService — AES-256-GCM envelope encryption for connector credentials (ADR-022 M2).
 *
 * Format stored in `integration_accounts.credentialCipher`:  `iv:tag:ciphertext`
 * (all three base64). GCM gives confidentiality AND integrity: a tampered row fails to
 * decrypt instead of silently returning garbage.
 *
 * Key material: env `ENCRYPTION_MASTER_KEY` (any length; sha256-normalised to 32 bytes).
 * Without it we refuse to boot in production. Outside production a deterministic dev key is
 * derived from a fixed salt, LOUDLY warned — so `pnpm dev` and unit tests work while nobody
 * mistakes it for a usable secret.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce
export const REDACTED = '[REDACTED]';

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super('ENCRYPTION_MASTER_KEY is required to store connector credentials (see .env.example).');
    this.name = 'MissingEncryptionKeyError';
  }
}

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;
  readonly keySource: 'env' | 'dev-ephemeral';

  constructor() {
    const raw = process.env.ENCRYPTION_MASTER_KEY;
    if (raw && raw.trim().length >= 16) {
      this.key = createHash('sha256').update(raw.trim(), 'utf8').digest();
      this.keySource = 'env';
    } else if (process.env.NODE_ENV === 'production') {
      throw new MissingEncryptionKeyError();
    } else {
      this.key = createHash('sha256').update('saku-dev-only-encryption-key').digest();
      this.keySource = 'dev-ephemeral';
    }
  }

  onModuleInit() {
    if (this.keySource === 'dev-ephemeral') {
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY absent — using a DEV-ONLY derived key. Credentials stored now are NOT safe for shared/production databases.'
      );
    }
  }

  /** `iv:tag:ciphertext` (base64). Empty/undefined input is rejected, not stored as "". */
  encrypt(plaintext: string): string {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
      throw new Error('encrypt() refuses empty credentials');
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
  }

  decrypt(envelope: string): string {
    const parts = typeof envelope === 'string' ? envelope.split(':') : [];
    if (parts.length !== 3) throw new Error('Malformed credential envelope (expected iv:tag:ciphertext)');
    const [ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  }

  /** Cheap guard for tests & ops: does this look like one of our envelopes? */
  static looksLikeEnvelope(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 3 && parts.every((p) => p.length > 8 && /^[A-Za-z0-9+/=]+$/.test(p));
  }

  /** Rotating the master key: re-envelope every stored credential (single-user, tiny table). */
  reEncrypt(envelope: string): string {
    return this.encrypt(this.decrypt(envelope));
  }
}
