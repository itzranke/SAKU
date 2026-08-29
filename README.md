# 👛 SAKU — Personal Financial Operating System (v1.0.0 GA Release)

> **SAKU** is an institutional-grade, multi-asset personal wealth and active trading management platform built for individuals, households, investors, and active traders.
>
> 🚀 **Official Repository**: [https://github.com/itzranke/SAKU](https://github.com/itzranke/SAKU)  
> 🏷️ **Latest Release**: `v1.0.0-GA` (General Availability Launch)

---

## 🌟 Core Pillars & Key Features

1. **Immutable Double-Entry Ledger Core (`@saku/ledger-core`)**: Every financial balance is backed by balanced debit and credit journal entries. Zero raw scalar number modifications.
2. **Unified Net Worth Aggregation**: Consolidates Bank Accounts (BCA, Mandiri), E-Wallets (GoPay, OVO), Cash, Stocks (IDX/US), and Active MT5 Forex trading accounts in one unified dashboard.
3. **SONZI Framework Financial Health Engine**: Adaptive 3-stage wealth protection engine (Stage 1 Safety $\to$ Stage 2 Growth $\to$ Stage 3 FIRE) with customizable risk allocation profiles (Conservative, Moderate, Aggressive).
4. **Statement Import & Staging Sandbox**: Drag-and-drop CSV/PDF bank statement uploader with automated Rule Matcher Engine (`GRAB` $\to$ `Transport`) before ledger posting.
5. **MetaTrader 5 (MT5) EA Bridge**: MQL5 Expert Advisor script (`SakuBridge.mq5`) with real-time `OnTradeTransaction()` hook for read-only equity, margin, and profit/loss sync.
6. **Fast Assistant Ingestion Bot**: Telegram Bot Webhook worker (`/api/v1/bot/telegram`) with deterministic grammar parser (`Kopi 25k BCA`) and Rp 10.000.000 staging threshold guardrails.
7. **Cross-Platform Support**: Web (Next.js 14 App Router), PC Desktop (Tauri 2.0 Rust), and Mobile App (React Native Expo).

---

## 🏗️ Repository Architecture (Turborepo Monorepo)

```
saku/
├── apps/
│   ├── web/               # Next.js 14 Web Dashboard (Obsidian Dark Theme #090D16, Framer Motion)
│   ├── desktop/           # Tauri 2.0 Rust Desktop Application Wrapper
│   └── mobile/            # React Native Expo Mobile App (iOS & Android)
│
├── packages/
│   ├── database/          # Prisma / PostgreSQL 16 + TimescaleDB Hypertables & RLS Policies
│   └── ledger-core/       # Immutable Double-Entry Accounting Core Engine & Vitest Suite
│
├── services/
│   ├── api-core/          # NestJS Primary Backend REST & WebSocket API Service
│   └── mt5-bridge-ea/     # MQL5 Local Expert Advisor Script (SakuBridge.mq5)
│
├── CHECKLIST_TREE.md      # Live Production Execution Checklist Tree (Phase 1 - 10 Completed)
├── PRD.md                 # Product Requirements Document
├── STYLEGUIDE.md          # Design System & UI/UX Guidelines
└── TASK.md                # Task Backlog & Roadmap
```

---

## 🚦 Phase 1 - 10 Production Release Status

```
[x] PHASE 1: Monorepo Foundation & Design System (Obsidian Dark #090D16)
[x] PHASE 2: Core Double-Entry Accounting Engine & Database Schemas
[x] PHASE 3: Next.js Interactive Dashboard & Transaction Entry Modals
[x] PHASE 4: NestJS REST & WebSocket API Core Service
[x] PHASE 5: MetaTrader 5 Local Bridge EA & Trading Journal
[x] PHASE 6: Telegram Fast Assistant Ingestion Bot & Grammar Parser
[x] PHASE 7: Statement Import & Staging Sandbox Rule Engine
[x] PHASE 8: SONZI Framework Engine & Financial Health Ratio Indicators
[x] PHASE 9: Household Row-Level Security (RLS) & Security Rate-Limiter
[x] PHASE 10: Production Packaging (Web, PC Desktop Tauri 2.0, Mobile Expo)
```

---

## 🚀 Quick Start Guide

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/itzranke/SAKU.git
cd saku
pnpm install
```

### 2. Run Ledger Unit Test Suite
```bash
pnpm --filter @saku/ledger-core test
```

### 3. Start Development Environment
```bash
# Start Web App (Port 3000)
pnpm --filter @saku/web dev

# Start API Core (Port 4000)
pnpm --filter @saku/api-core dev
```

---

## 📄 License & Compliance

SAKU is released under the **MIT License**.

> *Disclaimer: SAKU is a personal data management and financial analytics operating system. It does not provide investment, tax, or legal advice.*
