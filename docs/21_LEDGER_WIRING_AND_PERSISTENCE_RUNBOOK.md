# 21 — Ledger Wiring & Persistence Runbook (caveman mode: high signal, no filler)

> State of the art after session 2026-08-29: dashboard numbers are no longer hardcoded.
> One truth source: append-only double-entry journals in `@saku/ledger-core`.

## Data flow (single direction for money)

```
TransactionModal / CSV staging / Telegram bot / MT5 cloud connector (ADR-022: investor
password, read-only, server-side pull) / import statement MT5 / (legacy: EA SakuBridge push)
        │  simple tx OR raw balanced legs
        ▼
POST /api/v1/ledger/transaction|journal   (services/api-core, LedgerService = single write path)
        │  buildJournalLegs() → validateJournalEntries()   [unbalanced ⇒ HTTP 400]
        ▼
LedgerRepository.appendJournal()          [APPEND-ONLY. No update/delete API exists.]
   ├── InMemoryLedgerRepository           (default dev/demo, volatile, seeds opening + demo journals)
   └── PrismaLedgerRepository             (@saku/database, PostgreSQL/TimescaleDB; atomic journal+legs tx)
        ▲ chosen by buildLedgerRepository(): DATABASE_URL set ⇒ Prisma, else in-memory + loud warn
        │
GET /api/v1/ledger/snapshot  = buildLedgerSnapshot(accounts, journals)   ← balances DERIVED, never stored
        │  (Next.js server-side rewrite: browser only calls relative /api/proxy/*)
        ▼
apps/web Redux Toolkit store (ledgerSlice) → dashboard hero cards, account list, journal table
```

## API surface (api-core v1, prefix /api/v1)

| Route | Purpose |
|---|---|
| `GET  /ledger/snapshot?recentLimit=` | accounts + totals (assets/debts/net worth/liquidity) + recent journal rows |
| `GET  /ledger/accounts` | chart of accounts (seeded CoA incl. 3000 equity, 4000/4100 income, 5000 expense) |
| `POST /ledger/accounts` | register account; optional `initialBalance` is posted as a balanced opening journal |
| `POST /ledger/transaction` | UX-level tx `{amount>0, type: INCOME|EXPENSE|TRANSFER|TRADING_PROFIT, account, targetAccount?, category?, date?, source?}` ⇒ legs auto-built |
| `POST /ledger/journal` | raw double-entry legs (bots/power users); rejected 400 if unbalanced |
| `GET  /ledger/journals?limit=` | raw immutable journals |
| `POST /trading/sync` | state + `closed_deals[]`; realized net P&L ⇒ TRADING_PROFIT journals, dedupe by `account:ticket` di tabel `processed_deals` (persisten, satu transaksi dengan jurnal). Header `X-Saku-Client: saku-bridge` = EA lama ⇒ `source: EA_LEGACY` + `notice` |
| `POST /trading/sync/now` | jalankan satu pass connector (snapshot→cache, deals→pipeline di atas). No-op saat `MT5_CLOUD_ENABLED=false` |
| `GET  /trading/account-state` | snapshot equity/balance display-only + umur data (TIDAK pernah menulis jurnal) |
| `GET  /trading/state` | last ingest state + jumlah `processed_deals` |
| `GET/POST/PATCH/DELETE /integrations` | daftar koneksi MT5; kredensial = investor password (read-only) terenkripsi AES-256-GCM, tidak pernah keluar di respons |
| `POST /integrations/:id/test` | probe read-only; server tak didukung ⇒ pesan actionable (sarankan import statement), bukan stack trace |

TRADING_PROFIT accepts a **signed** amount (negative ⇒ loss leg to 5000). All non-IDR legs convert via
`exchangeRate` (default table in `DEFAULT_EXCHANGE_RATES`, e.g. USD 15500) — totals are base-IDR.

## Engine additions (@saku/ledger-core)

- `journal-mapping.ts` — `buildJournalLegs`, `buildDraftJournalFromTransaction`, `resolveAccount`, `rateFor`.
- `balances.ts` — `computeAccountBalances`, `journalToDisplayRow`, `buildLedgerSnapshot`.
- Now a real buildable package: `main/types → dist` (CJS+d.ts). `apps/web` imports **source** via tsconfig paths
  (hot reload), `api-core`/CI consume `dist` (turbo `^build` handles ordering; `dev` script builds engine first).
- Tests: 15/15 vitest (validator, mappers incl. FX & loss branch, derivation, display rows).

## Local runbook

```bash
pnpm install
pnpm --filter @saku/ledger-core build          # once; api-core dev script does this automatically
pnpm --filter @saku/api-core dev               # :4000  (in-memory ledger + seeded demo journals)
cd apps/web && pnpm exec next dev -H 0.0.0.0 -p 3000   # :3000, proxies /api/proxy/* → :4000
```

### With persistence (PostgreSQL 16 / TimescaleDB)

```bash
docker compose up -d                            # saku-postgres + saku-redis (outside this repo: needs docker host)
DATABASE_URL=... pnpm --filter @saku/database db:push
pnpm --filter @saku/database db:seed            # CoA + opening/demo JOURNALS (append-only, idempotent)
DATABASE_URL=... pnpm --filter @saku/api-core dev   # logs "Prisma" path; on adapter load failure warns & falls back
```

### Jalur MT5 default (tanpa EA, tanpa terminal nyala)

1. API: set `ENCRYPTION_MASTER_KEY` (wajib untuk kredensial) dan `MT5_CLOUD_ENABLED=true`
   + `MT5_PROVIDER=metaapi` + `METAAPI_TOKEN` (+ `METAAPI_REGION`, default `new-york`).
   `MT5_PROVIDER=mock` = fixtures deterministik untuk demo/CI tanpa vendor.
2. UI: **Settings → Integrations → + Add MT5** → login, server, port (opsional),
   **investor password (read-only)**. Tidak ada yang diinstal di sisi user.
3. Scheduler: snapshot tiap `MT5_SNAPSHOT_INTERVAL_SEC` (120 dtk) → `account_state_cache`
   (display), closed deals tiap `MT5_DEALS_INTERVAL_MIN` (10 mnt) → pipeline `/trading/sync`.
4. Re-runs aman: `processed_deals` UNIQUE(`account`,`ticket`) menahan duplikat **termasuk
   sesudah restart API** (`skipped`/`duplicates_ignored` di respons).
5. Rekonsiliasi ground-truth: **import statement/CSV MT5** (pipeline staging) — sumber dokumen
   resmi; selisih masuk sebagai jurnal reversal `RECONCILIATION`, bukan edit saldo.
6. Broker/prop-firm yang tidak didukung middleware ⇒ pakai langkah 5 (fallback resmi).
   **EA tidak pernah dipasang otomatis sebagai cadangan.**

### MT5 side — EA `SakuBridge.mq5` (legacy, lihat ADR-022)

Opsional, hanya untuk power user yang maunya zero-password (data keluar dari terminal, tidak ada
kredensial di SAKU). File: `services/deprecated/mt5-ea/`.

1. Attach `SakuBridge.mq5` to a **demo** chart; compile in MetaEditor (CI/sandbox cannot compile MQL5).
2. Tools → Options → Expert Advisors → allow WebRequest for `http://localhost:4000`.
3. EA posts every `InpSyncInterval`s: state + closed deals (`DEAL_ENTRY_OUT`, net profit incl. swap/commission).
4. Re-runs are safe: server ignores already-posted tickets (`duplicates_ignored`); jurnalnya tercatat
   `source: EA_LEGACY` dan respons membawa `notice: legacy-ea-deprecated; migrate to integrations`.

## Immutability rules (enforced by code, not vibes)

1. No PUT/PATCH/DELETE routes for journals — corrections = new RECONCILIATION reversing journal.
2. Balance columns are never persisted; all totals derive from journals at read time.
3. Every write path ends in `validateJournalEntries` (service) *and* in `PrismaLedgerRepository` (defense-in-depth).

## Known limits / next steps

- In-memory repo is volatile by design (restart = reseed). Prisma path is typechecked/built only where
  `prisma generate` can run (CI has network; sandbox blocks `binaries.prisma.sh` — verified fallback works).
- Timescale hypertable migration for `ledger_entries` still TODO (indexes only for now).
- Command palette actions & Sonzi/Graphify cards remain locally computed — candidate for the same snapshot.
- ~~`processed_tickets` dedupe is per-process in-memory~~ → M1: dedupe kini tabel
  `processed_deals` (UNIQUE(account,ticket)) yang ditulis satu transaksi dengan jurnalnya;
  Set in-memory hanya tersisa sebagai fallback adapter tanpa persistensi.
- Web keeps its sample fallback snapshot so the UI never renders empty when the API is offline.
