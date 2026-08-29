import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  requestOtp(@Body() body: { identifier: string }) {
    return this.authService.requestOtp(body.identifier);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { identifier: string; code: string }) {
    return this.authService.verifyOtp(body.identifier, body.code);
  }
}
