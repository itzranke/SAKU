# 26 — Panduan Operasional: Menyalakan `SAKU_AUTH_ENFORCE` (browser-only)

> Status: **PANDUAN OPERASIONAL** (ADR-024 §2.4 PR-4). Tidak mengubah keputusan apa pun.
> Semua langkah lewat browser: panel hosting + UI SAKU. Tidak ada terminal.

## 0) Apa yang sebenarnya dinyalakan

| Keadaan | Perilaku |
|---|---|
| `SAKU_AUTH_ENFORCE` kosong / `false` (**default**) | Semua request tanpa sesi tetap dilayani sebagai pemilik tunggal `user-local`. Ini perilaku SAKU sejak awal. |
| `SAKU_AUTH_ENFORCE=true` | Route ber-`@OwnerScoped()` (hari ini: **Integrations**) menolak request tanpa sesi valid dengan **401 ramah**. Route lain (mis. `/ledger/snapshot`, `/connectors`) tetap terbuka. |

Menyalakannya = keputusan produk, bukan sekadar konfigurasi: sejak saat itu Anda **wajib login**
untuk mengelola integrasi.

## 1) Prasyarat — jangan dilewati

- [ ] Deployment sudah memakai versi yang memuat **halaman `/login`** (ADR-024 PR-3).
- [ ] Anda sudah pernah **berhasil login** di deployment itu dengan enforce masih `false`.
- [ ] Anda tahu di mana tombol *Environment Variables* panel hosting Anda (untuk mematikannya lagi).

> ⚠️ Urutan ini tidak boleh dibalik. Menyalakan enforce sebelum halaman login tersedia akan
> mengunci Anda dari pengaturan integrasi Anda sendiri.

## 2) Cara mendapatkan kode OTP saat ini (fase mock)

Kanal pengiriman OTP masih **jujur-mock**: kode dicetak di **log server**, bukan dikirim email/WA.

1. Buka panel hosting → service **api-core** → tab **Logs**.
2. Di browser lain/tab lain, buka SAKU → `/login` → isi email → **Kirim kode OTP**.
3. Di tab Logs, cari baris: `[SAKU AUTH] OTP Code for <email>: NNNNNN`.
4. Masukkan 6 digit itu di halaman login. ✅

Kalau Anda tidak punya akses Logs, **jangan** nyalakan enforce dulu — Anda tidak akan bisa masuk.

## 3) Menyalakan (langkah demi langkah)

1. Panel hosting → service **api-core** → *Environment Variables*.
2. Tambah `SAKU_AUTH_ENFORCE` = `true`. **Save/Deploy**.
3. Tunggu service hijau. (Bila `DATABASE_URL` terpasang, sesi Anda **selamat** dari restart —
   itulah gunanya tabel `auth_sessions`. Tanpa DB, Anda perlu login ulang.)
4. Buka SAKU → **Settings → Integrations**:
   - ✅ Sudah login → daftar integrasi tampil normal.
   - ❌ Belum login → muncul pesan ramah *"Sesi tidak valid atau kadaluarsa…"* → buka `/login`.
5. Cek bahwa halaman lain tetap normal (dashboard/net worth) — memang sengaja tidak ikut terkunci.

## 4) Kalau Anda terkunci (rollback aman, 1 menit)

1. Panel hosting → *Environment Variables* → ubah `SAKU_AUTH_ENFORCE` menjadi `false`
   (atau hapus variabelnya). **Save/Deploy**. ✅
2. Tunggu hijau → akses kembali seperti semula. Tidak ada data yang hilang: enforce hanya
   memengaruhi izin akses, bukan isi jurnal.

## 5) Tabel gejala → tindakan

| Gejala | Sebab | Tindakan |
|---|---|---|
| Semua halaman Integrations 401 walau baru login | Cookie tidak terkirim (mis. akses lewat host berbeda dari yang dipakai login) | Login ulang di host yang sama persis; pastikan HTTPS di produksi |
| Setelah setiap deploy harus login ulang | `DATABASE_URL` tidak terpasang ⇒ sesi in-memory | Pasang `DATABASE_URL` dan jalankan migrasi `auth_sessions` |
| Login berhasil tapi langsung kembali ke `/login` | Cookie diblokir browser (mode privasi/third-party) | Buka di jendela normal, cek pengaturan cookie situs |
| Tidak menemukan kode OTP | Kanal masih mock | Ambil dari **Logs** panel hosting (§2) |
| Ingin mematikan sesi di semua perangkat | Belum ada tombol "logout semua" | Redeploy service (tanpa DB) atau kosongkan tabel `auth_sessions` (dengan DB) |

## 6) Migrasi `auth_sessions` (kalau memakai database)

- Tabel dibuat lewat **`prisma db execute`** dengan `CREATE TABLE IF NOT EXISTS` —
  file: `packages/database/prisma/migrations/20260901000000_auth_sessions/migration.sql`,
  pemeriksa: `verify.sql` di folder yang sama.
- ❌ **Jangan** menjalankan `prisma migrate dev` atau `migrate deploy` di repositori ini,
  apa pun alasannya. Itu kebijakan yang berlaku untuk semua migrasi SAKU.
- Isi tabel: **hash** token saja (`tokenHash`), `ownerId`, `expiresAt`, `createdAt`. Tidak ada
  token mentah, jadi bocornya dump database **tidak** memberi penyerang sesi yang bisa dipakai.

## 7) Batasan yang masih berlaku setelah enforce menyala

- Masih **single-user**: setiap sesi yang sah menghasilkan owner `user-local`. Multi-pemilik
  (rumah tangga) adalah fase berikutnya dan butuh ADR tersendiri.
- Hanya **Integrations** yang `@OwnerScoped()`. Menambah route lain ke lingkup ini = perubahan
  perilaku, jadi harus disengaja dan diuji (401 ramah + smoke).
- `body.ownerId` / `?ownerId=` dari klien tetap **diabaikan** (deprecated, bukan error).
- Tidak ada JWT, refresh token, atau RBAC — dan tidak direncanakan.
