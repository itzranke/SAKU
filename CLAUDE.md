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

## 🪶 PONYTAIL — disiplin anti-bloat (aktif di SETIAP respons, level default `full`)

> Sumber: `github.com/DietrichGebert/ponytail` (MIT). Sengaja dipasang sebagai **blok teks**, bukan
> plugin/hooks/MCP/dependensi baru — memasang ekosistem plugin demi skill anti-bloat adalah ironi yang
> dikritik Ponytail sendiri.

**Sebelum menulis kode, panjati TANGGA dan berhenti di anak tangga pertama yang cukup:**

1. **Perlu ada?** Kebutuhan spekulatif → lewati, katakan satu baris (YAGNI).
2. **Sudah ada di repo ini?** Helper/util/tipe/pola yang sudah hidup → pakai ulang
   (ini sumber slop paling sering: duplikasi yang sudah ada).
3. **Stdlib bisa?** Pakai stdlib.
4. **Fitur native platform?** `<input type="date">` > lib kalender · CSS > JS · constraint/DB > kode validasi.
5. **Dependensi yang SUDAH terpasang?** Pakai — jangan tambah dep baru untuk beberapa baris.
6. **Bisa satu baris?** Satu baris.
7. **Baru kode minimum yang bekerja.**

**Aturan turunan**
- Tanpa abstraksi yang tak diminta: interface dengan 1 implementasi, factory dengan 1 produk, config
  untuk nilai tetap — semua itu dilarang.
- **Penghapusan > penambahan.** Sesedikit mungkin file. Diff terpendek yang BENAR.
- Bug fix = **AKAR MASALAH**, bukan gejala: grep semua pemanggil dulu. Satu guard di fungsi bersama
  lebih baik daripada guard di tiap pemanggil.
- Simplifikasi yang disengaja diberi komentar
  `// ponytail: <plafon yang diterima>, <jalur upgrade jika plafon terlampaui>` (panen dengan
  perintah `ponytail debt`).

**Keluaran:** kode dulu, lalu **maksimal 3 baris** —
`[kode] → dilewati: X, tambahkan saat Y`.
Prosa panjang yang membela simplifikasi = kompleksitas yang diselundupkan.
Laporan/walkthrough yang **diminta user** bukan utang.

**Level:** `ponytail lite` (bangun yang diminta + sebut alternatif malas) · `full` (default) ·
`ultra` (YAGNI ekstrem, hapus dulu) · `stop ponytail`.
**Perintah:** `ponytail review` (diff saat ini) · `ponytail audit` (seluruh repo) ·
`ponytail debt` (panen komentar `// ponytail:`).

**🚩 GARIS MERAH yang MENGALAHKAN Ponytail — jangan pernah "dimalaskan":**
validasi di batas kepercayaan · error handling anti-kehilangan-data · keamanan & redaksi kredensial ·
aksesibilitas · apa pun yang diminta user secara eksplisit · **pemahaman masalah** (baca alur end-to-end
dulu — diff kecil di tempat yang salah = bug kedua) · doktrin SAKU (double-entry, read-only MT5, tanpa
endpoint tulis saldo, fallback in-memory saat DB mati, kontrak lama tetap utuh, migrasi via
`prisma db execute`) · **verifikasi penuh + CI hijau sebelum merge**. **TES BUKAN BLOAT.**

---
*CLAUDE.md Standing Brief for SAKU.*
