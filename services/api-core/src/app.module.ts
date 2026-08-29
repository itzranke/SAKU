import { Module } from '@nestjs/common';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AccountsController } from './modules/accounts/accounts.controller';
import { AccountsService } from './modules/accounts/accounts.service';
import { TradingController } from './modules/trading/trading.controller';
import { TradingService } from './modules/trading/trading.service';
import { BotController } from './modules/bot/bot.controller';
import { BotService } from './modules/bot/bot.service';
import { StagingController } from './modules/staging/staging.controller';
import { StagingService } from './modules/staging/staging.service';
import { SonziController } from './modules/sonzi/sonzi.controller';
import { SonziService } from './modules/sonzi/sonzi.service';
import { SecurityController } from './modules/security/security.controller';
import { SecurityService } from './modules/security/rate-limiter.service';

@Module({
  imports: [],
  controllers: [
    AuthController,
    AccountsController,
    TradingController,
    BotController,
    StagingController,
    SonziController,
    SecurityController,
  ],
  providers: [
    AuthService,
    AccountsService,
    TradingService,
    BotService,
    StagingService,
    SonziService,
    SecurityService,
  ],
})
export class AppModule {}
