import { defineConfig } from 'vitest/config';

/**
 * api-core unit tests run against the pure/`src` modules only — no Prisma client is needed,
 * so they also execute inside sandboxes where `prisma generate` cannot download engines.
 * The DB-backed path is proven separately by the `db-persistence-smoke` CI job (postgres:16).
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
