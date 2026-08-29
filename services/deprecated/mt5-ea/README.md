# MT5 Bridge EA — ⚠️ DEPRECATED (legacy, lihat [ADR-022](../../../docs/22_MT5_INVESTOR_SYNC_ADR.md))

`SakuBridge.mq5` adalah **Expert Advisor read-only** yang dipakai SAKU sebelum v1.2 untuk
menarik state akun + closed deals dari terminal MetaTrader 5 lewat `WebRequest`.

## Kenapa dideprekasi

| Alasan | Detail |
|---|---|
| Friksi adopsi | User harus mengompilasi di MetaEditor, menempelkan ke chart, dan mendaftarkan whitelist `WebRequest`. Untuk produk yang harus bisa dipakai banyak orang, itu tembok masuk yang terlalu tinggi |
| Risiko teknis di terminal | EA ikut berjalan di terminal user: potensi memory leak / lag / terminal harus nyala (didaftar sebagai vektor kegagalan di [`docs/CATASTROPHIC_FAILURE_VECTORS_AND_DEFENSES.md`](../../../docs/CATASTROPHIC_FAILURE_VECTORS_AND_DEFENSES.md)) |
| Jalur default baru | ADR-022 memindahkan penarikan data ke **sisi server**: Settings → Integrations → MT5 (login + **investor password** read-only + nama server). Terminal user tidak perlu berjalan sama sekali |

Depresiasi = **tidak dihapus**. Jalur push dari EA tetap dilayani API supaya instalasi lama
tidak rusak; responsnya membawa `"notice":"legacy-ea-deprecated; migrate to integrations"` dan
jurnalnya dicatat `source: EA_LEGACY` supaya bisa dibedakan saat audit/rekonsiliasi.

## Posisi sekarang: opsi privasi "zero-password" untuk power user

Ini **BUKAN** default dan **BUKAN** fallback otomatis. Kegunaan sahnya justru kebalikan dari
jalur cloud: EA mengirim data dari terminal user, sehingga **tidak ada kredensial apa pun yang
disimpan SAKU** (preseden privasi FX Blue). Kalau kamu tidak mau investor password-mu mampir ke
middleware cloud — pakai ini. Broker/prop-firm yang tidak didukung middleware sebaiknya tetap
memakai **import statement/CSV** (fallback resmi, tanpa EA, tanpa vendor).

## Langkah enable (ringkas)

1. Salin `SakuBridge.mq5` ke `MQL5/Experts/` pada data folder terminal MT5 kamu.
2. MetaEditor → buka file → **Compile** (harus `0 errors`). CI/sandbox tidak bisa mengompilasi MQL5.
3. Di terminal: Tools → Options → Expert Advisors → **Allow WebRequest for listed URL** →
   tambahkan base URL API SAKU kamu (mis. `https://api.domainmu.com`).
4. Tempelkan EA ke chart **demo/paper** dulu (input `InpSakuApiBase` = `…/api/v1`,
   `InpAccountToken` = token bridging-mu, `InpSyncInterval` ≥ 5 detik).
5. Verifikasi: `GET /api/v1/trading/state` menampilkan akunmu; jurnal baru muncul ber-badge
   `EA_LEGACY`.

## Batas yang tidak dilonggarkan

- EA ini hanya membaca akun & riwayat; tidak ada satu pun perintah order di dalamnya.
- EA tidak pernah mengirim password apa pun — kredensial tidak diperlukan (itu justru poinnya).
- Saldo tidak pernah ditulis langsung: data EA masuk lewat pipeline jurnal yang sama
  (`POST /trading/sync` → jurnal `TRADING_PROFIT` + dedupe `processed_deals`).
- Kalau kamu bermigrasi ke konektor cloud, matikan/lepaskan EA dulu supaya tidak ada dua
  produsen entri untuk akun yang sama (dedupe akan menahan duplikat ticket, tapi sumbernya
  jadi kabur).
