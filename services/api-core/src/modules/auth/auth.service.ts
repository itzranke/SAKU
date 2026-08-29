import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private otpStore = new Map<string, { code: string; count: number; lastRequestedAt: number }>();

  requestOtp(identifier: string) {
    const now = Date.now();
    const record = this.otpStore.get(identifier) || { code: '', count: 0, lastRequestedAt: 0 };

    // Daily hard cap limit: Max 5 requests
    if (record.count >= 5 && now - record.lastRequestedAt < 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Batas maksimal OTP harian telah tercapai (5x/hari). Silakan coba lagi besok.');
    }

    // Exponential Backoff Cooldown check
    let cooldownMs = 0;
    if (record.count === 1) cooldownMs = 30 * 1000;         // 30 seconds
    else if (record.count === 2) cooldownMs = 2 * 60 * 1000; // 2 minutes
    else if (record.count === 3) cooldownMs = 15 * 60 * 1000;// 15 minutes

    if (now - record.lastRequestedAt < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - record.lastRequestedAt)) / 1000);
      throw new BadRequestException(`Silakan tunggu ${waitSec} detik sebelum meminta kode OTP kembali.`);
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore.set(identifier, {
      code: otpCode,
      count: record.count + 1,
      lastRequestedAt: now,
    });

    console.log(`[SAKU AUTH] OTP Code for ${identifier}: ${otpCode}`);

    return {
      message: `Kode OTP verifikasi telah dikirim ke ${identifier}`,
      identifier,
      requestCount: record.count + 1,
      cooldownSeconds: Math.ceil(cooldownMs / 1000),
    };
  }

  verifyOtp(identifier: string, code: string) {
    const record = this.otpStore.get(identifier);
    if (!record || record.code !== code) {
      throw new BadRequestException('Kode OTP salah atau telah kadaluarsa.');
    }

    // Clear OTP after successful verification
    this.otpStore.delete(identifier);

    return {
      message: 'Autentikasi berhasil',
      accessToken: `saku_jwt_mock_token_${identifier}_${Date.now()}`,
      workspaceId: 'default-workspace-id',
    };
  }
}
