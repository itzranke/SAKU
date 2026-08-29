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
import { Logger } from '@nestjs/common';
import { LedgerController } from './modules/ledger/ledger.controller';
import { LedgerService } from './modules/ledger/ledger.service';
import { InMemoryLedgerRepository } from './modules/ledger/in-memory-ledger.repository';
import { LEDGER_REPOSITORY, LedgerRepository } from './modules/ledger/ledger.repository';

/**
 * Ledger persistence switch (Tahap 4 wiring):
 *   DATABASE_URL set   -> PrismaLedgerRepository (@saku/database, PostgreSQL/TimescaleDB)
 *   DATABASE_URL unset -> InMemoryLedgerRepository (dev/demo, volatile)
 * The @saku/database import is lazy & guarded so the API boots even without generated Prisma artifacts.
 */
export function buildLedgerRepository(): LedgerRepository | Promise<LedgerRepository> {
  if (process.env.DATABASE_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const db = require('@saku/database');
      return new db.PrismaLedgerRepository(process.env.DATABASE_URL, 'default-workspace-id');
    } catch (err) {
      Logger.warn(
        `DATABASE_URL is set but @saku/database PrismaLedgerRepository failed to load (${(err as Error).message}). Falling back to in-memory ledger.`,
        'LedgerBootstrap'
      );
    }
  }
  return new InMemoryLedgerRepository();
}

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
    LedgerController,
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
    LedgerService,
    {
      provide: LEDGER_REPOSITORY,
      useFactory: buildLedgerRepository,
    },
  ],
})
export class AppModule {}
