/**
 * ADR-023 fase 1: verify-otp menerbitkan SESI NYATA (sakuSession) di samping kontrak lama;
 * OTP delivery tetap mock console (jujur, lihat ADR-023 §2.5).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { isSensitiveFieldName } from '../security/secret-redaction';

describe('AuthService — sesi ADR-023', () => {
  let logs: string[];
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logs = [];
    spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  function requestAndReadOtp(auth: AuthService, identifier: string): string {
    auth.requestOtp(identifier);
    const line = logs.find((l) => l.includes('OTP Code') && l.includes(identifier));
    expect(line).toBeTruthy();
    const code = line!.match(/(\d{6})/)?.[1];
    expect(code).toBeTruthy();
    return code!;
  }

  it('verify-otp sukses → sakuSession valid (resolve → user-local) + kontrak lama utuh', () => {
    const sessions = new SessionService();
    const auth = new AuthService(sessions);
    const identifier = 'owner@saku.local';
    const code = requestAndReadOtp(auth, identifier);

    const res = auth.verifyOtp(identifier, code) as Record<string, unknown>;
    expect(res.message).toBe('Autentikasi berhasil');
    expect(typeof res.accessToken).toBe('string'); // kontrak lama tetap dikirim
    expect(res.ownerId).toBe('user-local');
    expect(typeof res.sakuSession).toBe('string');
    expect(String(res.sakuSession).length).toBeGreaterThan(30);
    expect(() => new Date(res.sakuSessionExpiresAt as string).toISOString()).not.toThrow();
    expect(sessions.resolve(res.sakuSession as string)).toBe('user-local');
  });

  it('kode salah → BadRequestException, sesi tidak diterbitkan', () => {
    const sessions = new SessionService();
    const auth = new AuthService(sessions);
    const identifier = 'owner2@saku.local';
    requestAndReadOtp(auth, identifier);
    expect(() => auth.verifyOtp(identifier, '000000')).toThrowError(BadRequestException);
    expect(sessions.size()).toBe(0);
  });

  it('field sesi lolos jaring redaksi dua arah (sakuSession ✓; sessionToken ✗ sengaja dihindari)', () => {
    // isSensitiveFieldName adalah aturan yang sama dipakai RedactionInterceptor untuk respons.
    expect(isSensitiveFieldName('sakuSession')).toBe(false);
    expect(isSensitiveFieldName('sakuSessionExpiresAt')).toBe(false);
    // Sementara nama "token" memang harus tersaring (bukti kenapa field kawat bukan sessionToken):
    expect(isSensitiveFieldName('sessionToken')).toBe(true);
    expect(isSensitiveFieldName('accessToken')).toBe(true);
  });
});
