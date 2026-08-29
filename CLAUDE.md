# CLAUDE.md — SAKU FINANCIAL OPERATING SYSTEM

> **PROJECT BRIEF**: SAKU is a lightweight, single-pane Personal Financial & Active Trading Operating System. It consolidates offline cash, banks, e-wallets, informal debts, installments, stock/crypto portfolios, and read-only MT4/MT5 Forex/Gold trading into one master Net Worth & Liquidity console.

---

## 🚨 HIGHEST-PRIORITY CONSTRAINTS (READ FIRST)

1. **PURE DOUBLE-ENTRY LEDGER**:
   - Never update account balances directly. Every balance change MUST be backed by a balanced journal entry (`SUM(Debits * Rate) - SUM(Credits * Rate) === 0`).
2. **NO GHOST BALANCES OR FLOATING-POINT CURRENCY**:
   - Floating-point currency math is strictly forbidden. Use `NUMERIC(20, 4)` for fiat and `NUMERIC(30, 18)` for crypto.
3. **TABULAR NUMERIC TYPOGRAPHY**:
   - All financial numbers in the UI MUST use `font-variant-numeric: tabular-nums` to prevent visual layout jitter.
4. **LIGHTWEIGHT SINGLE-PANE UX (PONYTAIL PRINCIPLE)**:
   - Keep the app ultra-fast (< 1 second load). Do NOT add heavy background math workers (e.g. Monte Carlo, VaR) to the main thread.
5. **NON-ADVISORY COMPLIANCE & UU PDP ACT**:
   - SAKU is a data management tool. All AI insights MUST be statistical facts, never prescriptive financial advice.

---

## 🛠️ TECH STACK & MONOREPO ARCHITECTURE

```
saku/
├── apps/
│   ├── web/               # Next.js 14 (App Router, Tailwind CSS, TypeScript)
│   ├── desktop/           # Tauri 2.0 (Rust + Next.js)
│   └── mobile/            # React Native Expo
├── packages/
│   ├── ledger-core/       # Double-Entry Engine (@saku/ledger-core)
│   ├── database/          # Prisma Schemas & Migrations (@saku/database)
│   ├── ui/                # Shared React Tailwind Components (@saku/ui)
│   └── types/             # Shared TypeScript Type Definitions (@saku/types)
└── services/
    ├── api-core/          # NestJS REST & WebSocket API
    └── market-worker/     # Go Microservice (Price Feeds & MT5 Ingestion)
```

---

## ⚡ CORE COMMANDS & WORKFLOWS

* **Start Dev Environment**: `pnpm dev` (Runs Web on `:3000` and API on `:4000`)
* **Run Database Container**: `docker-compose up -d` (PostgreSQL 16 + TimescaleDB + Redis 7)
* **Push Database Schema**: `pnpm --filter @saku/database db:push`
* **Seed Default Accounts**: `pnpm --filter @saku/database exec ts-node seed.ts`
* **Run Unit Tests**: `pnpm --filter @saku/ledger-core test`
* **Build Monorepo**: `pnpm build`
* **Lint Codebase**: `pnpm lint`

---

## 🎨 UI/UX DESIGN SYSTEM TOKENS

* **Root Dark Background**: `#090D16` (Deep Midnight Obsidian)
* **Surface Cards**: `#111827` (Slate Darkness)
* **Surface Borders**: `#1E293B`
* **Income / Asset Increase**: `#10B981` (Emerald Green)
* **Expense / Loss / Liability Increase**: `#F43F5E` (Rose Red)
* **Warning / Due Bills**: `#F59E0B` (Amber Yellow)
* **Primary Action**: `#6366F1` (Indigo Blue)

---

## 🔒 SECURITY & BUSINESS MODEL RULES

* **Auth Flow**: Passwordless OTP to Email or WhatsApp Chat (`/auth/otp`).
* **Rate Limiting**: Progressive Exponential Backoff for OTP requests (0s -> 30s -> 2m -> 15m -> 24h lockout after 5 daily requests).
* **Proprietary IP**: Core double-entry algorithms, MT5 bridge, and statement parsers are 100% closed proprietary IP.
* **Monetization**: Pure Monthly Subscription (SaaS). Zero Lifetime Licenses.

---
*CLAUDE.md Standing Brief for SAKU.*
