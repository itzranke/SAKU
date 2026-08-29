import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncSchedulerService } from './modules/trading/sync-scheduler.service';
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
import { IntegrationsController } from './modules/integrations/integrations.controller';
import { ConnectorsController } from './modules/connectors/connectors.controller';
import { SessionService } from './modules/auth/session.service';
import { SESSION_STORE, SessionStore } from './modules/auth/session.store';
import { OwnerGuard } from './modules/auth/owner.guard';
import { APP_GUARD } from '@nestjs/core';
import { IntegrationsService } from './modules/integrations/integrations.service';
import { InMemoryIntegrationsRepository } from './modules/integrations/in-memory-integrations.repository';
import {
  INTEGRATIONS_REPOSITORY,
  IntegrationsRepository,
} from './modules/integrations/integrations.repository';
import { CryptoService } from './modules/security/crypto.service';
import { RedactionInterceptor } from './modules/security/redaction.interceptor';
import { MT5_PROVIDER, buildMt5Provider } from './modules/integrations/providers/provider.factory';

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

/**
 * Integrations persistence switch (ADR-022 M2) — same rule as the ledger:
 * DATABASE_URL set -> Prisma (integration_accounts, ciphertext at rest), else volatile in-memory.
 */
export function buildIntegrationsRepository(): IntegrationsRepository {
  if (process.env.DATABASE_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const db = require('@saku/database');
      return new db.PrismaIntegrationsRepository(process.env.DATABASE_URL);
    } catch (err) {
      Logger.warn(
        `DATABASE_URL is set but @saku/database PrismaIntegrationsRepository failed to load (${(err as Error).message}). Falling back to in-memory integrations.`,
        'IntegrationsBootstrap'
      );
    }
  }
  return new InMemoryIntegrationsRepository();
}

/**
 * Session persistence switch (ADR-024 fase 2) — aturan yang sama dengan ledger/integrations:
 * DATABASE_URL ada -> PrismaSessionStore (tabel auth_sessions, HASH saja), selain itu `null`
 * sehingga SessionService tetap murni in-memory (perilaku fase 1 & seluruh unit test identik).
 */
export function buildSessionStore(): SessionStore | null {
  if (process.env.DATABASE_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const db = require('@saku/database');
      return new db.PrismaSessionStore(process.env.DATABASE_URL);
    } catch (err) {
      Logger.warn(
        `DATABASE_URL is set but @saku/database PrismaSessionStore failed to load (${(err as Error).message}). Sessions stay in-memory (restart = logout).`,
        'SessionBootstrap'
      );
    }
  }
  return null;
}

@Module({
  // Timers exist only to serve the MT5 connector; every tick self-disables unless
  // MT5_CLOUD_ENABLED=true, so CI and offline dev make zero outbound calls.
  imports: [ScheduleModule.forRoot()],
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
    IntegrationsController,
    ConnectorsController,
  ],
  providers: [
    AuthService,
    SessionService,
    {
      provide: SESSION_STORE,
      useFactory: buildSessionStore,
    },
    { provide: APP_GUARD, useClass: OwnerGuard },
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
    CryptoService,
    IntegrationsService,
    SyncSchedulerService,
    {
      provide: LEDGER_REPOSITORY,
      useFactory: buildLedgerRepository,
    },
    {
      provide: INTEGRATIONS_REPOSITORY,
      useFactory: buildIntegrationsRepository,
    },
    {
      provide: MT5_PROVIDER,
      useFactory: buildMt5Provider,
    },
    {
      // Global credential redaction: responses are stripped, access log is scrubbed.
      provide: APP_INTERCEPTOR,
      useClass: RedactionInterceptor,
    },
  ],
})
export class AppModule {}
