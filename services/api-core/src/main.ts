import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { installConsoleRedaction } from './modules/security/secret-redaction';
import { SessionService } from './modules/auth/session.service';

async function bootstrap() {
  // ADR-022 M2: credentials must never reach logs, whatever a dependency prints.
  installConsoleRedaction();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 SAKU Core API running at http://localhost:${port}/api/v1`);
  // ADR-024 fase 2: pulihkan sesi aktif dari `auth_sessions`. SENGAJA setelah listen dan
  // TIDAK di-await: DB yang lambat/mati tidak boleh menunda kesiapan HTTP (CI pernah gagal
  // curl exit 7 karena hidrasi memblokir bootstrap). Sesi in-memory tetap melayani sementara.
  void app
    .get(SessionService)
    .hydrate()
    .catch(() => undefined);
}
bootstrap();
