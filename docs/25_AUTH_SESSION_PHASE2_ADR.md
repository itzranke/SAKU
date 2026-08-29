# ADR-024: Auth Sesi Fase 2 — Persistensi Sesi & Cookie HttpOnly

> Status: **PROPOSED** (menunggu implementasi bertahap; dokumen ini disetujui pemilik pada sesi
> 2026-08-30 bagian 3).
> Memperluas: **ADR-023** (Auth Session & Kepemilikan Data, IMPLEMENTED fase 1). ADR-023 tidak
> dibatalkan — seluruh keputusannya tetap berlaku; ADR ini hanya menambah lapisan di atasnya.
> Batas yang tidak boleh dilanggar: tanpa endpoint tulis saldo; tidak ada respons membawa materi
> rahasia; fallback in-memory tetap ada; kontrak lama utuh.

## 1) Konteks (apa yang sudah ada, apa yang menyakitkan)

Fase 1 (ADR-023) sudah memberi:

- `SessionService`: token acak 32-byte base64url, server menyimpan **hanya** SHA-256(token) →
  `{ownerId, expiresAt}` dalam `Map` in-memory, TTL `SAKU_SESSION_TTL_SEC` (default 7 hari);
- `OwnerGuard` global: sesi valid → `req.ownerId`; tanpa sesi → `'user-local'`;
- `SAKU_AUTH_ENFORCE=true` (default false) → route `@OwnerScoped()` tanpa sesi = 401 ramah;
- field kawat **`sakuSession`** (bukan `sessionToken`, yang akan dipotong jaring redaksi).

Tiga keterbatasan yang tersisa, semuanya sudah dicatat sebagai utang sadar:

1. **Restart = semua sesi gugur.** Setiap deploy/redeploy (dan itu sering, mis. saat mengisi
   `METAAPI_TOKEN`) memaksa login ulang. Diterima di fase 1, mengganggu di pemakaian nyata.
2. **Token hidup di JavaScript klien.** Belum ada halaman login web; ketika ada, menaruh
   `sakuSession` di `localStorage`/Redux membuatnya terbaca skrip apa pun — persis yang dihindari
   doktrin SAKU untuk materi rahasia.
3. **Enforcement belum pernah dinyalakan** di deployment mana pun, jadi jalur 401 belum teruji
   dalam kondisi produksi.

## 2) Keputusan

### 2.1 Persistensi sesi di tabel `auth_sessions`

- Tabel baru `auth_sessions`: `tokenHash` (PK, TEXT — SHA-256 hex), `ownerId` TEXT,
  `expiresAt` TIMESTAMP(3), `createdAt` TIMESTAMP(3) default now, `lastSeenAt` TIMESTAMP(3) null.
- **Token mentah tidak pernah disimpan**, sama seperti fase 1. Yang berpindah dari memori ke DB
  hanyalah hash — kompromi keamanannya nol, keuntungannya sesi selamat dari restart.
- **Migrasi wajib lewat `prisma db execute` + `CREATE TABLE IF NOT EXISTS`**, mengikuti kebijakan
  migrasi yang berlaku (`migrate dev` / `migrate deploy` **dilarang** di repo ini). Disertai
  `verify.sql` bergaya `IF NOT EXISTS` seperti migrasi M1–M3.
- **Fallback in-memory tetap wajib**: bila `DATABASE_URL` tidak ada/mati, `SessionService` memakai
  `Map` persis seperti hari ini. Unit test bergantung pada jalur ini dan tidak boleh berubah.
  Pola yang dipakai = pola repository ganda yang sudah ada di modul ledger/integrations.
- Pembersihan: sesi kadaluarsa dihapus *lazily* saat lookup (seperti sekarang), ditambah sapu
  bersih oportunistik saat penerbitan sesi baru. Tidak ada cron baru.

### 2.2 Cookie `HttpOnly` lewat proxy Next

- Browser **tidak lagi** memegang token di JavaScript. Alur:
  1. Halaman login web POST ke `/api/proxy/auth/verify-otp` (relatif — tetap jalur proxy);
  2. Route handler Next membaca `sakuSession` dari respons API, lalu men-*set* cookie
     `saku_session` dengan `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<ttl>`;
  3. Permintaan berikutnya: proxy Next membaca cookie itu dan meneruskannya sebagai header
     `X-Saku-Session` ke api-core. Cookie tidak pernah dibaca oleh kode klien.
- **API tetap menerima header `X-Saku-Session` sebagai kontrak utama.** Cookie adalah urusan
  lapisan web; api-core tidak diwajibkan tahu-menahu soal cookie (kalaupun dukungan cookie
  dibaca guard, sifatnya tambahan dan opsional). Ini menjaga CI, curl, dan smoke test tetap
  identik dengan hari ini.
- Logout = route Next yang menghapus cookie + `POST /auth/logout` (baru, mencabut hash sesi di
  server). Logout tanpa sesi valid tetap `200`/`204` (idempoten, tidak membocorkan keberadaan token).

### 2.3 UI web mengirim identitas

- Halaman login (identifier → OTP → verify) memakai jalur proxy relatif; tidak ada URL absolut,
  tidak ada `localhost` di kode klien.
- Karena kredensial berjalan sebagai cookie, klien RTK Query cukup memakai
  `credentials: 'include'`; **tidak ada** kode klien yang menyentuh nilai token.
- Kalau sesi mati (401 dari route `@OwnerScoped()`), UI mengarahkan ke halaman login dengan
  pesan ramah — bukan layar error mentah.

### 2.4 Menyalakan `SAKU_AUTH_ENFORCE=true`

- Tetap **default `false`**. Dinyalakan hanya di deployment produksi pemilik, dan hanya **setelah**
  §2.1–§2.3 merge dan halaman login berfungsi. Urutan ini tidak boleh dibalik: menyalakan enforce
  sebelum ada UI login akan mengunci pemilik dari aplikasinya sendiri.
- CI dan unit test tidak pernah menyalakannya kecuali dalam kasus uji yang memang menguji 401.

## 3) Yang sengaja TIDAK dilakukan (non-goals)

- ❌ JWT / library auth pihak ketiga — token buram tanpa payload sudah cukup dan tidak bisa dipalsukan.
- ❌ Refresh token, rotasi otomatis, "remember device", RBAC, multi-tenant.
- ❌ Mengubah kanal OTP (masih jujur-mock via log). Kanal pengiriman adalah keputusan terpisah dan
  tidak boleh menyentuh desain sesi.
- ❌ Melemahkan `RedactionInterceptor` sedikit pun. Nama field kawat tetap `sakuSession`.
- ❌ `prisma migrate dev|deploy` dalam bentuk apa pun.

## 4) Konsekuensi & risiko

| Konsekuensi | Sikap |
|---|---|
| Sesi selamat dari restart/deploy | ✅ tujuan utama |
| Token tak terjangkau JavaScript (HttpOnly) | ✅ menutup kelas XSS-mencuri-token |
| Ada tabel baru → satu jalur migrasi lagi | Dikelola: `db execute` + `IF NOT EXISTS` + `verify.sql` |
| Cookie berarti pertimbangan CSRF | `SameSite=Lax` + operasi tulis lewat proxy same-origin; POST lintas situs tidak membawa cookie. Bila kelak ada form lintas-origin, barulah token CSRF dibahas di ADR tersendiri. |
| Dua sumber sesi (DB & memori) | Satu antarmuka `SessionStore`, dua implementasi — pola repository yang sudah dipakai di repo |
| Sesi lama (fase 1) hilang saat deploy fase 2 | Diterima: login ulang sekali |

## 5) Rencana pelaksanaan (satu PR per potong, berurutan)

1. **PR-1 (dokumen)** — ADR ini. *Tanpa kode.*
2. **PR-2 (persistensi)** — `SessionStore` interface + `InMemorySessionStore` (perilaku hari ini,
   default) + `PrismaSessionStore`; migrasi `auth_sessions` (`db execute`, `IF NOT EXISTS`) +
   `verify.sql`; model Prisma; `POST /auth/logout`. Unit test bertambah, yang lama **tidak** berubah.
3. **PR-3 (web)** — route proxy set/clear cookie `HttpOnly`, halaman login, penerusan
   cookie→header, penanganan 401 ramah.
4. **PR-4 (operasional)** — panduan browser-only menyalakan `SAKU_AUTH_ENFORCE=true` di produksi,
   termasuk cara mematikannya kembali bila terkunci.

Setiap potong: `tsc --noEmit` bersih, vitest hijau, `nest build` OK, smoke HTTP (termasuk instance
`SAKU_AUTH_ENFORCE=true`), lalu PR → CI hijau → merge.

## 6) Verifikasi yang diwajibkan tiap PR implementasi

- Tanpa `DATABASE_URL`: seluruh perilaku fase 1 **identik** (sesi in-memory, 99+ tes hijau).
- Dengan `DATABASE_URL`: sesi bertahan melintasi restart proses; `verify.sql` lulus; tidak ada
  `migrate deploy` yang dipanggil di mana pun.
- `sakuSession` tetap lolos redaksi; nama field apa pun yang mengandung `token` tetap dipotong
  (uji dua arah).
- Tidak ada token mentah di log server (grep = 0 hit).
- Kontrak lama utuh: `GET /ledger/snapshot`, `POST /ledger/transaction`, `POST /ledger/journal`
  400 saat unbalanced, `POST /trading/sync` dialek bridge v1.1 (+ `X-Saku-Client: saku-bridge` ⇒
  `EA_LEGACY`), `GET /api/v1/connectors`, `sakuSession` di `verify-otp`.
