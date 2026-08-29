import { Module } from '@nestjs/common';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AccountsController } from './modules/accounts/accounts.controller';
import { AccountsService } from './modules/accounts/accounts.service';
import { TradingController } from './modules/trading/trading.controller';
import { TradingService } from './modules/trading/trading.service';

@Module({
  imports: [],
  controllers: [AuthController, AccountsController, TradingController],
  providers: [AuthService, AccountsService, TradingService],
})
export class AppModule {}
