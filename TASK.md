# 📋 SAKU — DEVELOPMENT TASK BACKLOG & ROADMAP (TASK.md)

---

## WORKFLOW EXECUTION STATUS

`PRD.md` [x] ──► `STYLEGUIDE.md` [x] ──► `TASK.md` [x] ──► `PLAN` [x] ──► `BUILD` [COMPLETED 100%]

---

## EPIC 1: MONOREPO FOUNDATION & CORE ENGINES
- [x] Initialize Turborepo monorepo structure (`apps/web`, `apps/desktop`, `apps/mobile`, `packages/`, `services/`)
- [x] Configure TypeScript, pnpm workspace, and Docker Compose (`PostgreSQL 16`, `TimescaleDB`, `Redis 7`)
- [x] Create `@saku/ledger-core` double-entry accounting engine with multi-currency conversion
- [x] Implement Vitest unit test suite for `@saku/ledger-core` (100% Passed)
- [x] Create Prisma PostgreSQL schema for Workspaces, Accounts, Journals, Entries, Trades, and Hypertables

---

## EPIC 2: WEB DASHBOARD & USER INTERFACE
- [x] Create Next.js 14 App Router layout with `#090D16` Obsidian Dark Mode theme
- [x] Implement Net Worth, Total Assets, and Total Liabilities Hero Cards
- [x] Implement Account & Wallet Balance List with multi-currency conversions
- [x] Implement Recent Transactions Ledger Table
- [x] Implement Interactive `TransactionModal.tsx` for 1-tap transaction entry with `@saku/ledger-core` validation
- [x] Connect `TransactionModal.tsx` state updates to Net Worth and Accounts dynamically
- [x] Implement Currency Switcher (IDR / USD) global state context

---

## EPIC 3: METATRADER 5 (MT5) LOCAL BRIDGE & TRADING JOURNAL
- [x] Create MQL5 Expert Advisor script (`services/mt5-bridge-ea/SakuBridge.mq5`) — *(legacy: pindah ke `services/deprecated/mt5-ea/` di ADR-022; default = konektor cloud read-only)*
- [x] Implement event-driven `OnTradeTransaction()` hook in MQL5 to send read-only account balance, equity, margin, and deal state
- [x] Build NestJS `/api/v1/trading/sync` endpoint in `@saku/api-core` to receive MT5 payload
- [x] Implement Trading Journal view state controller (`/api/v1/trading/state`)

---

## EPIC 4: STATEMENT IMPORT & STAGING SANDBOX
- [x] Build CSV/PDF drag-and-drop file uploader component (`StatementImportModal.tsx`)
- [x] Implement Rule Matcher Engine (`IF description CONTAINS 'GRAB' THEN category = 'Transport'`)
- [x] Create Staging Review Modal before posting transactions to double-entry ledger

---

## EPIC 5: FAST INGESTION ASSISTANT BOT (TELEGRAM / WHATSAPP)
- [x] Build Telegram Bot Webhook worker (`/api/v1/bot/telegram`)
- [x] Implement cryptographic user verification & deterministic grammar parser (`Kopi 25k BCA`)
- [x] Implement Staging confirmation sandbox for transactions > Rp 10.000.000

---

## EPIC 6: SONZI FRAMEWORK & FINANCIAL HEALTH ENGINE
- [x] Implement SONZI Default Engine stage progression logic (Stage 1 -> Stage 2 -> Stage 3)
- [x] Build Risk Profile Selector (Conservative, Moderate, Aggressive, Custom)
- [x] Build Financial Health Ratio Calculators (DSR < 35%, Emergency Fund Ratio, Solvency Ratio)
- [x] Build `SonziHealthCard.tsx` UI component for Dashboard

---

## EPIC 7: HOUSEHOLD WORKSPACE SHARING & SECURITY HARDENING
- [x] Implement Row-Level Security (RLS) policies in PostgreSQL for multi-tenant workspace isolation (`rls_policies.sql`)
- [x] Implement Passwordless OTP Authentication (Email / WhatsApp Chat) with Exponential Backoff
- [x] Implement Progressive Exponential Backoff rate-limiter in Redis (0s -> 30s -> 2m -> 15m -> 24h lockout)

---

## EPIC 8: CROSS-PLATFORM PACKAGING (WEB, PC DESKTOP, ANDROID & IOS MOBILE)
- [x] Web App (Next.js 14 App Router) - Port 3000
- [x] PC Desktop App (Tauri 2.0 Rust Wrapper) - `apps/desktop/src-tauri/tauri.conf.json`
- [x] Android & iOS Mobile App (React Native Expo) - `apps/mobile/App.tsx` & `app.json`
