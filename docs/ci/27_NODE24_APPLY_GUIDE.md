# 27 — Menghapus Peringatan "Node.js 20 deprecated" di Actions (browser-only)

> **Kenapa file ini ada?** Token agent memakai GitHub App **tanpa scope `workflows`**, jadi agent
> tidak boleh mengubah `.github/workflows/**`. Konten final sudah disiapkan & tervalidasi
> parse YAML-nya; yang tersisa hanya copy-paste di editor web GitHub. Pola sama dengan
> [`23_CI_APPLY_GUIDE.md`](./23_CI_APPLY_GUIDE.md).

## 1) Kenapa sekarang, bukan "nanti saja"

Selama ini peringatan Node 20 di Actions kita terima sebagai backlog. Statusnya berubah:

- Sejak pertengahan 2026 runner **memaksa** JavaScript action berjalan di Node 24 —
  peringatan yang Anda lihat sekarang (`…are being forced to run on Node.js 24`).
- **Node 20 dihapus total dari runner GitHub pada musim gugur 2026.** Setelah itu, action yang
  masih menargetkan Node 20 **gagal**, bukan sekadar memperingatkan.

Artinya: ini bukan lagi kosmetik, melainkan pekerjaan sebelum CI berhenti jalan.

## 2) Apa persisnya yang berubah

| Item | Sebelum | Sesudah |
|---|---|---|
| `actions/checkout` | `@v4` | `@v5` |
| `actions/setup-node` | `@v4` | `@v5` |
| `pnpm/action-setup` | `@v3` | `@v4` |
| `node-version` di CI | `20` | `22` (LTS; masih memenuhi `engines: >=20` di `package.json`) |
| Isi step / gate / assertion | — | **tidak diubah satu baris pun** |

`dtolnay/rust-toolchain@stable` tidak ikut berubah (bukan JavaScript action).

Dua file usulan sudah tersedia di repo dan **hanya berbeda pada baris di atas**:

- `docs/ci/27_CI_NODE24_PROPOSED.yml` → untuk `.github/workflows/ci.yml`
- `docs/ci/27_RELEASE_NODE24_PROPOSED.yml` → untuk `.github/workflows/release-builds.yml`

## 3) ✅ Langkah untuk `ci.yml` (browser, ±2 menit)

1. ✅ Buka <https://github.com/itzranke/SAKU/blob/main/docs/ci/27_CI_NODE24_PROPOSED.yml>
   → klik tombol **Raw** → **Ctrl/Cmd+A** → **Copy**.
2. ✅ Buka <https://github.com/itzranke/SAKU/blob/main/.github/workflows/ci.yml>
   → klik ikon **pensil** (Edit this file).
3. ✅ Klik di dalam kotak kode → **Ctrl/Cmd+A** → **Delete** → **Paste** isi yang tadi disalin.
   (Ini penggantian file utuh, bukan penyisipan.)
4. ✅ **Commit changes** → pesan: `ci: naikkan actions ke Node 24-ready (checkout v5, setup-node v5, pnpm v4, node 22)`
   → pilih **Commit directly to the `main` branch** → **Commit**.
5. ✅ Buka <https://github.com/itzranke/SAKU/actions> → tunggu run terbaru **hijau**.

## 4) ✅ Langkah untuk `release-builds.yml`

Ulangi langkah 1–5 dengan pasangan file:

- sumber: `docs/ci/27_RELEASE_NODE24_PROPOSED.yml`
- tujuan: `.github/workflows/release-builds.yml`
- pesan commit: `ci(release): naikkan actions ke Node 24-ready`

## 5) Yang harus Anda lihat setelah selesai

- ✅ Job `lint-and-build` dan `🗄️ Ledger Persistence vs PostgreSQL (smoke)` **tetap hijau**.
- ✅ Di step **Complete job**, peringatan *"Node.js 20 is deprecated…"* **hilang**.
- ❌ Kalau ada job merah: buka job → lihat step pertama yang merah.

## 6) Rollback (kalau ada yang merah)

1. Buka <https://github.com/itzranke/SAKU/commits/main> → cari commit yang barusan Anda buat.
2. Klik commit → tombol **Revert** → **Commit directly to the `main` branch**. ✅
3. CI kembali ke keadaan sebelumnya (hijau, dengan peringatan Node 20 yang tidak berbahaya
   untuk sementara). Laporkan pesan step yang merah, dan perbaikan bisa disiapkan terpisah.

## 7) Catatan teknis (untuk sesi berikutnya)

- Peringatan Node 20 dipancarkan **runner**, bukan workflow; tidak bisa dibungkam dengan env
  variable. Satu-satunya jalan bersih adalah menaikkan versi action.
- `node-version: 22` dipilih (bukan 24) karena LTS yang matang dan cocok dengan
  `engines.node >= 20.0.0` serta `packageManager: pnpm@9.1.0` yang dipakai repo. Menaikkan ke 24
  boleh, tapi lakukan sebagai perubahan terpisah agar mudah di-bisect.
- Setelah kedua workflow diperbarui, item "Node20 backlog" boleh ditandai **selesai** di handoff.
