# 23 — Cara Memasang Workflow CI Baru (browser-only, tanpa terminal)

> **Kenapa file ini ada?** Token agent di sesi Arena memakai GitHub App yang **tidak punya
> scope `workflows`**, jadi agent tidak bisa mengubah `.github/workflows/*` lewat push/PR
> (push ditolak: `refusing to allow a GitHub App to create or update workflow ... without
> 'workflows' permission`). Ini keterbatasan alat, bukan desain. Konten workflow final sudah
> disiapkan agent di [`23_CI_PROPOSED.yml`](./23_CI_PROPOSED.yml) dan **sudah divalidasi
> parse YAML-nya**. Yang hilang cuma satu aksi copy-paste di web UI.

Isi workflow usulan ini berlaku untuk **seluruh epic ADR-022 (M1–M6)** — sekali tempel, tidak
perlu diulang per milestone:

| Job | Step | Milestone |
|---|---|---|
| `lint-and-build` | Typecheck api-core, web, **dan @saku/database** | M1 |
| `lint-and-build` | Unit test ledger-core + **api-core (vitest)** | M1–M3 |
| `db-persistence-smoke` | jurnal survive restart API | sudah ada (v1.1) |
| `db-persistence-smoke` | **M1–M3**: apply `migration.sql` + `verify.sql` **semua folder** `prisma/migrations/2*/` → `processed_deals`, `integration_accounts`, `account_state_cache` ter-verify di postgres:16 | M1–M3 |
| `db-persistence-smoke` | **M1**: payload `/trading/sync` sama 2× → `journalized:2` lalu `journalized:0, skipped:2`; restart API → tetap 0 jurnal ganda | M1 |
| `db-persistence-smoke` | **M2**: hanya investor password (master → 400), tidak ada kredensial di respons/log, `credentialCipher` di DB = ciphertext `iv:tag:cipher` | M2 |
| `db-persistence-smoke` | **M3**: `MT5_CLOUD_ENABLED=false` → provider `null`, nol outbound call; `MT5_PROVIDER=mock` → snapshot cache + 3 jurnal | M3 |

## ✅ Langkah (hanya browser, ± 2 menit)

1. ✅ Buka <https://github.com/itzranke/SAKU/blob/main/.github/workflows/ci.yml>
2. ✅ Klik ikon **pensil** (Edit this file). Kalau diminta fork, pilih **"Commit directly to the `main` branch"** pada langkah 5 — repo ini milik kamu, jadi tidak perlu fork.
3. ✅ Buka tab lain ke <https://raw.githubusercontent.com/itzranke/SAKU/main/docs/ci/23_CI_PROPOSED.yml> → **Ctrl/Cmd+A** lalu **Copy** seluruh isinya (file mentah, bukan halaman GitHub).
4. ✅ Kembali ke editor `ci.yml`: **select-all di dalam kotak kode → hapus → paste** konten tadi. (Posisi baris tidak boleh digeser; ini penggantian file, bukan penambahan.)
5. ✅ **Commit changes** → pesan: `ci: ADR-022 gate — processed_deals idempotency, credential redaction, provider mock` → **Commit directly to the main branch**.
6. ✅ Buka <https://github.com/itzranke/SAKU/actions> → tunggu "SAKU CI Pipeline" hijau pada commit itu.
7. ✅ Buka PR milestone → tab **Checks**: step `M1/M2/M3 — …` (apply migration SQL) harus hijau. Kalau merah, salin **nama step** + 5 baris error terakhir ke chat — agent yang perbaiki (tidak perlu aksi terminal di laptop).

## ❌ Yang tidak perlu (dan tidak boleh) kamu lakukan

- ❌ Menjalankan `git`/`pnpm`/Docker/`psql` di laptop — semua langkah di atas selesai di browser.
- ❌ Menempel/menyimpan kredensial broker apa pun di file workflow, issue, PR, atau chat.
  Nilai `ENCRYPTION_MASTER_KEY: 'saku_ci_throwaway_key_32_bytes!!'` di dalam workflow adalah
  **kunci buang-buang untuk tes** (hanya mengenkripsi data sampah di DB runner yang umur 5 menit) —
  bukan rahasia produksi, jangan dipakai di `.env` lokal.
- ❌ Menambah service `mysql`/`mongo` atau mengubah `postgres:16` → version lain.
- ❌ "Memperbaiki" warning **Node20 deprecation** di Actions: itu known-issue yang diterima (backlog), di luar scope epic ini.

## Kalau PR milestone diganjal "workflows blocked"

Untuk **first-time contributor / PR yang menyentuh workflow**, GitHub menampilkan
*"awaiting maintainer approval"*. Jangan approve sembarangan: diff workflow **tidak pernah**
dikirim lewat PR agent (oleh karena itu file ini ada), jadi kalau ada PR yang menyentuh
`.github/workflows/**` — ❌ jangan di-approve, laporkan ke chat.

## Perilaku sementara selama epic (kalau langkah di atas belum dijalankan)

CI lama tetap hijau dan tetap membuktikan: typecheck api-core + web, lint, build, dan jurnal
survive restart. Yang **belum** dijaga otomatis: idempotensi `processed_deals` di Postgres,
kebocoran kredensial di respons/log, dan no-op scheduler saat flag off. Bukti sementara diambil
dari unit test (`pnpm --filter @saku/api-core test`, 17 tes) + smoke manual yang dilaporkan di
tiap PR.
