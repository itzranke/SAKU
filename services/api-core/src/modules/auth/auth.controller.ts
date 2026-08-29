import { Controller, POST, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @POST('request-otp')
  requestOtp(@Body() body: { identifier: string }) {
    return this.authService.requestOtp(body.identifier);
  }

  @POST('verify-otp')
  verifyOtp(@Body() body: { identifier: string; code: string }) {
    return this.authService.verifyOtp(body.identifier, body.code);
  }
}
