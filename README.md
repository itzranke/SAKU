# 👛 SAKU — Terminal Keuangan Personal (v1.2.0)

> **SAKU** adalah *pocket financial terminal*: satu tempat untuk **jurnal kekayaan, budgeting, aset, dan hutang**.
> Setiap angka berasal dari jurnal double-entry yang immutable; setiap angka eksternal masuk lewat **konektor** —
> MetaTrader 5 hanyalah salah satunya.
>
> *A pocket financial terminal for wealth journaling, budgeting, assets and debts — institutional-grade double-entry core, built for individuals, households, investors, and active traders.*
>
> 🚀 **Official Repository**: [https://github.com/itzranke/SAKU](https://github.com/itzranke/SAKU)  
> 🏷️ **Latest Release**: `v1.2.0` (MT5 sync tanpa-EA; biner desktop/mobile masih `v1.0.0`, build berikutnya menyusul)

---

## 📲 DOWNLOAD & LIVE ACCESS LINKS

| Platform Target | Type / Distribution | Access & Download Link |
| :--- | :--- | :--- |
| 🌐 **SAKU Web Application** | Next.js 14 App Router | [Launch Live Web App](http://localhost:3000) / [Repository Main](https://github.com/itzranke/SAKU) |
| 💻 **PC Desktop App (Windows)** | Tauri 2.0 Binary (`.exe`) | [Download SAKU-Setup-v1.0.0.exe](https://github.com/itzranke/SAKU/releases/tag/v1.0.0) |
| 🍏 **PC Desktop App (macOS)** | Tauri 2.0 Bundle (`.dmg`) | [Download SAKU-v1.0.0.dmg](https://github.com/itzranke/SAKU/releases/tag/v1.0.0) |
| 🤖 **Android Mobile App** | React Native Expo (`.apk`) | [Download SAKU-v1.0.0.apk](https://github.com/itzranke/SAKU/releases/tag/v1.0.0) |
| 🍎 **iOS Mobile App** | React Native Expo (`.ipa` / TestFlight) | [Join TestFlight / Download IPA](https://github.com/itzranke/SAKU/releases/tag/v1.0.0) |

> Aset unduhan di atas masih build `v1.0.0`; perubahan `v1.2.0` ada di jalur sumber/API (konektor & ledger).

---

## 🔌 Sumber Aset (Connectors)

SAKU tidak punya "modul MT5" yang berdiri sendiri. Yang ada adalah **konektor** — satu kontrak
`Connector { type, credentialRef, syncIntervalSec, normalizer }`
([`services/api-core/src/modules/connectors/connector.ts`](services/api-core/src/modules/connectors/connector.ts)).
Semua konektor hanya boleh menghasilkan **baris deal ternormalisasi** yang masuk ke pipeline jurnal
yang sama; tidak ada konektor yang boleh menulis saldo.

| Konektor | Status | Kredensial | Cadence |
|---|---|---|---|
| `MT5_CLOUD` — MetaTrader 5 via middleware cloud | ✅ aktif | investor password (read-only), AES-256-GCM di sisi server | snapshot 120 dtk · deal 10 mnt |
| `MT5_STATEMENT` — import statement/CSV broker | ✅ aktif (manual) | tidak ada — dokumen dari user | manual/batch |
| `MANUAL` / bot — 1-tap, WhatsApp/Telegram | ✅ aktif | tidak ada | realtime |
| `BANK` (BCA, Mandiri, Jago/Seabank) | 🗺️ roadmap | read-only (API/CSV) | — |
| `CRYPTO` (Indodax, Tokocrypto, exchange) | 🗺️ roadmap | API key **read-only** | — |
| `EWALLET` (GoPay, OVO, DANA, ShopeePay) | 🗺️ roadmap | mutual-aid/export CSV | — |
| `ASET_FISIK` (kendaraan, emas, properti) | 🗺️ roadmap | tidak ada — nilai diisi + bukti foto | manual |
| `HUTANG` (KPR, pinjol, talangan) | 🗺️ roadmap | tidak ada — jadwal angsuran | manual + pengingat |

Menambah sumber aset baru = **satu class** yang mengimplementasikan `Connector` + **satu baris**
di [`registry.ts`](services/api-core/src/modules/connectors/registry.ts). Tidak ada plugin system,
tidak ada DI baru, tidak ada tabel kredensial baru. Kontraknya yang membuat produk tetap ramping
walau sumber datanya banyak.

> 📌 MT5 bukan lagi pusat cerita: dulu jalur utamanya EA di terminal user, sekarang konektor cloud
> read-only (lihat [ADR-022](docs/22_MT5_INVESTOR_SYNC_ADR.md)). EA lama tetap dilayani sebagai
> opsi privasi zero-password — [`services/deprecated/mt5-ea/`](services/deprecated/mt5-ea/).

---

## 🌟 Core Pillars & Key Features

1. **Immutable Double-Entry Ledger Core (`@saku/ledger-core`)**: Every financial balance is backed by balanced debit and credit journal entries. Zero raw scalar number modifications.
2. **Unified Net Worth Aggregation** (via Connectors): Kas, bank, e-wallet, saham, aset fisik, hutang, dan akun trading MT5 — masing-masing masuk sebagai konektor dengan badge sumber di jurnalnya, bukan sebagai fitur terpisah.
3. **SONZI Framework Financial Health Engine**: Adaptive 3-stage wealth protection engine (Stage 1 Safety $\to$ Stage 2 Growth $\to$ Stage 3 FIRE) with customizable risk allocation profiles (Conservative, Moderate, Aggressive).
4. **Statement Import & Staging Sandbox**: Drag-and-drop CSV/PDF bank statement uploader with automated Rule Matcher Engine (`GRAB` $\to$ `Transport`) before ledger posting.
5. **MetaTrader 5 (MT5) Cloud Connector** (ADR-022): read-only server-side sync — user mengisi login + **investor password** + server di Settings → Integrations, SAKU yang menarik snapshot & closed deals (tidak ada yang diinstal di terminal). Rekonsiliasi via import statement/CSV. The MQL5 `SakuBridge.mq5` push EA is **deprecated** and kept as an optional zero-privacy-password path for power users (`services/deprecated/mt5-ea/`).
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
│   └── deprecated/mt5-ea/ # Legacy MQL5 push EA (SakuBridge.mq5) — optional, ADR-022
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
[x] PHASE 5: MetaTrader 5 Trading Journal (jalur EA kini legacy; default = cloud connector, lihat docs/22)
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
# Start Web App (Port 3000). /api/proxy/* is rewritten server-side to the API below.
pnpm --filter @saku/web dev

# Start API Core (Port 4000) — builds the ledger engine first, serves the immutable journal API.
pnpm --filter @saku/api-core dev
```

The dashboard reads live snapshots from the double-entry engine (in-memory seeded journals by default).
For persistence + MT5 wiring see `docs/21_LEDGER_WIRING_AND_PERSISTENCE_RUNBOOK.md`:
`docker compose up -d` → `pnpm --filter @saku/database db:push && db:seed` → start the API with `DATABASE_URL` set.

---

## 📄 License & Compliance

SAKU is released under the **MIT License**.

> *Disclaimer: SAKU is a personal data management and financial analytics operating system. It does not provide investment, tax, or legal advice.*
