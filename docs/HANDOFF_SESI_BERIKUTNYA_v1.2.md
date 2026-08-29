# HANDOFF SESI BERIKUTNYA — v1.2

> Dokumen operasional lintas-sesi untuk epic **"MT5 sync tanpa-EA" (ADR-022)**.
> Sumber kebenaran = GitHub `main` (cek via `raw.githubusercontent.com` / `api.github.com`, tanpa auth).
> Kalau sandbox terlihat ter-reset / kosong: JANGAN panik, JANGAN kloning ke folder baru —
> cukup `git fetch origin main && git reset --hard origin/main` di checkout yang ada.

## 1) Aturan kerja (wajib, tidak bisa ditawar)

1. Bahasa Indonesia.
2. Laptop user HANYA untuk chat → semua instruksi ke user = **browser-only** (UI GitHub /
   Settings / Actions), langkah eksplisit ✅/❌; JANGAN pernah suruh user mengetik
   terminal/Docker/MT5.
3. JANGAN pernah minta/terima key/token/password lewat chat. Kalau user tidak sengaja paste
   kredensial: jangan dipakai/divalidasi, jangan dikutip, arahkan user **revoke + ganti**.
4. Push per fitur via **PR ke `main`**; jangan push langsung ke `main`.
5. Loop: commit → PR → **CI hijau → merge** → BARU commit milestone berikutnya
   (kalau tidak, PR berikutnya kesedot commit lama yang belum merge).
6. Cek state GitHub via `raw.githubusercontent.com` / `api.github.com` (tanpa auth).
7. Jangan hapus catatan historis dokumen; tandai "(legacy, lihat ADR-022)".
8. Jangan sentuh workflow selain yang perlu; warning **Node20** di Actions = diterima (backlog).

## 2) Status epic (per akhir sesi 2026-08-29)

| Milestone | Isi | PR | Status |
|---|---|---|---|
| M1 | `processed_deals` persisten (dedupe 1 transaksi lintas restart), jurnal, CI idempoten | #2 | ✅ MERGED |
| M2 | modul `integrations`, AES-256-GCM `iv:tag:cipher`, redaksi global, investor-password-only (`master_password` → 400) | #2 | ✅ MERGED |
| M3 | providers MetaApi/Mock/Null + scheduler: snapshot → `account_state_cache` (display-only), deals → pipeline `/trading/sync`; `GET /trading/account-state`; `POST /trading/sync/now`; header `X-Saku-Client: saku-bridge` ⇒ source `EA_LEGACY` + notice `legacy-ea-deprecated; migrate to integrations`; tabel env di `services/api-core/README.md` | #3 | ✅ MERGED |
| M4 | `git mv` EA → `services/deprecated/mt5-ea/` + README deprekasi; dokumen diselaraskan | #4 | ✅ MERGED |
| M5 | `apps/web`: `store/integrationApi.ts` (RTK Query via `/api/proxy`), `IntegrationsSettingsModal`, `SourceBadge` di tabel jurnal, `SonziHealthCard` baca account-state, `SyncPill` | #5 | ✅ MERGED |
| M6 | kontrak **Connector generik** di `services/api-core/src/modules/connectors/` + README "🔌 Sumber Aset (Connectors)" + ADR-022 status **IMPLEMENTED** | #6 | ✅ MERGED (merge commit `4c02d53`, M6 commit `170fb9a`) |
| docs-sync | `docs/ci/23_CI_PROPOSED.yml` loop SEMUA folder migrasi (bukan hardcode 2) + handoff v1.2 ini ditulis ulang | [#7](https://github.com/itzranke/SAKU/pull/7) | ✅ MERGED |

ADR-022: `docs/22_MT5_INVESTOR_SYNC_ADR.md`, status **IMPLEMENTED**.

## 3) Sisa pekerjaan (urutan)

- **A. ✅ SELESAI** — PR #6 dikonfirmasi MERGED (`api.github.com/repos/itzranke/SAKU/pulls/6`
  → `merged: true`, 2026-08-29T20:40:32Z).
- **B. ✅ SELESAI (PR #7)** —
  (1) step CI `"M1/M2/M3 — apply migration SQL & verify schema on postgres:16"` kini
  me-loop `prisma/migrations/2*/` (filter ada `verify.sql`), sehingga
  `20260831000002_account_state_cache` ikut ter-apply + ter-verify di postgres:16;
  (2) handoff v1.2 ini ditulis ulang karena file lamanya hilang saat sandbox ter-reset.
- **C. ⏳ MENUNGGU AKSI USER (browser-only)** — gate CI M2/M3 masih dokumen usulan.
  Agent DIBLOKIR push `.github/workflows/**` (GitHub App tanpa scope `workflows`;
  JANGAN coba lagi). Tuntun user paste `docs/ci/23_CI_PROPOSED.yml` ke
  `.github/workflows/ci.yml` lewat editor web GitHub — panduan siap pakai:
  `docs/ci/23_CI_APPLY_GUIDE.md` → commit langsung ke main → tunggu Actions hijau.
  Ingat: run `pull_request` memakai workflow versi **base/main**, jadi gate baru baru
  aktif di PR berikutnya setelah langkah ini.
- **D. ⏳ MENUNGGU AKSI USER (browser-only)** — potong tag **v1.2.0** via
  `https://github.com/itzranke/SAKU/releases/new` (target: `main`). Notes wajib memuat:
  judul ringkas "MT5 sync tanpa-EA (investor password) + processed_deals persist + EA
  deprecated", ringkasan M1–M6, rujukan ADR-022 IMPLEMENTED (PR #2–#6).
  JANGAN klaim biner baru (aset unduhan masih `v1.0.0`).
- **E. (Opsional) Live test MetaApi** — user daftar sendiri + isi kredensial sendiri:
  token vendor di deployment via env `METAAPI_TOKEN`; investor password via form
  Settings → Integrations di web (tidak pernah lewat chat).
  Test-connection WAJIB gagal secara ramah: pesan "server tidak didukung, gunakan import
  statement" TANPA stack trace (`error-mapping.ts`). EA BUKAN auto-fallback
  (fallback resmi = import statement / CSV MT5).
- **F. Guardrails runtime (jangan dilanggar)** — hanya perubahan **aditif**:
  - TIDAK ada endpoint "set balance".
  - TIDAK ada GET yang mengembalikan `credentialCipher`/password.
  - In-memory fallback saat `DATABASE_URL` mati HARUS tetap ada (dipakai unit test).
  - Kontrak lama utuh: `GET /ledger/snapshot`, `POST /ledger/transaction`,
    `POST /ledger/journal` 400 saat unbalanced, `POST /trading/sync` dialek bridge v1.1
    (header `X-Saku-Client: saku-bridge`).
  - Backlog terpisah (bukan scope epic): auth session (owner masih `user-local`),
    `GET /api/v1/connectors`.

## 4) Jebakan terbukti (jangan diulang)

- `packages/ledger-core/dist` **di-track** → rebuild + commit tiap edit
  `packages/ledger-core/index.ts` (SourceType `EA_LEGACY`).
- `prisma generate` gagal di sandbox (no egress) & tidak ada docker → assertion Postgres
  naik di CI saja.
- Tipe delegate Prisma = `any` (typo model cuma ketahuan di CI).
- JANGAN `prisma migrate deploy/dev` di CI/lokal — pakai `prisma db execute`.
- `ALTER TYPE ADD VALUE` dibungkus `DO $$ … EXCEPTION WHEN others THEN NULL $$`.
- Redaksi field berbasis substring pernah merusak kontrak (`credentialMode`/`hasCredential`/
  `key`) → tes dua arah `isSensitiveFieldName` tiap field baru (positif & negatif).
- Multi-line ternary via skrip pernah hilang `:` dan `@Controller('trading')` pernah lenyap
  → **selalu smoke HTTP** setelah refactor route.
- Di `set -euo pipefail`: pakai `if grep -q …; then`, BUKAN `grep -q … && fail`.
- Root-level TS di api-core merusak `nest build` (jaga `tsconfig` exclude).
- `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` untuk pnpm; turbo format v2; jangan `next build`
  saat dev server memegang `.next`.
- Tes tamper crypto = **flip byte** (bukan menambah "AA").
- Filter tes journal pakai `'#<ticket>'`.

## 5) Verifikasi standar (jalankan sebelum buka PR)

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@9.1.0 install --frozen-lockfile
pnpm --filter @saku/api-core exec tsc --noEmit
pnpm --filter @saku/api-core test        # terakhir 80/80 vitest, 11 file
pnpm --filter @saku/api-core build
# web: tsc apps/web + next lint
```

Smoke runtime:

- `MT5_CLOUD_ENABLED=false` ⇒ `GET /trading/account-state` provider `"null"`;
  `POST /trading/sync/now` → `journalized:0`.
- `MT5_PROVIDER=mock` ⇒ `POST /trading/sync/now` → `journalized:3`; ulangi ⇒ `0`;
  `account-state.state.equity` terisi; `grep -i password` di log API = **0 hit**.

## 6) Fakta MetaApi (diverifikasi di `metaapi.provider.ts`)

- Client API base: `https://mt-client-api-v1.{region}.agiliumtrade.ai`
  (region via env; bisa dioverride `METAAPI_CLIENT_URL`).
- Provisioning: `https://mt-provisioning-api-v1.agiliumtrade.ai`
  — `POST /users/current/accounts?region=…` (registrasi akun read-only),
  `POST /users/current/accounts/:id/start` (start reader).
- Header auth: `auth-token: <METAAPI_TOKEN>`.
- `GET /users/current/accounts/:id/account-information?refreshTerminalState=true`
  — payload **tanpa server timestamp** → provider men-stempel waktu fetch sendiri.
- `GET /users/current/accounts/:id/history-deals/time/:startTime/:endTime`
  — start inclusive, end exclusive.
- Token TIDAK pernah via chat/DB-plaintext: hanya env `METAAPI_TOKEN` di deployment;
  investor password hanya lewat form Settings → Integrations (disimpan sebagai
  ciphertext AES-256-GCM `iv:tag:cipher`).

## 7) Cara cek state GitHub tanpa auth

```bash
curl -s https://api.github.com/repos/itzranke/SAKU/pulls/6 | head -40          # status PR
curl -s https://api.github.com/repos/itzranke/SAKU/branches/main              # SHA main
curl -s https://raw.githubusercontent.com/itzranke/SAKU/main/docs/ci/23_CI_PROPOSED.yml
```
