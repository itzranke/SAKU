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

@Module({
  imports: [],
  controllers: [
    AuthController,
    AccountsController,
    TradingController,
    BotController,
    StagingController,
  ],
  providers: [
    AuthService,
    AccountsService,
    TradingService,
    BotService,
    StagingService,
  ],
})
export class AppModule {}
