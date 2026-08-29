# @saku/api-core — modul MT5 (connectors) & ledger

Route + env untuk jalur **tanpa-EA** (ADR-022: `docs/22_MT5_INVESTOR_SYNC_ADR.md`).
Doktrin yang dijaga kode, bukan niat: **tidak ada** endpoint yang menulis saldo; angka
hanya masuk sebagai jurnal double-entry berimbang, dan snapshot equity/balance adalah
tampilan belaka.

## Env (MT5 connector)

| Variabel | Default | Fungsi |
|---|---|---|
| `DATABASE_URL` | — (fallback in-memory + loud warn) | Pilih adapter Prisma: `processed_deals`, `integration_accounts`, `account_state_cache` jadi persisten |
| `ENCRYPTION_MASTER_KEY` | wajib di produksi; dev = derived key + warning | Kunci AES-256-GCM untuk investor password (disimpan `iv:tag:ciphertext` base64) |
| `MT5_CLOUD_ENABLED` | `false` | **Sakelar utama.** `false` ⇒ `NullProvider`: scheduler no-op, nol panggilan keluar, `POST /integrations/:id/test` jawab pesan panduan |
| `MT5_PROVIDER` | `metaapi` | `metaapi` \| `mock` \| `null`. `mock` = fixtures deterministik (3 deal, 2 snapshot) untuk test/demo tanpa vendor |
| `MT5_SNAPSHOT_INTERVAL_SEC` | `120` | Periode snapshot → `account_state_cache` (display). `0` = timer mati (sync manual tetap bisa) |
| `MT5_DEALS_INTERVAL_MIN` | `10` | Periode tarik deal → pipeline `/trading/sync` (jurnal + dedupe). `0` = timer mati |
| `MT5_FIRST_SYNC_DAYS` | `30` | Window tarik pertama per koneksi (airmata di-watermark; keamanan sebenarnya = `processed_deals`) |
| `METAAPI_TOKEN` | — | Token REST MetaApi (diisi pemilik akun via deployment, **jangan** lewat chat/repo) |
| `METAAPI_REGION` | `new-york` | Region MetaApi; membentuk base URL `mt-client-api-v1.{region}.agiliumtrade.ai` |
| `METAAPI_CLIENT_URL` / `METAAPI_PROVISIONING_URL` | URL resmi MetaApi | Override bila self-hosted MetaApi |
| `METAAPI_TIMEOUT_MS` | `15000` | Abort tiap panggilan vendor |
| `SAKU_SESSION_TTL_SEC` | `604800` (7 hari) | TTL sesi login (ADR-023); min 60. Restart proses = semua sesi gugur (store in-memory fase 1) |
| `SAKU_AUTH_ENFORCE` | `false` | `true` ⇒ endpoint ber-`@OwnerScoped()` (mis. `/integrations`) menolak request tanpa header `X-Saku-Session` valid dengan 401. Default off agar CI/tes lokal jalan tanpa login |

## Kontrak `Connector` (M6)

Semua sumber angka eksternal memenuhi satu interface
(`src/modules/connectors/connector.ts`): `type`, `credentialRef`, `syncIntervalSec`, `normalizer`.
Yang aktif sekarang `MT5_CLOUD` (pull, kredensial terenkripsi) dan `MT5_STATEMENT`
(upload, tanpa kredensial, `syncIntervalSec = 0`). Menambah bank/crypto/e-wallet/aset
fisik/hutang = satu class + satu entri di `connectors/registry.ts` — **tanpa** endpoint baru
dan tanpa jalur tulis saldo. Cadence `MT5_*` dibaca dari `Mt5CloudConnector`, jadi scheduler,
UI, dan CI tidak bisa beda angka (dijaga `connectors.spec.ts`).

## Routes

| Route | Perilaku |
|---|---|
| `POST /api/v1/auth/request-otp` · `verify-otp` | Fase dev: OTP di-log console (delivery mock, ADR-023 §2.5). `verify-otp` sukses menerbitkan **sesi nyata**: `sakuSession` (token acak 32-byte; server simpan SHA-256 saja) + `sakuSessionExpiresAt`; kirim kembali sebagai header `X-Saku-Session` |
| `GET /api/v1/connectors` | Registry Connector M6, read-only: `type/label/status/direction/syncIntervalSec/credentialRef/normalizer`. `credentialRef` = kebijakan penyimpanan (kind/field/mode/algorithm) — **bukan** materi rahasia; tidak ada endpoint tulis (registry = kode) |
| `GET /api/v1/integrations` · `GET /:id` | Daftar koneksi; **tidak pernah** mengembalikan `credentialCipher`/password. Field publik: `hasCredential`, `credentialMode: investor-read-only`, `credentialAlgorithm: AES-256-GCM`. `ownerId` = hasil OwnerGuard (sesi → owner; tanpa sesi → `user-local`) — `?ownerId=`/`body.ownerId` dari klien **diabaikan** (ADR-023) |
| `POST /api/v1/integrations` | `label, login, server, port?, investor_password` → 400 bila `master_password`/`trader_password`/`credentialCipher` kiriman klien; copy error selalu menyebut "investor password (read-only)" |
| `PATCH /api/v1/integrations/:id` | Rotasi kredensial (`investor_password` baru), toggle `enabled`, ubah label/server/port |
| `DELETE /api/v1/integrations/:id` | Putuskan koneksi (baris + cache state dihapus) + anjuran rotasi password di broker |
| `POST /api/v1/integrations/:id/test` | Probe read-only via provider; failure = satu kalimat actionable, **bukan** stack trace; `supported:false` ⇒ sarankan import statement |
| `GET /api/v1/trading/account-state` | Snapshot display terakhir + umur data + daftar koneksi. Saat flag off: `enabled:false`, `state:null` (UI tidak boleh error merah) |
| `POST /api/v1/trading/sync/now` | Satu pass connector (snapshot → cache, deals → pipeline jurnal). No-op dengan `provider:'null'` saat flag off |
| `POST /api/v1/trading/sync` | Ingest manual/API; menerima dialek bridge v1.1 **dan** provider (ADR-022). Header `X-Saku-Client: saku-bridge` = EA lama → jurnal `source: EA_LEGACY` + `"notice":"legacy-ea-deprecated; migrate to integrations"` |
| `GET /api/v1/trading/state` | State ingest terakhir + jumlah `processed_deals` |

## Alur data

```
provider.getSnapshot() ─► account_state_cache ─► GET /trading/account-state  (DISPLAY ONLY)
provider.getDeals(since) ─► normalize ─► TradingService.ingestNormalizedDeals
                                   └─► LedgerService.postBrokerDeal
                                         └─► [tx] journal + processed_deals (UNIQUE(account,ticket))
POST /trading/sync (bridge/EA lama/import) ──────────────┘  (satu pipeline yang sama)
```

## Aturan tambahan

- EA `SakuBridge.mq5` sudah **deprecated** → `services/deprecated/mt5-ea/` (M4). Jalur default:
  connector cloud dengan investor password, rekonsiliasi lewat import statement.
- Log API disterilkan `RedactionInterceptor` + `installConsoleRedaction()` (field
  `*password*`, `*token*`, `*cipher*`, `*secret*`, `*apikey*`, `authorization`, `cookie`).
