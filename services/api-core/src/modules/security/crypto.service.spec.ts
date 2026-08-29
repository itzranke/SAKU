import { afterEach, describe, expect, it } from 'vitest';
import { createCipheriv, createHash, createDecipheriv, randomBytes } from 'crypto';
import { CryptoService, MissingEncryptionKeyError } from './crypto.service';

const originalKey = process.env.ENCRYPTION_MASTER_KEY;
const originalEnv = process.env.NODE_ENV;
const SECRET = 'Inv3stor-Readonly-Passw0rd-91827364';

afterEach(() => {
  if (originalKey === undefined) delete process.env.ENCRYPTION_MASTER_KEY;
  else process.env.ENCRYPTION_MASTER_KEY = originalKey;
  if (originalEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv;
});

describe('CryptoService (AES-256-GCM envelope)', () => {
  it('round-trips a credential through iv:tag:ciphertext', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    const crypto = new CryptoService();
    const envelope = crypto.encrypt(SECRET);

    expect(envelope.split(':')).toHaveLength(3);
    expect(CryptoService.looksLikeEnvelope(envelope)).toBe(true);
    expect(envelope).not.toContain(SECRET);
    expect(crypto.decrypt(envelope)).toBe(SECRET);
    expect(crypto.keySource).toBe('env');
  });

  it('produces a different envelope for the same plaintext (random IV)', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    const crypto = new CryptoService();
    expect(crypto.encrypt(SECRET)).not.toBe(crypto.encrypt(SECRET));
  });

  it('rejects tampered ciphertext instead of returning garbage (auth tag)', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    const crypto = new CryptoService();
    const [iv, tag, data] = crypto.encrypt(SECRET).split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] = flipped[0] ^ 0xff; // real bit flip -> GCM auth tag mismatch
    expect(() => crypto.decrypt(`${iv}:${tag}:${flipped.toString('base64')}`)).toThrow();
    expect(() => crypto.decrypt(`${iv}:${tag}`)).toThrow(/Malformed credential envelope/);
    expect(() => crypto.decrypt(`${iv}:${tag}:${Buffer.concat([flipped, Buffer.from('x')]).toString('base64')}`)).toThrow();
  });

  it('fails to decrypt with a different master key', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'key-A-32-bytes-long-aaaaaaaaaaaaa!!';
    const a = new CryptoService();
    const envelope = a.encrypt(SECRET);
    process.env.ENCRYPTION_MASTER_KEY = 'key-B-32-bytes-long-bbbbbbbbbbbbbb!';
    const b = new CryptoService();
    expect(() => b.decrypt(envelope)).toThrow();
  });

  it('refuses empty input and malformed envelopes', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    const crypto = new CryptoService();
    expect(() => crypto.encrypt('')).toThrow(/refuses empty/);
    expect(() => crypto.decrypt('plaintext-not-an-envelope')).toThrow(/Malformed credential envelope/);
  });

  it('reEncrypt rotates the envelope, value survives', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'saku_unit_test_key_32_bytes_long!!';
    const crypto = new CryptoService();
    const first = crypto.encrypt(SECRET);
    const second = crypto.reEncrypt(first);
    expect(second).not.toBe(first);
    expect(crypto.decrypt(second)).toBe(SECRET);
  });

  it('production without ENCRYPTION_MASTER_KEY is a hard boot error', () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    process.env.NODE_ENV = 'production';
    expect(() => new CryptoService()).toThrow(MissingEncryptionKeyError);
  });

  it('dev without ENCRYPTION_MASTER_KEY still works (loudly derived key)', () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    process.env.NODE_ENV = 'test';
    const crypto = new CryptoService();
    expect(crypto.keySource).toBe('dev-ephemeral');
    expect(crypto.decrypt(crypto.encrypt(SECRET))).toBe(SECRET);
  });

  it('interoperates with a raw node cipher (format is standard, not bespoke)', () => {
    const raw = 'saku_unit_test_key_32_bytes_long!!';
    const key = createHash('sha256').update(raw, 'utf8').digest();
    process.env.ENCRYPTION_MASTER_KEY = raw;
    const envelope = new CryptoService().encrypt('halo-dunia');
    const [iv, tag, data] = envelope.split(':');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    expect(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString()).toBe('halo-dunia');
    // and the other direction
    const iv2 = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', key, iv2);
    const enc = Buffer.concat([c.update('balik-arah', 'utf8'), c.final()]);
    const ours = new CryptoService();
    expect(ours.decrypt(`${iv2.toString('base64')}:${c.getAuthTag().toString('base64')}:${enc.toString('base64')}`)).toBe('balik-arah');
  });
});
