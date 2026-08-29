# 24 — Panduan P3: Live Test MetaApi (browser-only, langkah demi langkah)

> Status: **PANDUAN OPERASIONAL** (bukan ADR, tidak mengubah keputusan apa pun).
> Prasyarat keputusan: ADR-022 (MT5 sync tanpa-EA, IMPLEMENTED) & ADR-023 (auth sesi fase 1).
> Sasaran pembaca: pemilik SAKU yang hanya memakai **browser** (UI GitHub / UI hosting /
> halaman Settings SAKU). Tidak ada satu pun langkah yang menuntut terminal, Docker, atau MT5.

## 0) Aturan emas sebelum mulai (baca sekali, penting)

- ❌ **JANGAN** menempelkan `METAAPI_TOKEN`, investor password, atau kredensial apa pun ke
  chat, issue, PR, komentar, atau file di repositori. Semuanya masuk lewat **form/env di
  deployment Anda sendiri**.
- ❌ **JANGAN** memasukkan **master password** MT5. SAKU menolaknya (400) secara sengaja —
  doktrin read-only ADR-022.
- ✅ Yang boleh dibagikan saat minta bantuan: **kode status** (mis. `201`, `400`), **kalimat
  pesan** yang muncul di UI, dan **waktu kejadian**. Itu cukup untuk diagnosis.
- ✅ Kalau kredensial terlanjur ter-paste di mana pun: **revoke/ganti dulu** (token MetaApi:
  hapus di dashboard MetaApi; investor password: ganti di portal broker), baru lanjut.

## 1) Peta keputusan: apakah Anda memang perlu P3?

| Situasi Anda | Jalur yang benar |
|---|---|
| Ingin melihat angka MT5 nyata (equity/deals) mengalir ke SAKU | ✅ Lanjut P3 di dokumen ini |
| Broker/prop-firm tidak didukung middleware | ✅ Lewati P3 → pakai **import statement** (jalur resmi ADR-022 §6) |
| Hanya ingin mencoba UI tanpa uang/akun nyata | ✅ Lewati P3 → jalankan dengan `MT5_PROVIDER=mock` |
| Ingin SAKU mengeksekusi trade | ⛔ Tidak ada dan tidak akan ada. SAKU read-only. |

## 2) Yang perlu Anda siapkan (semua dari browser)

1. **Akun MetaApi** — daftar di dashboard MetaApi lewat browser.
2. **Token API MetaApi** — dibuat di dashboard MetaApi. Salin **langsung ke clipboard**;
   jangan simpan di catatan yang tersinkron, jangan kirim ke chat.
3. **Data akun MT5 read-only** dari portal broker Anda:
   - nomor **login** akun,
   - **investor password** (read-only) — bukan master,
   - **nama server** persis seperti tertulis di portal broker (mis. `Broker-Live07`).
4. **Akses ke panel deployment SAKU Anda** (Railway/Render/Fly/VPS panel/dsb.) untuk mengisi
   *Environment Variables* lewat UI web.

## 3) Langkah A — isi environment variables di panel hosting (UI, bukan terminal)

Buka panel hosting → service **api-core** → menu *Variables* / *Environment* → tambah:

| Variabel | Nilai | Wajib? |
|---|---|---|
| `METAAPI_TOKEN` | token dari dashboard MetaApi | ✅ ya |
| `MT5_CLOUD_ENABLED` | `true` | ✅ ya (kalau `false` ⇒ NullProvider, tidak ada panggilan keluar) |
| `MT5_PROVIDER` | `metaapi` | ✅ ya |
| `METAAPI_REGION` | default `new-york`; ganti hanya bila akun MetaApi Anda di region lain | ⬜ opsional |
| `METAAPI_TIMEOUT_MS` | default `15000` | ⬜ opsional |
| `MT5_SNAPSHOT_INTERVAL_SEC` | default 120 — **jangan diturunkan** tanpa cek rate-limit resmi vendor | ⬜ opsional |
| `MT5_DEALS_INTERVAL_MIN` | default 10 — idem | ⬜ opsional |
| `MT5_FIRST_SYNC_DAYS` | berapa hari riwayat ditarik saat sync pertama | ⬜ opsional |

Lalu klik **Save/Deploy** dan tunggu service restart hijau.

> ⚠️ Catatan sesi: SAKU fase 1 menyimpan sesi login di memori. **Restart = semua sesi login
> gugur** — Anda cukup login ulang (OTP). Ini normal, bukan bug (ADR-023 §2.4).

✅ Berhasil bila: halaman/deployment kembali *running* tanpa error boot.
❌ Gagal bila: service crash-loop → kosongkan kembali `METAAPI_TOKEN`, deploy ulang, lalu
laporkan **pesan error di log panel** (bukan isi token).

## 4) Langkah B — daftarkan akun MT5 di UI SAKU

1. Buka SAKU di browser → **Settings → Integrations**.
2. Pilih konektor **MT5 (cloud)**.
3. Isi: login, **investor password**, nama server (port hanya bila broker memintanya).
4. Klik **Simpan/Connect**.

Yang harus terjadi:

- ✅ Muncul baris integrasi baru dengan status tersimpan, dan sebuah **notice** penjelas.
- ✅ Password **tidak pernah** tampil lagi di layar mana pun setelah disimpan — hanya
  tersimpan terenkripsi (AES-256-GCM, format `iv:tag:cipher`). Tidak ada satu pun endpoint
  yang mengembalikannya.
- ❌ Kalau Anda tidak sengaja mengisi **master password**: muncul **400** dengan pesan berisi
  frasa *"investor password (read-only)"*. Itu perlindungan, bukan kegagalan sistem —
  ambil investor password dari portal broker lalu ulangi.

## 5) Langkah C — uji koneksi (tombol Test)

Di baris integrasi, klik **Test**.

| Hasil | Arti | Tindakan |
|---|---|---|
| ✅ `ok: true` | MetaApi menjawab, akun terbaca read-only | Lanjut §6 |
| ⚠️ `ok: false` + satu kalimat saran | Kontrak "gagal ramah": SAKU **sengaja** membalas `201` dengan penjelasan singkat, tanpa stack trace, dan biasanya menyarankan **import statement** | Baca kalimatnya, cocokkan tabel §7 |

> Catatan teknis yang sering bikin bingung: uji gagal tetap berkode **HTTP 201**, karena yang
> gagal adalah *koneksi ke broker*, bukan *permintaan Anda*. Yang menentukan sukses adalah
> field `ok`.

## 6) Langkah D — verifikasi data benar-benar mengalir

1. Tunggu satu siklus snapshot (default ±2 menit) → buka dashboard: **equity/balance**
   akun terisi.
2. Tunggu siklus deals (default ±10 menit) atau picu sync dari UI bila tersedia.
3. Buka **Jurnal** → transaksi hasil sinkron muncul dengan `source = MT5_SYNC`.
4. Jalankan sinkron kedua kalinya → jumlah entri baru **0** (dedupe `account:ticket`).
   Angka yang tidak bertambah dua kali = tanda dedupe bekerja. ✅

Yang **tidak akan** terjadi, dan memang tidak boleh:

- ❌ Tidak ada tombol/endpoint "set balance" — saldo hanya lahir dari jurnal double-entry.
- ❌ Snapshot equity dari vendor **tidak pernah** menulis ledger; ia hanya tampilan.
- ❌ EA **bukan** fallback otomatis. Kalau cloud gagal, jalur resminya import statement.

## 7) Tabel diagnosa pesan gagal (tanpa perlu log server)

| Yang Anda lihat | Kemungkinan sebab | Langkah Anda |
|---|---|---|
| Pesan menyebut kredensial/otorisasi | investor password/login salah, atau password sudah diganti di broker | Ambil ulang dari portal broker → **Settings → Integrations → Edit/Rotate** |
| Pesan menyebut server/nama server | nama server tidak persis sama dengan portal broker | Salin-tempel persis, perhatikan tanda hubung & angka |
| Pesan menyebut timeout | jaringan vendor lambat / region jauh | Naikkan `METAAPI_TIMEOUT_MS`, atau set `METAAPI_REGION` sesuai region akun MetaApi |
| Pesan menyebut akun belum siap / provisioning | akun baru butuh waktu di sisi vendor | Tunggu beberapa menit, klik **Test** lagi |
| Selalu gagal walau semua benar | broker tidak didukung middleware | Beralih ke **import statement** (ADR-022 §6) — ini jalur resmi, bukan kekalahan |
| Angka muncul tapi berhenti diperbarui | token dicabut / kuota vendor | Cek dashboard MetaApi; buat token baru → perbarui env di panel hosting |

## 8) Cara mematikan integrasi dengan aman (kapan saja)

1. **Settings → Integrations → Disconnect** pada baris MT5 → kredensial di-shred dari DB. ✅
2. Ganti **investor password** di portal broker (doktrin ADR-022: rotate saat disconnect). ✅
3. Bila ingin memutus total panggilan keluar: panel hosting → set `MT5_CLOUD_ENABLED=false`
   → deploy. Provider menjadi **NullProvider**: nol panggilan keluar, `journalized: 0`. ✅
4. Bila ingin mencabut akses vendor sekaligus: hapus token di dashboard MetaApi, lalu
   kosongkan `METAAPI_TOKEN` di panel hosting. ✅

Data jurnal yang sudah masuk **tetap ada** — ledger immutable, tidak dihapus oleh disconnect.

## 9) Batasan yang sudah diputuskan (jangan diminta ulang)

- SAKU memanggil MetaApi lewat **REST mentah**, tanpa SDK. Kontraknya ada di
  `services/api-core/src/modules/integrations/providers/metaapi.provider.ts`
  (base `mt-client-api-v1.{region}.agiliumtrade.ai`, header `auth-token`,
  `GET account-information`, `GET history-deals/time/:from/:to`,
  `POST /users/current/accounts`). SDK resmi hanya akan dipertimbangkan bila kelak butuh
  streaming WebSocket — dan itu butuh keputusan pemilik lebih dulu.
- **CopyFactory** (copy trading) dan **risk-management SDK** (eksekusi) ⛔ tidak akan
  diintegrasikan: kontra-doktrin read-only.
- **MetaStats** hanya kandidat referensi tampilan di masa depan; angka ledger tetap hanya
  dari pipeline jurnal double-entry.
- Frekuensi polling saat ini sangat konservatif dan **tidak dinaikkan** tanpa memeriksa
  dokumentasi rate-limit resmi vendor.

## 10) Checklist ringkas (cetak/centang saat mengerjakan)

- [ ] Token MetaApi dibuat, tidak pernah masuk chat/repo
- [ ] `METAAPI_TOKEN`, `MT5_CLOUD_ENABLED=true`, `MT5_PROVIDER=metaapi` terisi di panel hosting
- [ ] Service restart hijau, saya login ulang ke SAKU (sesi gugur saat restart = normal)
- [ ] Integrasi MT5 tersimpan dengan **investor password** (master ditolak 400 — sudah dipahami)
- [ ] Tombol **Test** → `ok: true` (atau pesan gagal sudah dicocokkan ke tabel §7)
- [ ] Equity muncul setelah ±2 menit
- [ ] Jurnal berisi entri `source = MT5_SYNC`, dan sync kedua menambah **0** entri
- [ ] Saya tahu cara mematikan: Disconnect → ganti investor password → `MT5_CLOUD_ENABLED=false`
