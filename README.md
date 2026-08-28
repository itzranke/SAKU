# 👛 SAKU — Personal Financial Operating System

> **SAKU** (Financial Operating System) is an institutional-grade, multi-asset personal wealth and active trading management platform built for individuals, investors, and active traders.

---

## 🌟 Core Pillars of SAKU

1. **Immutable Double-Entry Ledger Core**: Every financial balance is backed by balanced debit and credit journal entries. Zero ghost balances.
2. **Unified Asset Aggregation**: Consolidates Bank Accounts, E-Wallets, Cash, Stocks (IDX/US), Mutual Funds, Bonds/SBN, Crypto, and Active MT4/MT5 Forex trading accounts into one dashboard.
3. **Frictionless Data Ingestion**: Fast 1-tap mobile capture, Telegram/WhatsApp bot receipt assistant, and visual e-Statement staging parser.
4. **Active Trading Journal & MT5 Sync**: Read-only MetaTrader 5 bridge for automated trade ingestion, drawdown analytics, win-rate metrics, and trade tagging.
5. **Zero-Trust Envelope Encryption**: Privacy-first security ensuring sensitive API credentials remain encrypted at rest.

---

## 🏗️ Repository Architecture (Turborepo Monorepo)

```
saku/
├── apps/
│   ├── web/               # Next.js 14 Web Application (App Router, Tailwind CSS)
│   ├── desktop/           # Tauri 2.0 Desktop Wrapper (Rust + Next.js)
│   └── mobile/            # React Native Expo Mobile App
│
├── packages/
│   ├── ui/                # Shared Tailwind React Component Library
│   ├── database/          # Prisma / PostgreSQL Schemas & Migrations
│   ├── ledger-core/       # Pure Double-Entry Accounting Core Engine
│   └── types/             # Shared TypeScript Type Definitions
│
├── services/
│   ├── api-core/          # NestJS Primary Backend REST & WebSocket Service
│   └── market-worker/     # Go Microservice for Price Feeds & MT5 Ingestion
│
├── .github/
│   └── workflows/         # GitHub Actions CI/CD Pipeline
└── docker-compose.yml     # Local Dev Environment (PostgreSQL 16, TimescaleDB, Redis 7)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or later
- **pnpm**: `v9.x` (`npm install -g pnpm`)
- **Docker & Docker Compose** (for local database environment)
- **Go**: `v1.22+` (optional, for market-worker)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/YOUR_USERNAME/saku.git
cd saku
pnpm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Start Local Infrastructure (PostgreSQL, TimescaleDB, Redis)
```bash
docker-compose up -d
```

### 4. Run Database Migrations
```bash
pnpm --filter @saku/database db:push
```

### 5. Start Development Servers
```bash
pnpm dev
```
* Web App will be running at `http://localhost:3000`
* API Core will be running at `http://localhost:4000`

---

## 📄 License & Compliance

SAKU is released under the **MIT License**.

> *Disclaimer: SAKU is a personal data management and financial analytics operating system. It does not provide investment, tax, or legal advice.*
