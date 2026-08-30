import { describe, expect, it } from 'vitest';
import { friendlyProviderError } from './error-mapping';

/**
 * Satu-satunya tempat aturan "pesan gagal ramah" diuji menyeluruh (audit #7).
 *
 * Yang dijaga di sini: gangguan vendor (5xx/jaringan) TIDAK boleh tampil sebagai
 * "server tidak didukung" — itu menutupi masalah sementara dan menyuruh user pindah
 * jalur impor tanpa sebab.
 */
describe('friendlyProviderError — urutan aturan (audit #7)', () => {
  it('gangguan vendor 5xx -> pesan jaringan, BUKAN "server tidak didukung"', () => {
    for (const message of ['server error 500', 'HTTP 503 unavailable', 'internal server error']) {
      const friendly = friendlyProviderError(message);
      expect(friendly, message).toMatch(/tidak terjangkau/i);
      expect(friendly, message).not.toMatch(/tidak didukung/i);
    }
  });

  it('"server timeout" -> jaringan (kata server tidak lagi menang sendiri)', () => {
    expect(friendlyProviderError('server timeout')).toMatch(/tidak terjangkau/i);
  });

  it('nomor rekening yang berawalan 5xx tidak ikut cocok aturan 5xx', () => {
    // \b5\d\d\b dipagari batas kata: "500123" bukan kode status HTTP.
    expect(friendlyProviderError('Account 500123 not found')).toMatch(/tidak didukung/i);
  });

  it('regresi: identitas server salah tetap -> UNSUPPORTED_SERVER_MESSAGE', () => {
    const cases = [
      'E_SRV_NOT_FOUND',
      'HTTP 404: server "UNKNOWN-BROKER" not found in connector coverage',
      'HTTP 404 E_SRV_NOT_FOUND for server UNKNOWN-BROKER',
      'no such server',
      'unknown server',
    ];
    for (const message of cases) {
      expect(friendlyProviderError(message), message).toMatch(/tidak didukung konektor|Impor statement/i);
    }
  });

  it('regresi: urutan prioritas auth > kuota > server tetap terjaga', () => {
    expect(friendlyProviderError('E_AUTH')).toMatch(/investor password \(read-only\) ditolak/);
    expect(friendlyProviderError('402 payment required')).toMatch(/Kuota/);
    expect(friendlyProviderError('')).toMatch(/tidak didukung/);
  });

  it('tidak pernah mengembalikan stack trace atau lebih dari satu baris', () => {
    const friendly = friendlyProviderError(new Error('boom\n    at somewhere (x.ts:1:1)'));
    expect(friendly).not.toContain('at somewhere');
    expect(friendly).not.toContain('\n');
  });
});
