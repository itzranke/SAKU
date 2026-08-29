# ADR-023: Auth Session & Kepemilikan Data (`ownerId`)

> Status: **PROPOSED** → naik ke **IMPLEMENTED** saat PR implementasinya merge.
> Prasyarat sejarah: ADR-022 (MT5 sync tanpa-EA) IMPLEMENTED; fase sekarang = **single-user**.
> Aturan yang tidak boleh dilanggar desain ini: tanpa endpoint tulis saldo; tidak ada respons
> yang membawa materi rahasia; fallback in-memory tetap; kontrak lama utuh.

## 1) Konteks

- `integration_accounts.ownerId` masih konstanta `"user-local"`: default di `schema.prisma`,
  fallback di kedua repository (Prisma + in-memory), dan fallback `body.ownerId ?? 'user-local'`
  di `integrations.service.ts`.
- Module `auth` baru sejauh ini mock: OTP di-log ke console, `verify-otp` membalas token
  string `saku_jwt_mock_token_…` yang **tidak pernah divalidasi server**.
- API saat ini tanpa guard; browser hanya bicara ke `/api/proxy/*` (rewrite Next → `/api/v1/*`).
- Faktanya `ownerId` hari ini **dikendalikan klien**: siapa pun yang POST `/integrations` dengan
  `body.ownerId: "orang-lain"` membuat baris di owner itu. Di fase single-user ini tidak masalah
  (semua orang = pemilik), tetapi ini lubang desain yang harus ditutup SEBELUM fase multi-pemilik.
- Klien yang ada (web + CI) **tidak pernah mengirim** `ownerId` — web hanya menampilkannya.

## 2) Keputusan (fase 1 — server-side session, default permissive)

1. **Sesi nyata, disimpan server.** `POST /auth/verify-otp` (sukses) menerbitkan token acak
   32-byte (base64url). Server hanya menyimpan **SHA-256(token)** → `{ownerId, expiresAt}`
   (Map in-memory; TTL default 7 hari, env `SAKU_SESSION_TTL_SEC`). Respons **menambah**
   `sessionToken` + `sessionExpiresAt`; field `accessToken` mock lama **tetap** dikirim
   (kontrak lama utuh, boleh deprecated).
2. **Resolusi `ownerId` per request (OwnerGuard aditif).** Guard global membaca header
   `X-Saku-Session` (dan cookie `saku_session` bila ada), memvalidasi hash-nya:
   - token valid → `req.ownerId = session.ownerId`;
   - tanpa token / token kadaluarsa / token asing → `req.ownerId = 'user-local'`
     (nilai lama — semua tes, CI, dan kontrak eksisting tidak berubah);
   - `SAKU_AUTH_ENFORCE=true` (default **false**) → request endpoint owner-scoped tanpa sesi
     valid ditolak **401**. Default off karena CI, unit test, dan repro lokal harus tetap jalan
     tanpa login.
3. **`ownerId` tidak pernah lagi berasal dari klien.** `body.ownerId` pada POST/PATCH dan
   `?ownerId=` pada GET **diabaikan** (field deprecated — bukan error, agar nol risiko break):
   nilai yang dipakai selalu hasil resolusi guard. Semua klien hari ini identik perilakunya
   karena memang tidak mengirim field itu. Kebijakan ini yang menutup lubang di §1.
4. **Tanpa migrasi DB di fase ini.** Store sesi in-memory: restart proses = semua sesi gugur
   (efek: user login ulang — diterima untuk fase 1, didokumentasikan di sini). Tabel
   `auth_sessions` (token hash, ownerId, expiresAt) = fase 2, bila persistensi sesi benar-benar
   dibutuhkan — via `prisma db execute` + `IF NOT EXISTS`, sesuai kebijakan migrasi yang berlaku.
5. **OTP delivery tetap jujur-mock** (log dev). ADR ini tentang **sesi & kepemilikan**, bukan
   kanal pengiriman OTP; mengganti kanal (email/WA/DSO) tidak boleh menyentuh desain sesi ini.
6. **Non-goals (sengaja tidak ada):** JWT/library eksternal, multi-tenant, RBAC, refresh token,
   rotasi token. Cookie `HttpOnly` via Next proxy = keputusan fase UI berikutnya; header
   `X-Saku-Session` cukup untuk fase ini dan tidak mengekspos apa pun ke pihak ketiga karena
   browser hanya memakai proxy relatif.

## 3) Konsekuensi

- `verify-otp` jadi satu-satunya penerbit identitas; token yang beredar tidak membawa payload
  (bukan JWT) — tidak bisa dibaca/dipalsukan klien, dan dicabut otomatis saat restart/TTL.
- `OwnerGuard` murah (satu lookup Map per request) dan siap dipakai endpoint owner-scoped
  berikutnya (`account_state_cache`, jurnal per-anggota rumah tangga, dst.).
- Risiko yang sengaja ditunda: enforcement (`SAKU_AUTH_ENFORCE=true`) belum dinyalakan di
  deployment mana pun; dokumentasi deployment akan menyebutnya saat fase multi-pemilik dimulai.

## 4) Verifikasi yang diwajibkan PR implementasi

- vitest: terbitkan sesi → validasi OK; token salah/kadaluarsa → fallback `user-local`;
  `SAKU_AUTH_ENFORCE=true` tanpa sesi → 401; `body.ownerId` diabaikan (dua arah: beda nilai
  tetap tersimpan di owner konteks); token **tidak** muncul utuh di log (hash saja).
- smoke HTTP: `verify-otp` → 201 berisi `sessionToken`; `GET /integrations` dengan
  `X-Saku-Session` memakai owner sesi; tanpa header → perilaku lama persis; enforce=true tanpa
  sesi → 401 ramah.
- Standar penuh: `tsc --noEmit`, test, build, repro M2 (201/400/201 `ok:false`), kontrak lama
  (`/ledger/snapshot`, `/trading/sync` dialek bridge, flag off provider null) tak berubah.
