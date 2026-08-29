# 🌳 SAKU SYSTEM TREE, WORKFLOW, SKELETON MODEL, & ACTION PLAN

---

## 1. REPOSITORY TREE MODEL (FULL MONOREPO HIERARCHY)

```
saku/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # GitHub Actions CI/CD Pipeline
│       └── release.yml                     # Automated Release Pipeline
│
├── apps/
│   ├── web/                                # Next.js 14 Web Application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx              # Root Dark Mode Layout (#090D16)
│   │   │   │   ├── page.tsx                # Single-Pane Net Worth Dashboard
│   │   │   │   ├── globals.css             # Tailwind & Tabular Numbers CSS
│   │   │   │   └── components/
│   │   │   │       └── TransactionModal.tsx# Framer Motion 1-Tap Ledger Modal
│   │   ├── package.json
│   │   └── tailwind.config.js
│   │
│   ├── desktop/                            # Tauri 2.0 Desktop Wrapper (Rust)
│   │   └── package.json
│   │
│   └── mobile/                             # React Native Expo Mobile App
│       └── package.json
│
├── packages/
│   ├── ledger-core/                        # Immutable Double-Entry Accounting Core
│   │   ├── index.ts                        # Journal Balancing Math (`Sum(Debits) === Sum(Credits)`)
│   │   ├── index.test.ts                   # Vitest Suite (100% Passed)
│   │   └── package.json
│   │
│   ├── database/                           # Prisma Schemas & Database Layer
│   │   ├── schema.prisma                   # PostgreSQL 16 + TimescaleDB Models
│   │   ├── seed.ts                         # Default Chart of Accounts Seeder
│   │   └── package.json
│   │
│   ├── ui/                                 # Shared React Component Library
│   │   └── package.json
│   │
│   └── types/                              # Shared TypeScript Type Definitions
│       └── package.json
│
├── services/
│   ├── api-core/                           # NestJS Core REST & WebSocket API
│   │   └── package.json
│   │
│   ├── market-worker/                      # Go Microservice (Market Quotes)
│   │   └── main.go
│   │
│   └── mt5-bridge-ea/                      # MetaTrader 5 Local Bridge EA
│       └── SakuBridge.mq5                  # MQL5 OnTradeTransaction() Hook Script
│
├── docs/                                   # Complete Knowledge Bank & Blueprints
│   ├── CASE_STUDIES_AND_PRECEDENTS.md
│   ├── CATASTROPHIC_FAILURE_VECTORS_AND_DEFENSES.md
│   ├── DESIGN.md
│   ├── FINANCIAL_CONCEPTS_BANK.md
│   ├── FINANCIAL_KNOWLEDGE_BANK.md
│   ├── FULL_SPECTRUM_FINANCIAL_TOUCHPOINTS.md
│   ├── GRAND_TERMINAL_ANALOGY_AND_LITERATURE_BANK.md
│   ├── LIGHTWEIGHT_SINGLE_PANE_ARCHITECTURE.md
│   ├── LOCALIZATION_HOUSEHOLD_SHARING_AND_BCP.md
│   ├── OVERLOOKED_STRATEGIC_PILLARS_AND_EXECUTION_ROADMAP.md
│   ├── SONZI_FINANCIAL_FRAMEWORK.md
│   ├── UI_UX_PRO_MAX_SKILLS.md
│   ├── USER_PERSPECTIVES_AND_MULTI_PERSONA_AUDIT.md
│   └── WORLD_FIRST_POSITIONING_AND_GAP_AUDIT.md
│
├── .env.example                            # Environment Variable Template
├── .gitignore
├── CLAUDE.md                               # Repository Standing Brief
├── docker-compose.yml                      # Local Dev DB (Postgres 16 + TimescaleDB + Redis 7)
├── package.json                            # Turborepo Monorepo Config
├── pnpm-workspace.yaml                     # Workspace Package Manager
├── PRD.md                                  # Product Requirement Document
├── STYLEGUIDE.md                           # Engineering & Design Styleguide
├── TASK.md                                 # Actionable Task Backlog
└── turbo.json                              # Build Pipeline Caching
```

---

## 2. KERANGKA KERJA (FRAMEWORK ARCHITECTURE STACK)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAKU TECH STACK FRAMEWORK                                                   │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Layer             │ Technologies Used                                       │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Frontend Web      │ Next.js 14 (App Router), React 18, Tailwind CSS,        │
│                   │ Framer Motion, Tabular Typography (`tabular-nums`)      │
│ Desktop Wrapper   │ Tauri 2.0 (Rust)                                        │
│ Mobile Framework  │ React Native with Expo                                  │
│ Core API Backend  │ NestJS (TypeScript REST & WebSockets)                   │
│ Market Worker     │ Go 1.22 Microservice                                    │
│ MetaTrader Bridge │ MQL5 Expert Advisor Script (`SakuBridge.mq5`)           │
│ Relational Core   │ PostgreSQL 16 (Immutable Double-Entry Ledger)          │
│ Time-Series DB    │ TimescaleDB Hypertables (Net Worth Snapshots)           │
│ Cache & Pub/Sub   │ Redis 7 (In-Memory Cache & OTP Rate-Limiting)           │
│ Monorepo Manager  │ Turborepo + pnpm Workspaces                             │
│ CI/CD Pipeline    │ GitHub Actions (`.github/workflows/ci.yml`)             │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 3. ALUR KERJA SAKU (WORKFLOW LIFECYCLE ORDER)

```
[PRD.md] ──► [STYLEGUIDE.md] ──► [TASK.md] ──► [PLAN] ──► [BUILD]
```

1. **`PRD.md`**: Menetapkan spesifikasi fungsional, persona, dan syarat produk.
2. **`STYLEGUIDE.md`**: Menetapkan standar koding TypeScript dan desain UI/UX.
3. **`TASK.md`**: Memecah kebutuhan menjadi *backlog task* bercentang (`[x]` / `[ ]`).
4. **`PLAN`**: Perencanaan logika sebelum koding menggunakan mode membaca file.
5. **`BUILD`**: Eksekusi koding, pengujian unit test, dan push ke GitHub.

---

## 4. SKELETON MODEL (DATA BOUNDARY & MODULE MAP)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAKU MODULE BOUNDARY MAP                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. IDENTITY & WORKSPACE MODULE  : Auth OTP, Workspace, RBAC, RLS            │
│ 2. LEDGER ACCOUNTING MODULE     : Accounts, Ledger Journals, Entries        │
│ 3. STATEMENT STAGING MODULE     : PDF/CSV Upload, Rule Matcher Engine       │
│ 4. FAST INGESTION BOT MODULE    : Telegram/WhatsApp Webhook Bot             │
│ 5. ACTIVE TRADING MT5 MODULE    : MQL5 EA Payload, Closed Deals, Equity       │
│ 6. WEALTH & SONZI ENGINE MODULE : Emergency Buffer, SONZI Presets, FIRE 4%  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. SARAN LANGKAH EKSEKUSI SELANJUTNYA (RECOMMENDED NEXT STEPS)

Sesuai urutan *backlog* pada `TASK.md`, berikut adalah **3 Langkah Konkret Selanjutnya**:

1. **Langkah 1: Membangun Endpoint NestJS MT5 Sync (`services/api-core`)**:
   - Membangun controller `/api/v1/trading/sync` untuk menerima data ekuitas dan deal dari MQL5 EA (`SakuBridge.mq5`).
2. **Langkah 2: Membangun UI Staging e-Statement Parser (`apps/web/src/app/staging`)**:
   - Membangun halaman drag-and-drop file CSV/PDF bank lokal dengan aturan *auto-categorization* sebelum masuk ke ledger.
3. **Langkah 3: Membangun Bot Webhook Telegram Fast-Capture (`services/api-core/bot`)**:
   - Membangun listener webhook Telegram untuk mencatat transaksi kilat (`Kopi 25k BCA`).
