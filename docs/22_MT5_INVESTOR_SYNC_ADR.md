# ADR-022: Integrasi MT5 Tanpa EA — Investor-Password Server-Side Sync (Preseden Myfxbook)

- Status: ACCEPTED (keputusan Product Owner, 31 Agustus 2026)
- Menggantikan: jalur "EA SakuBridge sebagai primer" (docs/21 runbook lama)
- Keputusan ini meniadakan keharusan memasang EA bagi pengguna.

## Konteks
SAKU adalah terminal keuangan personal: jurnal kekayaan (double-entry immutable), budgeting,
aset, dan hutang dalam satu produk. MT5 hanyalah SALAH SATU sumber data aset (bucket
securities/trading) — bukan pusat aplikasi. Arsitektur lama mengharuskan user menginstal EA
di terminal MT5; ditolak karena (1) friksi adopsi multi-user — tidak semua user mau repot
memasang EA; (2) risiko teknis EA di terminal (memory leak / lag; lihat
docs/CATASTROPHIC_FAILURE_VECTORS_AND_DEFENSES.md).
Preseden industri (riset Agu 2026): Myfxbook — user memasukkan login + investor password
(read-only) + nama server; layanan menarik data dari sisi server; terminal user tidak perlu
berjalan. Doktrin keamanannya: read-only saja; JANGAN pernah menerima master password; ganti
investor password saat disconnect.

## Keputusan
Jalur primer: server-side pull dengan investor password.
1. UX: Settings > Integrations > "MT5": form login + investor password + server
   (port opsional). Tidak ada instalasi apa pun di sisi user.
2. Konektivitas: protokol MT5 proprieter; SAKU memakai middleware cloud MT5 headless
   (kandidat utama MetaApi, mode read-only dengan investor password; alternatif mtapi.io).
   Dibungkus adapter Mt5Provider agar vendor dapat diganti.
3. Sinkronisasi:
   - Equity/balance snapshot: polling 60–300 dtk -> display Net Worth + kartu kesehatan;
     TIDAK PERNAH menulis saldo jurnal.
   - Riwayat deal: tiap 5–15 mnt -> normalisasi ke pipeline POST /api/v1/trading/sync
     -> jurnal TRADING_PROFIT + source=MT5_SYNC, dedupe account:ticket di tabel
     processed_deals (persisten).
4. Rekonsiliasi ground-truth: import statement/CSV MT5 (pipeline staging existing) = sumber
   dokumen resmi; selisih tampil di modul RECONCILIATION.
5. EA SakuBridge.mq5: DEPRECATED -> services/deprecated/mt5-ea/; tetap tersedia sebagai opsi
   privasi "zero-password" utk power user (preseden FX Blue), BUKAN jalur default.
6. Cakupan broker: server broker/prop-firm yang tidak didukung middleware -> fallback resmi:
   import statement (tanpa EA, tanpa vendor).

## Konsekuensi
(+) Nol friksi user; terminal tak harus nyala; siap utk model SaaS multi-user; konsisten
    dengan jurnal immutable (sync = penghasil entri, bukan editor saldo).
(-) Kustodi kredensial: SAKU menyimpan investor password -> wajib enkripsi at-rest AES-GCM
    (ENCRYPTION_MASTER_KEY), TLS in-transit, larangan logging kredensial, hanya investor
    password (read-only), alur rotasi saat disconnect.
(-) Ketergantungan + biaya vendor (MetaApi ± $30/bln, 1 akun termasuk, pay-as-you-go) ->
    keputusan bundling/pass-through ditunda sampai fase multi-user; CI hanya pakai Mock.
(-) Data riwayat bisa tertinggal (delay) vs EA -> diterima; recon statement menutupnya.

## Catatan sumber riset (Agu 2026)
- Myfxbook investor-password sync + doktrin keamanan (forexmechanics.com, 2026).
- MetaApi.cloud: REST/WS, investor password read-only, tier reguler $30/bln (7-day trial,
  1 akun MT termasuk).
- api2trade.com: "no EA, no terminal required" (preseden kelas yang sama).
- Kasus server prop-firm (the5%ers) tidak tersedia di layanan sync -> fallback statement.
- zpi.web.id (Zapi): agregator scraper data publik — utk enrichment pasar/berita masa
  depan, BUKAN konektor broker. Jangan simpan kredensial finansial di sana.

## Implementasi
- M1 — `processed_deals` persisten + migration SQL + CI idempotensi: PR #2.
