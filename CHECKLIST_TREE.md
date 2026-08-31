# 🌳 SAKU — POHON PELACAKAN STATUS & EKSEKUSI (CHECKLIST TREE)

> **Tujuan dokumen**: Tree pelacakan langsung untuk seluruh fase SAKU, riwayat PR, struktur repo, dan sisa backlog.
> **Sumber kebenaran**: `main` GitHub = `efea8b0` (merge PR #31) — diverifikasi 2026-08-31.
> **Status keseluruhan**: Semua fase inti & epic **SELESAI**. Yang tersisa = backlog produk (lihat §5) + 1 PR handoff belum merge (#32).

---

## 1) MATRIKS STATUS FASE — DARI AWAL SAMPAI SEKARANG

```
[FASE 0: 10 PHASE BUILD v1.0] ───────────► [x] 100% (monorepo, ledger, web, API, MT5, bot,
                                                 staging, SONZI, security, launch + scaling)
[FASE 1: v1.1 LIVE DOUBLE-ENTRY WIRING] ──► [x] PR #1 MERGED (jurnal P&L MT5, Prisma, CI repair)
[EPIC ADR-022: MT5 SYNC TANPA-EA] ────────► [x] PR #2–#7 MERGED (M1–M6, lihat §3)
[BACKLOG: CONNECTORS + AUTH SESSION] ─────► [x] PR #9–#18 MERGED (connectors API, ADR-023 fase 1,
                                                 ADR-024 fase 2, login web, panduan P3/enforce/Node24)
[AUDIT PONYTAIL (12 TEMUAN)] ─────────────► [x] PR #21–#31 MERGED (11 dari 11 PR kode; #5b = backlog)
[HANDOFF §13] ────────────────────────────► [⏳] PR #32 OPEN (docs-only; CI job smoke = flake exit 7,
                                                 butuh re-run user / push baru — lihat §5.0)
```

**Tes unit**: 80 → 99 → 105 → **116 lulus** (15 berkas, terakhir di PR #31).
**Gate CI di `main`** = versi USER (`ci.yml` commit `4c53783`/`9d1e376`/`6d01363`) — **JANGAN di-push ulang oleh agent**.

---

## 2) POHON STRUKTUR REPO (TERVERIFIKASI)

```
saku/  (monorepo Turborepo + pnpm workspace + Docker Compose)
│
├── apps/
│   ├── web/                          # Next.js 14 App Router, Tailwind, tema Obsidian #090D16
│   │   └── src/app/
│   │       ├── page.tsx              # Dashboard: hero cards net worth, ledger, currency switcher
│   │       ├── login/page.tsx        # Login OTP 2 langkah + cookie HttpOnly (ADR-024)
│   │       ├── landing/page.tsx      # Halaman landing
│   │       ├── api/proxy/[...path]   # Proxy catch-all → terjemahkan cookie → header X-Saku-Session
│   │       ├── api/session/          # POST set cookie / DELETE logout / GET status sesi
│   │       ├── api/api-base.ts       # Konstanta API_BASE (hasil audit #10)
│   │       ├── api/session-cookie.ts # Konstanta nama cookie (audit #10)
│   │       ├── components/
│   │       │   ├── TransactionModal.tsx        # Entri transaksi 1-tap + validasi ledger
│   │       │   ├── StatementImportModal.tsx    # Upload CSV/PDF + rule matcher + staging review
│   │       │   ├── IntegrationsSettingsModal.tsx # Settings konektor (investor password read-only)
│   │       │   ├── SonziHealthCard.tsx         # Kartu kesehatan finansial SONZI
│   │       │   ├── SourceBadge.tsx             # Badge sumber jurnal (EA_LEGACY / MT5_CLOUD / ...)
│   │       │   ├── SyncPill.tsx                # Indikator status sinkronisasi
│   │       │   ├── SubscriptionModal.tsx       # Pilihan paket langganan (payment gateway)
│   │       │   ├── ObsidianJournalModal.tsx / CommandPalette.tsx / GraphifyWealthChart.tsx
│   │       │   └── format.ts                   # Helper formatMoney/formatRupiah (hasil audit #8)
│   │       └── store/  # ledgerSlice.ts, integrationApi.ts (RTK Query), hooks.ts
│   ├── desktop/                       # Tauri 2.0 (Rust wrapper) — biner v1.0.0
│   └── mobile/                        # React Native Expo (Android/iOS) — biner v1.0.0
│
├── packages/
│   ├── ledger-core/                   # @saku/ledger-core: mesin double-entry multi-mata-uang
│   │                                  #   index.ts, balances.ts, journal-mapping.ts + vitest
│   └── database/                      # @saku/database: Prisma schema + migrasi + adapter
│       ├── schema.prisma
│       └── prisma/migrations/
│       │   ├── 20260831000000_processed_deals/      # Dedupe transaksi lintas restart (M1)
│       │   ├── 20260831000001_integration_accounts/ # Akun konektor (M2)
│       │   ├── 20260831000002_account_state_cache/  # Snapshot display-only (M3)
│       │   ├── 20260901000000_auth_sessions/        # Sesi hash SHA-256 (ADR-024)
│       │   └── rls_policies.sql                     # Row-Level Security multi-tenant
│       └── src/  # prisma-ledger.repository.ts, prisma-integrations.repository.ts,
│                  # prisma-session.store.ts (+ penanda drift #5a)
│
├── services/
│   ├── api-core/                      # NestJS REST — inti backend
│   │   └── src/modules/
│   │       ├── auth/        # OTP, SessionService (token 32-byte, hash saja), OwnerGuard
│   │       │                #   global, SessionStore port, SAKU_AUTH_ENFORCE
│   │       ├── integrations/ # Kredensial AES-256-GCM (iv:tag:cipher), provider MetaApi/Mock/Null,
│   │       │                #   friendlyProviderError (audit #1+#7), 400 ramah konflik (audit #2)
│   │       ├── connectors/  # Registry Connector generik (audit #4): MT5_CLOUD, MT5_STATEMENT
│   │       ├── trading/     # POST /trading/sync (dialek bridge v1.1), /trading/account-state,
│   │       │                #   /trading/state (demo:true — audit #12), scheduler snapshot 120s
│   │       │                #   + deals 10m, sync-scheduler.service.ts (tipe aman — audit #6)
│   │       ├── ledger/      # GET /ledger/snapshot, POST /ledger/transaction, /ledger/journal
│   │       │                #   (400 saat unbalanced)
│   │       ├── sonzi/       # Health engine: DSR<35%, dana darurat, solvency, risk profile
│   │       ├── staging/     # Staging sandbox sebelum posting ke jurnal
│   │       ├── bot/         # Webhook Telegram + parser gramatikal ("Kopi 25k BCA")
│   │       ├── payment/     # Gateway Midtrans/Xendit + webhook /api/v1/payment/webhook
│   │       ├── b2b/         # Open finance: API key + scope OAuth2
│   │       ├── security/    # RedactionInterceptor, crypto.service, rate-limiter Redis
│   │       │                #   (0s→30s→2m→15m→24h lockout)
│   │       └── accounts/ + obsidian/
│   └── deprecated/mt5-ea/    # EA MQL5 lama (SakuBridge.mq5) — deprecated sejak ADR-022,
│                             #   default = konektor cloud read-only
│
├── docs/                          # ADR-022 (22_MT5_INVESTOR_SYNC_ADR), ADR-023 (23_AUTH_SESSION_ADR),
│   │                              # ADR-024 (25_AUTH_SESSION_PHASE2_ADR), panduan P3 (24_),
│   │                              # panduan enforce (26_), skills bank (13_), handoff v1.2,
│   │                              # ci/23_* + ci/27_* (usulan workflow Node24 — menunggu paste user)
│   └── ci/  # 23_CI_PROPOSED.yml, 27_CI_NODE24_PROPOSED.yml, 27_RELEASE_NODE24_PROPOSED.yml
│
├── .github/workflows/
│   ├── ci.yml              # Gate lengkap M1/M2/M3 + typecheck + unit test (VERSI USER — jangan sentuh)
│   └── release-builds.yml  # Build desktop/mobile (masih Node 20 — item C belum dikerjakan)
│
└── docker-compose.yml      # PostgreSQL 16 + TimescaleDB + Redis 7
```

---

## 3) POHON RIWAYAT PR (SEMUA MERGED KECUALI #32)

```
v1.0 build  ─────────────────────────────── 10 fase + post-launch scaling (100%)
v1.1        ──► #1   wiring double-entry langsung + Prisma + CI repairs
EPIC ADR-022 ─► #2   M1 processed_deals persist + M2 modul integrations (AES-256-GCM, redaksi)
              ├─► #3   M3 provider MetaApi/Mock/Null + scheduler (snapshot 120s, deals 10m)
              ├─► #4   M4 EA → services/deprecated/mt5-ea
              ├─► #5   M5 UI web: IntegrationsSettingsModal, SourceBadge, SyncPill
              ├─► #6   M6 kontrak Connector generik (ADR-022 IMPLEMENTED)
              └─► #7   docs-sync CI loop semua folder migrasi + handoff v1.2
BACKLOG      ──► #8   sinkron docs (jq .integration.id) + addendum §8
              ├─► #9   GET /api/v1/connectors (read-only)
              ├─► #10/#11  ADR-023 + auth fase 1 (sakuSession, OwnerGuard)
              ├─► #12  handoff §9
              ├─► #13  panduan live test MetaApi (browser-only)
              ├─► #14  ADR-024 fase 2 (PROPOSED)
              ├─► #15  persistensi sesi (auth_sessions) + POST /auth/logout
              ├─► #16  halaman /login + cookie HttpOnly via proxy
              ├─► #17  panduan SAKU_AUTH_ENFORCE
              ├─► #18  usulan workflow Node 24 (docs/ci/27_*)
              ├─► #19  handoff §10   ├─► #20 handoff §11 + disiplin Ponytail
AUDIT        ──► #21  handoff §12 (rekonstruksi + laporan 12 temuan)
  #3  ────────► #22  LOCAL_OWNER (1 baris)
  #12 ────────► #23  demo:true di GET /trading/state
  #5a ────────► #24  penanda drift 10 tipe kontrak
  #1+#2 ──────► #25  satu aturan pesan gagal + konflik → 400
  #10+#9 ─────► #26  API_BASE + USD_IDR_RATE
  #8  ────────► #27  helper formatMoney di 7 titik
  #4  ────────► #28  describe() masuk kontrak Connector
  #6+#11 ─────► #29  hapus any (scheduler + kontrak web)
  #12 ────────► #30  luruskan arti demo (docs)  [CI job smoke = FLAKE, dibuktikan #31]
  #7  ────────► #31  pesan 5xx vendor ≠ "server tidak didukung" + tes baru  →  main = efea8b0
HANDOFF      ──► #32  handoff §13  [⏳ OPEN — docs-only, CI job smoke flake exit 7]
```

---

## 4) KONTRAK KAWAT YANG DIJAGA (JANGAN DIUBAH)

`{integration:{id},notice}` · `sakuSession` · `GET /connectors` identik · `/ledger/journal` 400 saat
unbalanced · dialek `/trading/sync` bridge v1.1 + header `X-Saku-Client: saku-bridge` ⇒ `EA_LEGACY` ·
`master_password` → 400 "investor password (read-only)" · tidak ada endpoint "set balance" · tidak ada
GET yang mengembalikan `credentialCipher`/password · fallback in-memory saat `DATABASE_URL` mati.

---

## 5) SISA PEKERJAAN / BACKLOG (per 2026-08-31)

| Pri | Item | Status / Aksi |
|---|---|---|
| 🔴 | **PR #32 (handoff §13) belum merge** | Docs-only. CI job smoke gagal = **flake exit 7** (pola §13.3, bukan regresi — PR #31 yang berisi kode 2/2 hijau). Agent tidak bisa rerun (`run cannot be rerun`) & tidak boleh push ke branch sesi lain. **Aksi user (browser-only)**: buka Actions → run PR #32 → **Re-run failed jobs**, atau tunggu run PR berikutnya terbukti hijau |
| 🔴 | **Item C — migrasi workflow ke Node 24** | `.github/workflows/ci.yml` & `release-builds.yml` masih `checkout@v4` + `node-version: 20`. Node 20 **DIHAPUS** dari runner GitHub musim gugur 2026 → action lama akan GAGAL. **Aksi user**: paste `docs/ci/27_CI_NODE24_PROPOSED.yml` & `27_RELEASE_NODE24_PROPOSED.yml` via editor web (panduan `docs/ci/27_NODE24_APPLY_GUIDE.md`). Agent DIBLOKIR push workflow |
| 🟡 | **P3 — live test MetaApi** | User-driven: set `METAAPI_TOKEN` di env deployment sendiri + investor password via Settings → Integrations. Panduan `docs/24_P3_METAAPI_LIVE_TEST_GUIDE.md` |
| 🟡 | **Keputusan `SAKU_AUTH_ENFORCE=true`** | Prasyarat lengkap (login + sesi persisten). Panduan + rollback 1 menit: `docs/26_AUTH_ENFORCE_OPERATIONS_GUIDE.md`. OTP masih mock (kode di log server) |
| 🟢 | **ADR multi-pemilik (owner ≠ `user-local`)** | BUTUH ADR baru dulu → baru kerjakan **#5b** (pindahkan 10 tipe kontrak ke `@saku/database`, −55 baris). Penanda drift sudah terpasang (PR #24) |
| 🟢 | **Kanal OTP nyata (email/WA)** | Boleh diganti, TIDAK boleh menyentuh desain sesi |
| 🟢 | **Sisa `as any` di web (3 titik)** | `IntegrationsSettingsModal.tsx:178`, `store/ledgerSlice.ts:114,116`, `store/integrationApi.ts:143` — kandidat audit baru, butuh keputusan user dulu |
| 🟢 | **#9 jalur ideal: kurs dari API** | Hari ini masih konstanta `USD_IDR_RATE` di klien; idealnya dikirim API. Butuh keputusan user |
| 🟢 | **Rilis v1.3.0 (opsional)** | v1.2.0 terbit TANPA aset biner (unduhan masih v1.0.0). Jangan klaim biner baru |

---

## 6) SKILL YANG DIGUNAKAN — JAWABAN JUJUR

**Skill yang BENAR-BENAR aktif & dipakai lintas sesi:**
1. **🪶 Disiplin Ponytail (anti-bloat)** — sumber kebenaran di `CLAUDE.md`; dipasang sebagai *blok teks*,
   sengaja BUKAN plugin/MCP (memasang ekosistem demi anti-bloat = ironi). Terbukti dipakai di audit
   #1–#12 (hapus 20+ baris duplikat, pakai ulang helper, tangga: perlu? sudah ada? stdlib? dep terpasang?).
2. **PR per fitur + CI hijau dulu baru merge** — 30 dari 31 PR merged dengan pola ini (satu insiden
   flake #30 didokumentasikan jujur di §13.3; PR #32 menunggu).
3. **Browser-only untuk user** — semua aksi yang butuh GitHub UI/panel hosting = panduan langkah
   eksplisit ✅/❌, tidak pernah suruh user mengetik terminal/Docker/MT5.
4. **Redaksi kredensial total** — tidak pernah minta/terima token/password lewat chat; field `*token*`
   dipotong jaring redaksi; kredensial tersimpan ciphertext AES-256-GCM.
5. **Verifikasi state GitHub tanpa auth** — `api.github.com` / `raw.githubusercontent.com` / `gh` + retry
   saat egress flaky; sebelum kerja: `git status` + `git log origin/main..HEAD`.
6. **Handoff lintas-sesi** — dokumen `HANDOFF_SESI_BERIKUTNYA_v1.2.md` §1–§13 (addendum hanya menambah).

**Skill di `docs/13_LAYER_INFRASTRUCTURE_AND_SKILLS_BANK.md` (14 tool: Datadog, Sentry, Cloudflare,
Context7, Composio, Strix, Autohedge, Vibe-Trading, Fincept, LibreChat, Autoscraper, Monorepo, Aitmpl,
MSFX Terminal)** — **BELUM dipasang / bukan bagian implementasi**: dokumen itu bank referensi arsitektur
& desain, bukan dependency yang terpasang. Jujur: skill ini *belum* "digunakan" dalam arti eksekusi;
yang dieksekusi adalah disiplin di atas.

---

## 7) DEFINISI SELESAI SESI INI

- [x] `main` = `efea8b0` (merge PR #31); branch sesi `arena/01a057cf-saku` bersih dari komit unik.
- [x] Status & tree di atas diverifikasi langsung dari repo (bukan dari ingatan).
- [x] Backlog dirinci dengan pemilik aksi (user vs agent) dan dokumen rujukan.
- [ ] PR #32 merge (tunggu CI hijau — aksi user re-run) · Item C Node 24 (aksi user paste workflow).
