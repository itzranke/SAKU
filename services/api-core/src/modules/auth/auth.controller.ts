import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService
  ) {}

  @Post('request-otp')
  requestOtp(@Body() body: { identifier: string }) {
    return this.authService.requestOtp(body.identifier);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { identifier: string; code: string }) {
    return this.authService.verifyOtp(body.identifier, body.code);
  }

  /**
   * ADR-024 §2.2 — logout. Idempoten dan sengaja tidak membedakan token valid/asing
   * (tidak membocorkan keberadaan sesi). Selalu 200 dengan pesan yang sama.
   */
  @Post('logout')
  @HttpCode(200)
  logout(@Headers('x-saku-session') sessionHeader?: string) {
    this.sessions.revoke(sessionHeader);
    return { message: 'Sesi diakhiri.' };
  }
}
