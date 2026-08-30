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

## 8) Addendum sesi 2026-08-30 — gate CI live, 2 bug gate diperbaiki, v1.2.0 terbit

> Addendum ini hanya MENAMBAH; §1–§7 dipertahankan apa adanya (catatan historis).
> Item C dan D pada §3 kini TUNTAS — rinciannya di bawah. Semua SHA di bawah
> diverifikasi via `api.github.com/repos/itzranke/SAKU/commits?per_page=8` & `/releases`.

### 8.1) Gate CI terpasang di main (penutup item C §3)

- User memasang gate CI manual **via editor web GitHub** ke `.github/workflows/ci.yml`
  (commit user `4c53783` "Enhance CI workflow with typecheck and unit tests") — sesuai
  pola `docs/ci/23_CI_APPLY_GUIDE.md`. `ci.yml` di main kini = versi gate lengkap:
  loop migrasi SEMUA folder + step M1/M2/M3 (typecheck + unit test).
- CI main HIJAU dengan gate ini: M1 idempotensi + M2 redaksi + M3 provider mock lulus.
- Konsekuensi: `docs/ci/23_CI_PROPOSED.yml` kini murni mirror dokumen usulan. Bila
  `ci.yml` berubah lagi, sinkronkan dokumennya — arah perubahan `ci.yml → PROPOSED`,
  bukan sebaliknya. (Sesi 2026-08-30: sinkronisasi baris `jq -r '.integration.id'`
  dikerjakan ulang via PR docs karena mirror-nya tertinggal.)

### 8.2) Dua bug tertangkap gate CI — root cause & fix (fix oleh USER via editor web; JANGAN diulang/di-push ulang)

1. **verify.sql M3 — error `text = integer` di postgres:16.**
   - Gejala: step verify migrasi M3 gagal; postgres:16 menolak `v_src = 0` karena
     `v_src` bertipe `TEXT` dibandingkan dengan integer `0`.
   - Root cause: pola lama menampung hasil `count()` ke variabel `TEXT` lalu
     membandingkannya dengan angka.
   - Fix (commit user `9d1e376` "fix(ci): M3 verify — ganti count()=0 (text=integer)
     dengan IF NOT EXISTS"): perbandingan diganti blok `IF NOT EXISTS (...)`.
   - Pelajaran (masuk §4/jebakan): **verify.sql jangan tampung `count()` ke TEXT lalu
     bandingkan angka — pakai `IF NOT EXISTS`.**

2. **step M2 — exit 22 senyap (`curl -sf` di dalam substitusi perintah).**
   - Gejala: step M2 mati `exit 22` TANPA pesan apa pun di log Actions.
   - Root cause berantai: skrip mengambil ID dari respons `POST /integrations` dengan
     `jq -r .id`, padahal bentuk responsnya `{integration:{id},notice}` (ID **nested**
     di dalam objek `integration`) → `ID=null` → panggilan lanjutan ke
     `/integrations/null/test` → HTTP 404 → `curl -sf` keluar exit 22, dan karena
     keluaran curl sedang **disubstitusi ke variabel**, pesan error curl tidak pernah
     tercetak (substitusi perintah tidak menampilkan apa pun ke log).
   - Fix (commit user `6d01363` "fix(ci): M2 step — jq ambil .integration.id
     (respons berbentuk {integration,notice})"): `ID=$(echo "$RESP" | jq -r '.integration.id')`.
   - Pelajaran (masuk §4/jebakan): **respons POST /integrations = `{integration:{id},notice}`
     — ID nested.** Cara membaca exit-22 senyap: lihat §8.4.

### 8.3) Rilis v1.2.0 terbit (penutup item D §3)

- Release **v1.2.0** sudah terbit di GitHub Releases (`published_at`
  2026-08-29T22:01:54Z), judul "v1.2.0 — MT5 sync tanpa-EA (investor password) +
  processed_deals persist + EA deprecated".
- **Tanpa aset biner** (assets: 0) — unduhan binary tetap merujuk `v1.0.0`.
  Jangan klaim biner baru di komunikasi apa pun.

### 8.4) Pelajaran debug: exit 22 dari `curl -sf` yang "diam"

- `set -euo pipefail` + substitusi perintah (`VAR=$(curl -sf ...)`) membunuh skrip di
  baris substitusi TANPA mencetak apa pun: keluaran curl ditangkap ke variabel, jadi
  pesan error-nya tak pernah tampil di log Actions.
- `curl -sf` exit 22 = **HTTP status ≥ 400** (respons error dari server, bukan gagal koneksi).
- Cara menemukan baris yang gagal: **baris gagal = substitusi `curl -sf` PERTAMA yang
  muncul SETELAH `echo` terakhir yang sempat tercetak di log.** Semua `echo` sebelum
  baris itu terlihat; semua yang setelahnya hilang.
- Mitigasi saat menulis step baru: jangan sembunyikan panggilan curl yang statusnya
  penting di dalam substitusi, atau selipkan `echo` penanda fase agar posisi kegagalan
  selalu bisa dihitung.

## 9) Addendum sesi 2026-08-30 (lanjutan) — P1 tuntas, backlog dimulai: connectors API + auth fase 1

> Addendum hanya MENAMBAH; §1–§8 dipertahankan apa adanya. Semua SHA/PR diverifikasi via
> `api.github.com` sebelum ditulis. main saat addendum ini merge = pasca PR #12.

### 9.1) Yang tuntas sesi ini (semua via PR, CI hijau dulu baru merge)

| Item | PR | Isi |
|---|---|---|
| P1 docs-sync | [#8](https://github.com/itzranke/SAKU/pull/8) | `23_CI_PROPOSED.yml` baris jq `.integration.id` (re-apply manual, bukan cherry-pick; SHA lama dfcc00f/ed533a4 memang tidak ada di remote) + addendum §8 |
| P2a connectors API | [#9](https://github.com/itzranke/SAKU/pull/9) | `GET /api/v1/connectors` read-only: `type/label/status/direction/syncIntervalSec/credentialRef/normalizer` (tanpa materi rahasia); `ConnectorDescriptor` +`normalizer`; tanpa endpoint tulis |
| P2b desain | [#10](https://github.com/itzranke/SAKU/pull/10) | **ADR-023** (`docs/23_AUTH_SESSION_ADR.md`) — desain dulu sebelum kode, sesuai aturan |
| P2b kode fase 1 | [#11](https://github.com/itzranke/SAKU/pull/11) | `SessionService` (token 32-byte, hanya hash SHA-256 disimpan, TTL 7 hari, in-memory), `verify-otp` menerbitkan `sakuSession`, `OwnerGuard` global (`X-Saku-Session` → owner; fallback `'user-local'`), `SAKU_AUTH_ENFORCE` default false (401 hanya di route `@OwnerScoped`), `body.ownerId`/`?ownerId=` klien DIABAIKAN |

- Unit test naik 80 → **99/99**; smoke HTTP penuh lulus termasuk instance `SAKU_AUTH_ENFORCE=true`
  (401/200) dan **0 token mentah di log**.
- Temuan penting (masuk ADR-023 §5): field kawat bernama `*token*` otomatis dipotong jaring
  redaksi — mock `accessToken` lama ternyata **tidak pernah** sampai ke klien sejak M2. Karena
  itu nama field sesi = `sakuSession` (bebas needle); jaring redaksi tidak dilemahkan.

### 9.2) Sisa backlog (urutan bebas, satu PR per fitur)

- **Node20 Actions warning** — diterima; JANGAN sentuh kecuali diminta (tetap).
- **Live test MetaApi (P3, user-driven)** — menunggu user: set `METAAPI_TOKEN` di deployment
  sendiri + investor password via Settings → Integrations (jangan pernah lewat chat). Kontrak
  failure ramah sudah dijaga kode (`:id/test` → `ok:false`, sarankan import statement).
- (Opsional fase berikutnya) cookie `HttpOnly` via proxy Next untuk `sakuSession`; tabel
  `auth_sessions` persisten (fase 2 ADR-023, via `prisma db execute` + `IF NOT EXISTS`); UI web
  kirim header `X-Saku-Session` saat sudah ada halaman login sungguhan; menyalakan
  `SAKU_AUTH_ENFORCE=true` di deployment produksi saat fase multi-pemilik dimulai.

## 10) Addendum sesi 2026-08-30 (bagian 3) — ADR-024 auth fase 2 TUNTAS + panduan P3 & Node24

> Addendum hanya MENAMBAH; §1–§9 dipertahankan apa adanya. Semua state diverifikasi via
> `api.github.com` sebelum ditulis. main di awal sesi = `de16450` (pasca PR #12).

### 10.1) Yang tuntas sesi ini (semua via PR, CI hijau dulu baru merge)

| Item | PR | Isi |
|---|---|---|
| P3 panduan live test | [#13](https://github.com/itzranke/SAKU/pull/13) | `docs/24_P3_METAAPI_LIVE_TEST_GUIDE.md` — browser-only: env di panel hosting, Settings → Integrations, tabel diagnosa pesan gagal, cara disconnect aman, batasan doktrin (read-only, RAW REST tanpa SDK, ⛔ CopyFactory/risk-management) |
| ADR fase 2 | [#14](https://github.com/itzranke/SAKU/pull/14) | **ADR-024** `docs/25_AUTH_SESSION_PHASE2_ADR.md` (PROPOSED) — memperluas ADR-023, tidak membatalkan; rencana 4 PR |
| Persistensi sesi + logout | [#15](https://github.com/itzranke/SAKU/pull/15) | `SessionStore` port + `PrismaSessionStore`; migrasi `auth_sessions` (`db execute` + `IF NOT EXISTS` + `verify.sql`); write-through + hidrasi boot; `revoke()`; `POST /auth/logout` idempoten |
| Web login + cookie | [#16](https://github.com/itzranke/SAKU/pull/16) | route handler `/api/proxy/[...path]` (cookie HttpOnly → header `X-Saku-Session`), `/api/session` (POST/DELETE/GET), halaman `/login`, `credentials:'include'` |
| Panduan enforce | [#17](https://github.com/itzranke/SAKU/pull/17) | `docs/26_AUTH_ENFORCE_OPERATIONS_GUIDE.md` — menyalakan `SAKU_AUTH_ENFORCE` dari browser + rollback 1 menit |
| Node 24-ready (item C) | [#18](https://github.com/itzranke/SAKU/pull/18) | `docs/ci/27_CI_NODE24_PROPOSED.yml`, `27_RELEASE_NODE24_PROPOSED.yml`, `27_NODE24_APPLY_GUIDE.md` — **menunggu paste USER** (workflow tetap diblokir untuk agent) |

- Unit test naik **99 → 105/105** (14 file); `tsc` api-core & web bersih; `nest build` + `next build` OK.
- Kontrak api-core **tidak berubah**: identitas tetap lewat header `X-Saku-Session`; cookie murni
  urusan lapisan web. Tanpa `DATABASE_URL`, perilaku fase 1 identik (store `null`, `hydrate()` no-op).

### 10.2) Jebakan BARU yang terbukti sesi ini (jangan diulang)

1. **`await hydrate()` sebelum `app.listen()` membunuh CI.** Job Postgres gagal dengan
   `exit code 7` (curl tidak bisa konek) karena bootstrap menunggu koneksi DB. Perbaikan:
   hidrasi dipanggil **setelah** `listen` dan **tanpa `await`** (`void … .catch(() => undefined)`).
   Aturan umum: jangan pernah menaruh I/O jaringan yang bisa menggantung di jalur bootstrap.
2. **`route.ts` Next.js hanya boleh mengekspor handler HTTP.** Mengekspor `SESSION_COOKIE` dari
   `app/api/proxy/[...path]/route.ts` membuat `next build` gagal dengan
   *"is not a valid Route export field"* (tsc & `next lint` TIDAK menangkapnya). Konstanta
   dipindah ke `app/api/session-cookie.ts`.
3. **Rewrite `next.config.js` tidak bisa menyuntik header.** Karena cookie HttpOnly harus
   diterjemahkan menjadi `X-Saku-Session`, rewrite statis diganti route handler catch-all.
   Konsekuensi yang harus dijaga: klien tetap hanya memakai path relatif `/api/proxy/*`.
4. **Log Actions tidak dapat diunduh dari sandbox** (`gh run view --log-failed` dan
   `.../logs` selalu gagal/redirect mati). Yang berhasil: `gh api …/jobs` untuk melihat step
   mana yang merah, lalu `fetch_page` ke halaman job untuk membaca **Annotations** (di situlah
   `exit code 7` terbaca). Simpan pola ini.

### 10.3) Sisa backlog setelah sesi ini

- **Item C (Node 24) menunggu satu aksi USER**: paste 2 file dari `docs/ci/27_*_PROPOSED.yml`
  ke `.github/workflows/` lewat editor web (panduan: `docs/ci/27_NODE24_APPLY_GUIDE.md`).
  Urgensinya naik: runner sudah memaksa Node 24 dan **Node 20 dihapus dari runner musim gugur
  2026** — setelah itu action lama GAGAL, bukan sekadar warning.
- **P3 live test MetaApi** tetap user-driven (butuh `METAAPI_TOKEN` di deployment user; **jangan
  pernah** lewat chat/repo). Panduan sudah siap di `docs/24`.
- **Menyalakan `SAKU_AUTH_ENFORCE=true`** = keputusan produk user, prasyaratnya sudah lengkap
  (halaman login + sesi persisten). Panduan + rollback di `docs/26`.
- **Fase multi-pemilik** (owner selain `user-local`, rumah tangga) belum ada dan **butuh ADR baru**.
  Hari ini setiap sesi sah tetap menghasilkan owner `user-local`.
- Kanal OTP masih jujur-mock (kode di log server) — mengganti kanal tidak boleh menyentuh desain sesi.

---

## 11) Addendum sesi 2026-08-30 (bagian 4) — PEMULIHAN komit lokal hilang + state main saat ini

> Addendum hanya MENAMBAH; §1–§10 dipertahankan apa adanya. main di awal sesi = `8d53dc9`
> (merge PR #19), diverifikasi via `api.github.com/repos/itzranke/SAKU/commits/main` sebelum apa pun.

### 11.0) Tugas pertama sesi ini: 2 komit lokal HILANG bersama sandbox (jebakan §10.6 terjadi)

Sesi bagian 3 ditutup platform (PR #19 merged ⇒ akses GitHub dicabut) **tepat sebelum PR terakhir
dibuka**, lalu sandbox ter-reset. Dua komit lokal tidak pernah ter-push dan tidak bisa dipulihkan
(`git reflog` di checkout baru hanya berisi `clone`, `git fsck --lost-found` kosong):

| Komit yang hilang | Isi |
|---|---|
| `d049cc0` | `docs(handoff): §11.0 catat komit lokal belum ter-push sebagai tugas pertama sesi berikutnya` |
| `a3035ad` | `docs: pesan handoff §11 untuk sesi berikutnya + disiplin Ponytail di CLAUDE.md` |

**Pemulihan yang dilakukan sesi ini (bagian 4):** tulis ulang dari ringkasan §11.2–§11.5 + isi skill
Ponytail, lalu langsung satu PR → CI hijau → merge (bukan ditahan sampai akhir sesi).

**Pelajaran permanen (tambahkan ke disiplin sesi mana pun):**
1. Satu PR = langsung buka + merge; **jangan menumpuk komit lokal** walau "tinggal docs".
2. Sebelum mulai kerja lain: `git log origin/main..HEAD --oneline` — kalau tidak kosong,
   bereskan dulu (cherry-pick/rebase ke branch sesi baru → push → PR → merge).
3. Kalau dokumen §11 ini tidak ada di `main`, berarti pemulihan belum terjadi → ulangi langkah di atas.

### 11.1) State GitHub terverifikasi (per akhir sesi bagian 3)

- `main` = **`8d53dc9`** (merge PR #19). ⚠️ Egress sandbox flaky: `curl` ke `api.github.com` bisa
  `000` → **retry 2–3×**, atau pakai `fetch_page` / `api.github.com/repos/itzranke/SAKU/contents/{path}?ref=main`
  (isi base64).
- Riwayat PR (SEMUA MERGED, CI hijau): M1–M6 = #2–#6 · docs-sync = #7 · #8 docs-sync+§8 ·
  #9 `GET /connectors` · #10/#11 ADR-023 + auth fase 1 · #12 §9 · #13 panduan P3 · #14 ADR-024 ·
  #15 persistensi sesi + logout · #16 web login + cookie · #17 panduan enforce · #18 usulan Node24 ·
  #19 §10.
- **Gate CI di `ci.yml` = versi USER** (commit `4c53783`, `9d1e376`, `6d01363`) — JANGAN diulang /
  di-push ulang.
- Rilis **v1.2.0 terbit TANPA aset biner** (unduhan masih v1.0.0) — jangan klaim ada biner baru.

### 11.2) Yang HIDUP di main sekarang (jangan bangun ulang)

**API** (`services/api-core`)
- `GET /api/v1/connectors` — read-only, 2 konektor: `MT5_CLOUD` & `MT5_STATEMENT`.
- Auth OTP → `verify-otp` mengembalikan `sakuSession` + `sakuSessionExpiresAt` + `ownerId:'user-local'`.
- `POST /auth/logout` — idempoten, selalu 200.
- `OwnerGuard` global: header `X-Saku-Session` → owner; tanpa/invalid ⇒ `user-local`.
- `SAKU_AUTH_ENFORCE` default **FALSE** (`true` ⇒ route `@OwnerScoped` tanpa sesi = 401 ramah;
  saat ini hanya `IntegrationsController` yang `@OwnerScoped`).
- `body.ownerId` / `?ownerId=` dari klien **DIABAIKAN** (deprecated).
- **Persistensi sesi:** tabel `auth_sessions` (hanya hash SHA-256) via `PrismaSessionStore`;
  write-through best-effort + hidrasi saat boot; **tanpa `DATABASE_URL`** = perilaku fase 1 identik
  (store `null`, `hydrate()` no-op).

**WEB** (`apps/web`)
- Halaman `/login` (OTP 2 langkah) · `/api/session` (POST set cookie HttpOnly, DELETE logout,
  GET boolean) · proxy catch-all `/api/proxy/[...path]` yang menerjemahkan cookie `saku_session`
  → header `X-Saku-Session`. **Rewrite statis di `next.config.js` SUDAH DIHAPUS** (rewrite tidak
  bisa menyuntik header).

**DOKUMEN**
ADR-022 `docs/22` · ADR-023 `docs/23` · ADR-024 `docs/25` · panduan P3 `docs/24` ·
panduan enforce `docs/26` · usulan + panduan Node24 `docs/ci/27_*` · handoff = dokumen ini (§1–§11).

### 11.3) Antrean pekerjaan sesi berikutnya (konfirmasi user dulu; tak ada yang wajib selain §11.0)

| Pri | Item | Catatan |
|---|---|---|
| 🔴 | **Item C — Node 24**: paste `docs/ci/27_CI_NODE24_PROPOSED.yml` & `27_RELEASE_NODE24_PROPOSED.yml` ke `.github/workflows/` lewat editor web | Panduan `docs/ci/27_NODE24_APPLY_GUIDE.md`. Node 20 **DIHAPUS** dari runner GitHub musim gugur 2026 ⇒ setelah itu action lama **GAGAL**, bukan warning. **TANYAKAN user di awal sesi** apakah sudah dilakukan; workflow tetap DIBLOKIR untuk agent (GitHub App tanpa scope `workflows`) — jangan pernah coba push. |
| 🟡 | P3 live test MetaApi (user-driven) | Panduan `docs/24`. `METAAPI_TOKEN` hanya di panel hosting user (env), investor password via Settings → Integrations. JANGAN lewat chat/repo. `MT5_CLOUD_ENABLED=false` ⇒ `NullProvider`; EA BUKAN auto-fallback. |
| 🟡 | Keputusan user: `SAKU_AUTH_ENFORCE=true` | Prasyarat lengkap (login + sesi persisten). Panduan + rollback 1 menit di `docs/26`. Pastikan user bisa membaca OTP di tab Logs dulu (kanal masih mock). |
| 🟢 | Fase multi-pemilik (owner ≠ `user-local`, rumah tangga) | **BUTUH ADR BARU.** Desain dulu, kode belakangan. |
| 🟢 | Kanal OTP nyata (email/WA) | Boleh diganti, TIDAK BOLEH menyentuh desain sesi. |
| 🟢 | `ponytail audit` pada `services/api-core/src` & `apps/web/src` | **LAPORAN dulu**, jangan langsung apply; lalu satu PR kecil per temuan yang disetujui user. |

### 11.4) Verifikasi standar (jalankan sebelum buka PR)

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@9.1.0 install --frozen-lockfile
pnpm --filter @saku/api-core exec tsc --noEmit        # bersih
pnpm --filter @saku/api-core test                     # 105/105, 14 file
pnpm --filter @saku/api-core build                    # nest build OK
# web bila tersentuh: tsc apps/web + next lint + NEXT BUILD (wajib — lihat jebakan §10.2 #2)
```

**Smoke HTTP** (`dist/main` tanpa `DATABASE_URL` ⇒ in-memory, PORT bebas mis. 4100):
- `GET /api/v1/connectors` → 200, 2 konektor; tanpa materi rahasia (nama field `investor_password`
  di deskriptor = **WAJAR**, bukan kebocoran).
- `POST /auth/request-otp {"identifier":"t@saku.local"}` → OTP tercetak di log
  (`[SAKU AUTH] OTP Code for t@saku.local: NNNNNN`) → `POST /auth/verify-otp` → berisi
  `sakuSession` (`accessToken` TIDAK muncul = benar).
- `POST /integrations` + `X-Saku-Session`, `body.ownerId:"penyusup"` → 201 `{integration:{id},notice}`,
  owner tetap `user-local`; `?ownerId=orang` di GET diabaikan; `master_password` → 400
  "investor password (read-only)"; `POST :id/test` → 201 `ok:false` ramah;
  `POST /auth/logout` ×3 → 200 semua (idempoten).
- Instance kedua `SAKU_AUTH_ENFORCE=true`: `GET /integrations` tanpa sesi → 401 ramah; dengan sesi → 200;
  setelah logout → 401; `/ledger/snapshot` & `/connectors` (non-scoped) tetap 200.
- `MT5_CLOUD_ENABLED=false` ⇒ provider `"null"` & `sync/now` `journalized:0`; `MT5_PROVIDER=mock` ⇒
  `journalized:3` (ulang ⇒ 0) + `state.equity` terisi. **grep token/password mentah di log = 0 hit.**

**Guardrail:** tidak ada endpoint "set balance"; tidak ada GET yang mengembalikan
`credentialCipher`/password; fallback in-memory saat `DATABASE_URL` mati HARUS tetap (dipakai unit test);
kontrak lama utuh (`/ledger/snapshot`, `/ledger/transaction`, `/ledger/journal` 400 saat unbalanced,
`/trading/sync` dialek bridge v1.1 + header `X-Saku-Client: saku-bridge` ⇒ `EA_LEGACY`,
`GET /connectors`, `sakuSession` di `verify-otp`).

### 11.5) Jebakan terbukti — TAMBAHAN (selain §4 & §10.2)

**BARU (sesi bagian 3–4):**
1. `.github/workflows/**` **DIBLOKIR untuk agent** (GitHub App tanpa scope `workflows`). Perubahan
   workflow = kirim file usulan (`docs/ci/27_*_PROPOSED.yml`) + panduan paste, pola
   `docs/ci/23_CI_APPLY_GUIDE.md`. Mencoba push = buang waktu.
2. `git stash -u` → `git reset --hard origin/main` → `git stash pop` = cara aman menyinkronkan branch
   sesi setelah merge tanpa kehilangan pekerjaan yang belum di-commit.
3. Komit lokal yang belum ter-push bisa hilang total saat sandbox ter-reset (lihat §11.0).

**LAMA (tetap berlaku, ringkas):**
- Nama field respons yang mengandung `token` **DIPOTONG** jaring redaksi (`SENSITIVE_EXACT`) ⇒ field
  kawat sesi WAJIB `sakuSession`. JANGAN lemahkan `RedactionInterceptor`.
- `grep -c` tanpa match = exit 1 ⇒ di `$( )` dengan `set -e` skrip mati **DIAM** → pakai
  `{ grep -cF "x" f || true; }`. Kutip `awk` dengan kutip **TUNGGAL**.
- Skrip smoke file terpisah **TIDAK melihat variabel shell parent** — definisikan semuanya di dalam skrip.
- Edit ganda (import + pemakaian) bisa masuk separuh → SELALU grep verifikasi **kedua** bagian.
- `pyyaml`: `pip install pyyaml --break-system-packages`.
- `packages/ledger-core/dist` di-track → rebuild + commit tiap edit `index.ts`.
- Prisma: JANGAN `migrate dev/deploy` — pakai `prisma db execute`; `ALTER TYPE ADD VALUE` dibungkus
  `DO $$ … EXCEPTION … NULL $$`; `verify.sql` pakai `IF NOT EXISTS`.
- `POST /integrations` = `{integration:{id},notice}` (ID **NESTED**).
- Root-level TS di `api-core` merusak `nest build`. Jangan `next build` saat dev server pegang `.next`.
- Egress sandbox flaky: `api.github.com` bisa `000` → retry 2–3× atau `fetch_page`/`web_search`.

### 11.6) Fakta MetaApi (keputusan BERLAKU — jangan dibongkar)

- SAKU tetap **RAW REST tanpa SDK**. Kontrak hidup di
  `services/api-core/src/modules/integrations/providers/metaapi.provider.ts`:
  base `mt-client-api-v1.{region}.agiliumtrade.ai` (default `new-york`, env `METAAPI_REGION`),
  header `auth-token`, `GET account-information`, `GET history-deals/time/:from/:to`,
  `POST /users/current/accounts`, timeout `METAAPI_TIMEOUT_MS` 15000, override
  `METAAPI_CLIENT_URL` / `METAAPI_PROVISIONING_URL`.
- SDK resmi (`metaapi-javascript-sdk`) hanya dipertimbangkan **KALAU butuh streaming WS/real-time** —
  minta keputusan user dulu, jangan tambah dep sepihak.
- ⛔ **CopyFactory** (copy trading) & **risk-management SDK** = KONTRA-DOKTRIN (eksekusi trade) —
  JANGAN integrasikan.
- **MetaStats** = kandidat display-only masa depan; angka ledger tetap HANYA dari pipeline jurnal
  double-entry.
- Polling saat ini (snapshot 120s, deals 10m) sangat konservatif — jangan naikkan frekuensi tanpa
  cek docs rate-limit resmi vendor.

### 11.7) Disiplin Ponytail (anti-bloat) — juga terpasang di `CLAUDE.md`

Blok **🪶 PONYTAIL** di `CLAUDE.md` adalah sumber kebenaran untuk gaya kerja "kode minimum yang benar":
panjat tangga (perlu ada? sudah ada di repo? stdlib? fitur native platform? dep yang sudah terpasang?
satu baris? baru kode minimum) sebelum menulis kode, tanpa abstraksi yang tak diminta, penghapusan >
penambahan, diff terpendek yang BENAR, komentar `// ponytail: <plafon>, <jalur upgrade>` untuk
simplifikasi yang disengaja, dan keluaran maksimal 3 baris. **Tes dan verifikasi penuh BUKAN bloat** —
garis merah (validasi batas kepercayaan, anti-kehilangan-data, keamanan/redaksi, aksesibilitas,
permintaan eksplisit user, pemahaman masalah end-to-end, doktrin SAKU, CI hijau sebelum merge)
mengalahkan Ponytail.

## 12) Addendum sesi 2026-08-30 (bagian 5) — REKONSTRUKSI §12 + laporan `ponytail audit` (12 temuan)

> Addendum hanya MENAMBAH; §1–§11 dipertahankan apa adanya.

### 12.0) Tugas pertama sesi ini: §12 HILANG bersama sandbox (jebakan §11.0 TERULANG — kali kedua)

Sesi bagian 4 ditutup platform (PR #20 merged ⇒ akses GitHub dicabut) **sebelum pekerjaan terakhir
sempat di-commit**: `docs/HANDOFF_SESI_BERIKUTNYA_v1.2.md` §12 (+89 baris). Sandbox lalu ter-reset.

**Bukti bahwa §12 benar-benar hilang (diverifikasi sebelum menulis ulang, bukan asumsi):**
- `git status` bersih; `git log origin/main..HEAD --oneline` **kosong**; `HEAD = origin/main = b90b8e3`.
- `api.github.com/.../contents/docs/HANDOFF_SESI_BERIKUTNYA_v1.2.md?ref=main` → 440 baris,
  daftar `## ` terakhir = `## 11)` ⇒ **tidak ada §12 di main**.
- `git ls-remote --heads origin` → 7 branch; `compare/main...ecccede9` (ujung `arena/01a05038-saku`)
  = `behind`, `ahead_by: 0`, `total_commits: 0`, `files: []` ⇒ **tidak ada komit unik** di branch
  sesi lalu yang bisa di-cherry-pick.
- `gh pr list --state open` = `[]` ⇒ tidak ada PR menggantung.

**Kesimpulan:** §12 ditulis ulang dari ringkasan yang dibawa pesan kickoff sesi ini, lalu
**langsung satu PR → CI hijau → merge** (bukan ditahan sampai akhir sesi — pelajaran §11.0 #1).

**Pelajaran permanen (perbarui, ini kejadian KEDUA):**
1. Satu PR = langsung buka + merge. Menumpuk komit lokal = undangan kehilangan kerja.
2. Sandbox bisa ter-reset **kapan saja**, termasuk setelah PR terakhir merge. Anggap setiap komit
   lokal belum aman sampai ada di `main`.
3. Sebelum kerja apa pun: `git status` + `git log origin/main..HEAD --oneline`. Kalau tidak kosong,
   bereskan DULU.
4. Kalau §12 ini tidak ada di `main`, berarti rekonstruksi belum terjadi → ulangi dari ringkasan
   §12.2–§12.4 (laporan audit) + §12.1 (status) + §12.4 (urutan PR).

### 12.1) State GitHub terverifikasi (awal sesi bagian 5)

- `main` = **`b90b8e3`** (merge PR #20, `pushed_at 2026-08-30T01:18:21Z`). Sebelumnya `8d53dc9` (PR #19).
- **Tidak ada PR terbuka**; semua riwayat PR MERGED + CI hijau:
  M1–M6 = #2–#6 · #7 docs-sync · #8 §8 · #9 `GET /connectors` · #10/#11 ADR-023 + auth fase 1 ·
  #12 §9 · #13 panduan P3 · #14 ADR-024 · #15 persistensi sesi + logout · #16 web login + cookie ·
  #17 panduan enforce · #18 usulan Node24 · #19 §10 · **#20 §11 + disiplin Ponytail**.
- Gate CI di `ci.yml` = versi **USER** (commit `4c53783`, `9d1e376`, `6d01363`) — JANGAN diulang/di-push ulang.
- Rilis **v1.2.0 terbit TANPA aset biner** (unduhan masih v1.0.0) — jangan klaim ada biner baru.
- Isi §11.2 (API + web + dokumen yang sudah hidup) **masih berlaku dan tidak berubah** — jangan bangun ulang.

### 12.2) Laporan `ponytail audit` — 12 temuan (laporan dulu, apply satu-per-satu lewat PR)

**Scope:** `services/api-core/src` (66 file, 4.370 baris impl) + `apps/web/src` (23 file, 2.846 baris)
+ `packages/database/src` (650 baris).
**Metode:** tangga Ponytail — perlu ada? sudah ada di repo? stdlib? fitur native platform? dep yang
sudah terpasang? satu baris? baru kode minimum.
**Catatan:** nomor temuan = nomor baris pada `main b90b8e3`, **sudah diverifikasi ulang sesi ini**.

| # | Lokasi | Temuan | Aksi |
|---|---|---|---|
| 1 | `integrations.service.ts:183,210-221` vs `providers/error-mapping.ts:30` | DUA implementasi aturan "pesan gagal ramah": `humaniseProbeError()` lokal vs `friendlyProviderError()`. Versi lokal tidak punya aturan kuota/402 dan beda salin UI | Hapus 20 baris, pakai yang sudah ada |
| 2 | `in-memory-integrations.repository.ts:42,109-114` | `IntegrationConflictError` dilempar tapi tak pernah ditangkap ⇒ kalau terjadi, klien dapat 500 generik; service sudah punya pesan duplikat 400 | tangkap di `IntegrationsService.create()` → 400 ramah |
| 3 | `in-memory-integrations.repository.ts:40` | `'user-local'` di-hardcode, padahal `LOCAL_OWNER` ada di `auth/session.service.ts:23` ⇒ akan jadi bug saat fase multi-pemilik | import 1 baris |
| 4 | `modules/connectors/registry.ts:19-23` | Cabang `else` menyalin 7 field deskriptor manual; mati hari ini (`CONNECTORS` hanya 2) | `describe()` masuk `interface Connector`, hapus cabang `else` |
| 5 | `packages/database/src/prisma-integrations.repository.ts:7-63` & `prisma-ledger.repository.ts:13-47` | 10 tipe kontrak dideklarasikan ulang identik dengan port api-core (arah dependensi api-core → database mencegah impor balik) | KEPUTUSAN USER: penanda drift sekarang (**#5a**), pindah bareng ADR multi-pemilik (**#5b**) |
| 6 | `sync-scheduler.service.ts:83,174` | `repo: any` + `any[]` padahal `IntegrationsRepository` punya `listAccountState?()` bertipe | ketik dengan `IntegrationsRepository` (cek adapter Prisma cocok) |
| 7 | `providers/error-mapping.ts:16-19` | Aturan #2 memakai pola `server` POLOS ⇒ pesan vendor apa pun yang mengandung kata "server" dipetakan ke "server/broker tidak didukung" (menutupi 5xx vendor) | persempit pola / urutkan aturan jaringan dulu + 1 tes baru untuk pesan "server error 500" |
| 8 | `SonziHealthCard.tsx:172,175,176` · `IntegrationsSettingsModal.tsx:110,187` · `StatementImportModal.tsx:175` vs `page.tsx:127` | Format mata uang diulang 6× padahal `formatCurrency()` sudah ada | satu helper `formatMoney` + pakai ulang di 6 titik |
| 9 | `page.tsx:264,280,295` | Kurs USD→IDR `15500` ditulis 3× — angka yang SAMA hidup di server: `packages/ledger-core/journal-mapping.ts:16 DEFAULT_EXCHANGE_RATES.USD` | minimal: satu konstanta `USD_IDR_RATE`; ideal (item terpisah): kurs dikirim API, jangan di-hardcode klien |
| 10 | `app/api/proxy/[...path]/route.ts:20` & `app/api/session/route.ts:16` | `API_BASE` (default `http://localhost:4000`) didefinisikan 2×; pola berbagi sudah ada: `app/api/session-cookie.ts` | satu modul konstanta, impor di dua route |
| 11 | `components/TransactionModal.tsx:10` · `page.tsx:85,91,113` | `any` di kontrak komponen/handler padahal tipe sudah ada di `store/ledgerSlice.ts` (`SimpleTransactionBody`, `ApiSnapshot`) | pakai tipe itu |
| 12 | `trading.service.ts:187,202-215` | `GET /trading/state` mengembalikan `fallbackState()` DEMO (akun `1048291` "HFM / MetaTrader 5", balance 25.000, equity 25.400) saat belum pernah sinkron | KEPUTUSAN USER: kontrak dipertahankan + tandai `demo: true` di respons, TANPA ubah UI |

**Rincian temuan yang butuh konteks:**

**#1 — aman dihapus, dibuktikan oleh tes yang sudah ada.**
`integrations.service.spec.ts:143` memakai input
`"HTTP 404: server \"UNKNOWN-BROKER\" not found in connector coverage"` dan mengasersi
`/tidak didukung konektor cloud|Impor statement/i`. Di `friendlyProviderError()` pesan itu kena
aturan #2 (`/…not found…/`) ⇒ `UNSUPPORTED_SERVER_MESSAGE` ⇒ **asersi tetap lolos**. Versi lokal
`humaniseProbeError()` tidak punya aturan kuota/402 ⇒ pesan vendor soal kuota hari ini jatuh ke
"kembalikan pesan mentah" — itu yang diperbaiki dengan memakai fungsi bersama.

**#2 — jangan hapus guard-nya.**
`IntegrationConflictError` adalah **guard invariant unik `(ownerId,type,login)`**; yang diminta
hanya menangkapnya di `IntegrationsService.create()` → 400 ramah (bukan 500 generik). Guard tetap jalan.

**#12 — asal-usul (diverifikasi, penting untuk keputusan produk).**
`fallbackState()` adalah **peninggalan era bridge/EA pra-ADR-022** (endpoint diberi label
"bridge compat" di `trading.controller.ts:13`), **TIDAK PERNAH dibahas di sesi 1–3** (nol penyebutan
di §1–§11 handoff ini), dan **TIDAK ADA kode web yang memanggil `/trading/state`** — UI memakai
`/trading/account-state`. Karena itu keputusannya: **kontrak dipertahankan**, hanya ditandai
`demo: true` supaya tak ada lagi yang mengira itu data nyata. Menandai = perubahan ADDITIF di respons.

**Koreksi/penemuan saat verifikasi ulang sesi ini (selisih kecil dari ringkasan lama):**
- Path temuan #4 yang benar = `services/api-core/src/modules/connectors/registry.ts` (bukan
  `integrations/connectors/registry.ts`).
- `StatementImportModal.tsx:175` memakai `toLocaleString('id-ID')` (bukan `'en-US'` + 2 desimal).
  Tetap duplikasi format ⇒ tetap masuk helper `formatMoney`, tapi helper harus punya **dua bentuk**
  (angka broker = `'en-US'` + 2 desimal; rupiah mutasi = `'id-ID'`).
- **Titik ke-7** yang belum masuk daftar: `page.tsx:50` juga memakai
  `toLocaleString('en-US', { minimumFractionDigits: 2 })` persis seperti 3 titik di SonziHealthCard.
  Bisa ikut helper yang sama (keluaran identik, nol risiko) — **diputuskan saat PR #6**.
- `page.tsx:127 formatCurrency()` memakai `'en-US'` untuk USD dan `'id-ID'` untuk IDR; jangan
  disatukan paksa dengan helper #8 tanpa cek tampilan USD (ada prefix `$`).

**Yang SENGAJA TIDAK dilaporkan (desain yang disengaja — jangan dibersihkan):**
- Pemisahan `redactForLog` vs `stripSensitive` (dua keperluan berbeda: log vs payload respons).
- Dua adapter per port (in-memory vs prisma) — fallback in-memory dipakai unit test & saat
  `DATABASE_URL` mati.
- Alias `@deprecated Mt5Payload` / `Mt5Deal` (kontrak EA lama, sengaja dipertahankan).
- LRU `rememberTicket` (5.000 entri) — pagu wajar untuk volume rumah tangga.

### 12.3) Yang TIDAK boleh dilakukan saat mengerjakan temuan di atas

- JANGAN ubah kontrak kawat yang sudah hidup: `sakuSession`, `POST /integrations` =
  `{integration:{id},notice}`, dialek `/trading/sync` bridge v1.1 + header `X-Saku-Client`,
  `GET /connectors`, `/ledger/journal` 400 saat unbalanced.
- JANGAN tambah dependensi baru (termasuk SDK MetaApi) tanpa keputusan user.
- JANGAN sentuh `.github/workflows/**` (lihat §11.5 #1).
- JANGAN lemahkan `RedactionInterceptor` (lihat §11.5 — field bermuatan `token` dipotong jaring).

### 12.4) Urutan PR FINAL (disetujui user 2026-08-30 — satu temuan per PR, CI hijau dulu baru lanjut)

| No | Isi PR |
|---|---|
| 0 | §12 itu sendiri (rekonstruksi ini) → PR → merge. Laporan audit aman dulu di `main` (pelajaran §11.0) |
| 1 | #3 — `in-memory-integrations.repository.ts:40` pakai `LOCAL_OWNER` (1 baris, nol risiko) |
| 2 | #12 — `GET /trading/state`: tambah penanda `demo: true` + komentar asal-usul |
| 3 | #5a — komentar penanda drift di `packages/database/src/prisma-integrations.repository.ts` & `prisma-ledger.repository.ts` (2 komentar, nol risiko) |
| 4 | #1 + #2 — `integrations.service.ts`: hapus `humaniseProbeError` (−20 baris) pakai `friendlyProviderError` + tangkap `IntegrationConflictError` ⇒ 400 ramah (bukan 500) |
| 5 | #10 + #9 (web) — satu konstanta `API_BASE` (2 route: proxy & session) + satu konstanta `USD_IDR_RATE` |
| 6 | #8 (web) — satu helper `formatMoney`; pakai di 6 titik (SonziHealthCard ×3, IntegrationsSettingsModal ×2, StatementImportModal ×1) |
| 7 | #4 — `describe()` masuk `interface Connector`; hapus cabang `else` di `modules/connectors/registry.ts` (−8 baris) |
| 8 | #6 + #11 — hapus `any`: `sync-scheduler.service.ts:83,174` (pakai tipe `IntegrationsRepository`) dan `TransactionModal.tsx` / `page.tsx` (pakai tipe yang sudah ada di `store/ledgerSlice.ts`) |
| 9 | #7 — persempit regex `server` di `providers/error-mapping.ts` + TES BARU (ubah pemetaan pesan) |
| 10 | 🟢 ADR multi-pemilik → barulah #5b: pindahkan 10 tipe kontrak ke `@saku/database` (−55 baris) |

Nomor 10 **menunggu ADR** (keputusan desain dulu, kode belakangan) — jangan dikerjakan di sesi ini
tanpa ADR baru.

## 13) Addendum sesi 2026-08-30 (bagian 5, lanjutan) — HASIL EKSEKUSI antrean audit + insiden CI

> Addendum hanya MENAMBAH; §1–§12 dipertahankan apa adanya.

### 13.0) Apa yang tuntas sesi ini (satu PR per temuan, semua CI hijau sebelum merge)

| PR | Isi | Temuan | Hasil CI |
|---|---|---|---|
| **#21** | §12 itu sendiri (rekonstruksi, +132 baris) | pelajaran §11.0 | ✅ 2/2 |
| **#22** | `in-memory-integrations.repository.ts` pakai `LOCAL_OWNER` | #3 | ✅ 2/2 |
| **#23** | `GET /trading/state` penanda `demo: true` + komentar asal-usul | #12 | ✅ 2/2 |
| **#24** | penanda drift 10 tipe kontrak di `packages/database` | #5a | ✅ 2/2 |
| **#25** | satu aturan pesan gagal (`friendlyProviderError`) + konflik → 400 ramah | #1 + #2 | ✅ 2/2 |
| **#26** | satu konstanta `API_BASE` + satu `USD_IDR_RATE` (web) | #10 + #9 | ✅ 2/2 |
| **#27** | satu helper format uang (`formatMoney`/`formatRupiah`) di 7 titik | #8 | ✅ 2/2 |
| **#28** | `describe()` masuk kontrak `Connector`, cabang `else` dihapus | #4 | ✅ 2/2 |
| **#29** | hapus `any`: `sync-scheduler.service.ts` + kontrak komponen web | #6 + #11 | ✅ 2/2 |
| **#30** | luruskan arti penanda `demo` (koreksi komentar PR #23) | lanjutan #12 | ⚠️ lihat §13.3 |
| **#31** | 5xx vendor tak lagi tampil "server tidak didukung" + tes baru | #7 | ✅ 2/2 |

**Jumlah tes naik 105 → 116** (14 → 15 berkas):
- +2 (`trading.service.spec.ts`): penanda `demo` sebelum/sesudah sinkron.
- +3 (`integrations.service.spec.ts`): aturan kuota/402 terpakai, konflik → 400 (bukan 500), error non-konflik tidak ditelan.
- +6 (`providers/error-mapping.spec.ts`, **berkas baru**): 5xx → jaringan, `server timeout` → jaringan, `Account 500123 not found` tetap unsupported, + 3 regresi.

**Keputusan user yang dijalankan:**
- Antrean dijalankan **terus** sampai habis (tanpa konfirmasi per item).
- Titik ke-7 (`page.tsx:50`) **ikut** disatukan ke helper format — *"kerjakan saja yang terbaik untuk ke depannya"*.

### 13.1) State akhir `main`

- `main` = **`efea8b0`** (merge PR #31). Riwayat sesi ini: #21–#31, **semua MERGED**.
- Tidak ada PR terbuka; `git log origin/main..HEAD` kosong; working tree bersih.
- Gate CI di `ci.yml` tetap **versi USER** (commit `4c53783`, `9d1e376`, `6d01363`) — tidak disentuh.
- Kontrak kawat yang dijaga sepanjang antrean (terbukti lewat smoke HTTP berulang):
  `{integration:{id},notice}` · `sakuSession` · `GET /connectors` identik · `/ledger/journal` 400 saat
  unbalanced · dialek `/trading/sync` bridge v1.1 · `master_password` → 400 "investor password (read-only)".

### 13.2) Sisa antrean

| Pri | Item | Catatan |
|---|---|---|
| 🟢 | **#5b** — pindahkan 10 tipe kontrak ke `@saku/database` (−55 baris) | **DIBLOKIR sampai ADR multi-pemilik ada.** Penanda drift (#5a, PR #24) sudah terpasang; jangan refactor 3 paket sebelum kebutuhan memaksa (YAGNI) |
| 🟢 | Kandidat baru (BELUM diaudit, tidak ada di 12 temuan): sisa `any` di web — `IntegrationsSettingsModal.tsx:178`, `store/ledgerSlice.ts:114,116`, `store/integrationApi.ts:143` | Semua berupa `as any` untuk mempersempit body/error dari `fetch`. Sengaja TIDAK disentuh di PR #29 (di luar temuan audit). Butuh keputusan user dulu |
| 🟢 | #9 jalur ideal: kurs dikirim API, bukan di-hardcode klien | Item terpisah, butuh keputusan user (baru konstanta `USD_IDR_RATE` hari ini) |
| 🔴 | **Item C — Node 24** | Lihat §13.6 — **user lupa**, belum dikerjakan |
| 🟡 | P3 live test MetaApi · keputusan `SAKU_AUTH_ENFORCE=true` · ADR multi-pemilik · kanal OTP nyata | Tidak berubah dari §12.3 / §11.3 |

### 13.3) INSIDEN: job Postgres merah pada PR #30 dan `main` — terbukti FLAKE

**Kronologi (jujur, termasuk kesalahan saya):**
1. PR #30 (komentar saja) → `lint-and-build` ✅, **`🗄️ Ledger Persistence vs PostgreSQL (smoke)` ❌**.
2. Saya **tetap merge** (loop tunggu saya hanya mencari `pending`, tidak mencari `fail`) — ini
   **melanggar aturan §1 #5**. `gh pr merge` tidak menolak merge walau ada job merah.
3. Run `main` setelah merge pun merah di **step yang sama**.
4. Diagnosis: `gh api …/jobs` → step
   **`M3 — Mt5Provider: flag off = no-op, mock = snapshot cache + jurnal`** → annotation
   **exit code 7** (= `curl` gagal tersambung; API belum siap/crash di runner — pola jebakan §7 #1).
5. Karena PR #30 hanya komentar, hipotesis = flake. Dibuktikan: PR #31 (perubahan nyata di
   `error-mapping.ts`) **2/2 hijau** ⇒ infra runner yang flaky, **bukan regresi kode**.

**Pelajaran permanen:**
1. **Sebelum merge, cek `fail` — jangan cuma cek `pending`.** Pola aman:
   `if gh pr checks N | grep -qi fail; then …berhenti…; fi`.
2. **`gh pr merge` TIDAK menolak merge saat ada job merah.** Jangan mengandalkan tool.
3. `gh run rerun <id> --failed` bisa menolak dengan *"run cannot be rerun; its workflow file may be
   broken"*; dan `--job <id>` tidak didukung `gh` 2.23. Jadi: kalau job merah, andalkan **PR baru /
   push baru** untuk memicu run bersih, atau minta user **Re-run job** lewat UI Actions.
4. Log Actions tetap **tidak bisa diunduh** dari sandbox (konfirmasi ulang jebakan §11.5 #4:
   `gh run view --log-failed` → `EOF`). Yang bisa dibaca: ANNOTATIONS di halaman job via `fetch_page`.
5. Gejala exit code 7 di job Postgres = **server belum listening**, bukan salah asersi. Langkah
   smoke CI memang tidak memeriksa hasil wait-loop-nya (`for …; do curl … && break; done`), jadi
   kegagalan baru muncul di `curl` berikutnya.

### 13.4) Koreksi penanda `demo` (lanjutan temuan #12)

Komentar di PR #23 mengatakan `demo: true` = "belum pernah sinkron". **Itu kurang tepat** — ketahuan
saat smoke: `MT5_CLOUD_ENABLED=true MT5_PROVIDER=mock` → `POST /trading/sync/now` → `journalized:3`
(sinkron nyata terjadi), tetapi `GET /trading/state` tetap `demo: true`.

**Penyebab struktural:** `lastMt5State` **hanya** diisi `TradingService.syncMt5Payload()` (jalur
`POST /trading/sync`, dialek bridge/EA). Jalur **cloud** (scheduler & `POST /trading/sync/now`)
menyimpan snapshot di `account_state_cache` dan memang tidak mengisi field itu.

**Arti yang benar (sudah tertulis di kode lewat PR #30):** `demo: true` = angka di `lastState`
berasal dari `fallbackState()` (angka contoh), **bukan** pernyataan "konektor belum pernah sinkron".
Untuk status konektor yang sesungguhnya: `GET /trading/account-state`.

### 13.5) Jebakan BARU sesi ini (tambahkan ke §4 / §11.5)

1. **Ganti ganda dengan pola `.toLocaleString(...)` berujung pada `x.formatMoney`.** Saat mengganti
   `snap.equity.toLocaleString('en-US', {…})` jadi helper, replace yang menyertakan titik menghasilkan
   **`snap.equity.formatMoney`** (bukan `formatMoney(snap.equity)`) — `tsc` **menangkapnya**, tapi
   hanya kalau dijalankan. **Selalu grep kedua bagian setelah edit massal** (jebakan §11.5 #9).
2. **`{...repo}` pada objek kelas membuang metode prototipe.** Stub repository untuk tes harus
   memakai objek literal yang mengimplementasikan port (atau `Object.create(instansi)`), BUKAN
   spread — gejalanya: `this.repo.findByLogin is not a function`.
3. **Jangan tambah `maximumFractionDigits` saat merapikan format mata uang.** Pola lama
   `{ minimumFractionDigits: 2 }` membiarkan maksimum bawaan 3, jadi `25400.567` tampil
   `25.400,567`. Menambah `maximumFractionDigits: 2` = **perubahan tampilan yang tak diminta**.
   Uji kesamaan keluaran secara programatik sebelum/ sesudah.
4. **`pkill -f "node dist/main.js"` bisa membunuh shell Anda sendiri** (pola `-f` cocok dengan baris
   perintah bash yang memuat string itu). Pakai `pkill -f "dist/main"` lalu verifikasi dengan
   `pgrep -af "dist/main" | grep -v pgrep`.
5. **Komentar yang ditulis terburu-buru bisa jadi salah faktual.** Sebelum menulis "field X berarti
   Y", jalankan dulu smoke yang membuktikan arti Y (lihat §13.4).
6. `gh pr create --body "..."` dengan isi berisi backtick/paren bisa gagal parsing. **Pakai
   `--body-file`.**

### 13.6) ITEM C — Node 24: status = BELUM dikerjakan (user lupa)

Diverifikasi sesi ini: `.github/workflows/ci.yml` masih `actions/checkout@v4`,
`pnpm/action-setup@v3`, `node-version: 20` ⇒ **Item C belum dilakukan**. Setiap run CI juga
masih mencetak warning: *"Node.js 20 is deprecated … being forced to run on Node.js 24"* —
pengingat bahwa setelah Node 20 dihapus dari runner (musim gugur 2026), action lama **GAGAL**,
bukan sekadar warning.

**Langkah browser-only (±4 menit, 2 berkas) — panduan lengkap TIDAK ditulis ulang di sini,
baca `docs/ci/27_NODE24_APPLY_GUIDE.md`:**
1. Buka `github.com/itzranke/SAKU/blob/main/docs/ci/27_CI_NODE24_PROPOSED.yml` → **Raw** → Ctrl+A → Copy
2. Buka `github.com/itzranke/SAKU/blob/main/.github/workflows/ci.yml` → ikon **PENSIL**
3. Dalam kotak kode: Ctrl+A → Delete → Paste (penggantian berkas utuh)
4. Commit langsung ke `main`, pesan: `ci: naikkan actions ke Node 24-ready (checkout v5, setup-node v5, pnpm v4, node 22)`
5. Ulangi 1–4 untuk `27_RELEASE_NODE24_PROPOSED.yml` → `.github/workflows/release-builds.yml`, pesan: `ci(release): naikkan actions ke Node 24-ready`
6. Cek **Actions**: 2 job tetap hijau & warning "Node.js 20 is deprecated" hilang.
   ❌ Rollback: `commits/main` → commit tersebut → **Revert**.

⛔ Workflow tetap **DIBLOKIR untuk agent** (GitHub App tanpa scope `workflows`) — jangan coba push.

### 13.7) Fakta MetaApi & doktrin (TIDAK berubah)

Masih persis seperti §11.6 — SAKU tetap **RAW REST tanpa SDK**; CopyFactory & risk-management SDK
tetap **kontra-doktrin**; MetaStats = kandidat display-only; polling jangan dinaikkan tanpa cek
rate-limit vendor. Tidak ada satu pun perubahan sesi ini yang menyentuh kontrak
`providers/metaapi.provider.ts`.

### 13.8) Definisi selesai sesi ini — terpenuhi

- ✅ `main` = branch; `git log origin/main..HEAD` **kosong**; `git status` **bersih**.
- ✅ Setiap PR (#21–#31) dibuka, CI hijau, lalu merge — **kecuali insiden PR #30 yang didokumenkan
  di §13.3** (dan terbukti flake, bukan regresi).
- ✅ Handoff diperbarui (§12 rekonstruksi + §13 hasil eksekusi, sisa antrean, jebakan baru).
