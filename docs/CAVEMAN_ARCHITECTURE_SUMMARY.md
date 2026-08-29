# 🦴 CAVEMAN ARCHITECTURE SUMMARY (SAKU v1.0.0)

> **Style**: Zero fluff, direct technical statements, high signal density.

---

## ⚡ CORE TECH STACK
- **Monorepo**: Turborepo + pnpm workspaces.
- **Web App**: Next.js 14 App Router + Tailwind CSS + Framer Motion. Port 3000.
- **API Core**: NestJS + RxJS + Prisma ORM. Port 4000. Global Prefix `/api/v1`.
- **Database**: PostgreSQL 16 + TimescaleDB Hypertables + Redis 7.
- **Ledger Core**: Immutable Double-Entry Debit/Credit Engine (`@saku/ledger-core`). Zero scalar balance hacks.
- **Trading Bridge**: MQL5 Expert Advisor (`SakuBridge.mq5`) event hook `OnTradeTransaction()`.
- **Desktop**: Tauri 2.0 Rust Wrapper (`apps/desktop/src-tauri/Cargo.toml`).
- **Mobile**: React Native Expo (`apps/mobile/App.tsx` & `eas.json`).
- **CI/CD**: GitHub Actions Workflow (`.github/workflows/release-builds.yml`).

---

## 🛠️ RUN COMMANDS
```bash
# Test Ledger Engine
pnpm --filter @saku/ledger-core test

# Typecheck Web & API
pnpm --filter @saku/api-core exec tsc --noEmit
pnpm --filter @saku/web exec tsc --noEmit

# Start Web & API
pnpm --filter @saku/web dev
pnpm --filter @saku/api-core dev
```
