import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { installConsoleRedaction } from './modules/security/secret-redaction';

async function bootstrap() {
  // ADR-022 M2: credentials must never reach logs, whatever a dependency prints.
  installConsoleRedaction();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 SAKU Core API running at http://localhost:${port}/api/v1`);
}
bootstrap();
