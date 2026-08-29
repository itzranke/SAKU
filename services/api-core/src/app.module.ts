import { Module } from '@nestjs/common';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AccountsController } from './modules/accounts/accounts.controller';
import { AccountsService } from './modules/accounts/accounts.service';
import { TradingController } from './modules/trading/trading.controller';
import { TradingService } from './modules/trading/trading.service';
import { BotController } from './modules/bot/bot.controller';
import { BotService } from './modules/bot/bot.service';
import { TelegramConfigService } from './modules/bot/telegram-config.service';
import { StagingController } from './modules/staging/staging.controller';
import { StagingService } from './modules/staging/staging.service';
import { SonziController } from './modules/sonzi/sonzi.controller';
import { SonziService } from './modules/sonzi/sonzi.service';
import { SecurityController } from './modules/security/security.controller';
import { SecurityService } from './modules/security/rate-limiter.service';
import { PaymentController } from './modules/payment/payment.controller';
import { PaymentService } from './modules/payment/payment.service';
import { B2bController } from './modules/b2b/b2b.controller';
import { B2bService } from './modules/b2b/b2b.service';
import { ObsidianController } from './modules/obsidian/obsidian.controller';
import { ObsidianService } from './modules/obsidian/obsidian.service';

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
    PaymentController,
    B2bController,
    ObsidianController,
  ],
  providers: [
    AuthService,
    AccountsService,
    TradingService,
    BotService,
    TelegramConfigService,
    StagingService,
    SonziService,
    SecurityService,
    PaymentService,
    B2bService,
    ObsidianService,
  ],
})
export class AppModule {}
