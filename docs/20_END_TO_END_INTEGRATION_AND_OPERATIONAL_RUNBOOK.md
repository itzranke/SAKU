# 📖 SAKU — END-TO-END INTEGRATION & OPERATIONAL RUNBOOK

> **Document Purpose**: Production Deployment, Maintenance, & Operations Runbook  
> **Repository**: `itzranke/SAKU`

---

## 🎯 PRODUCTION DEPLOYMENT GUIDE

### 1. Web Application Deployment (Vercel / Cloudflare WAF)
- Root Directory: `apps/web`
- Build Command: `pnpm --filter @saku/web build`
- Output Directory: `apps/web/out` (Static Export) / `.next` (Node Server)

### 2. NestJS API Core Deployment (Railway / Docker Container)
- Environment Variables required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- Build Command: `pnpm --filter @saku/api-core build`
- Start Command: `node services/api-core/dist/main.js`

### 3. Desktop Release Building (Tauri 2.0 Rust)
```bash
# Windows Executable Build (.exe)
pnpm --filter @saku/desktop tauri build --target x86_64-pc-windows-msvc

# macOS Bundle Build (.dmg)
pnpm --filter @saku/desktop tauri build --target x86_64-apple-darwin
```

### 4. Mobile Release Building (Expo EAS)
```bash
# Android APK Build
eas build --platform android --profile preview

# iOS TestFlight / IPA Build
eas build --platform ios --profile production
```

---

## 🔒 INCIDENT RESPONSE & EMERGENCY RUNBOOK

1. **Database Hypertable Compression Failure**:  
   Run `SELECT compress_chunk(i) FROM show_chunks('ledger_entries') i;` in PostgreSQL TimescaleDB console.
2. **MT5 Sync Stalled / Connector Down** (jalur default pasca ADR-022 — tanpa EA):
   Cek `GET /api/v1/trading/account-state` (`enabled`, umur data di `state.updatedAt`) dan
   log API `Mt5Bootstrap`/`SyncSchedulerService`. Penyebab umum: `MT5_CLOUD_ENABLED=false`,
   `METAAPI_TOKEN` kedaluwarsa/kuota habis, atau investor password diganti di broker
   (PUTAR ulang & simpan lagi lewat Settings -> Integrations -> PATCH). Data yang tertinggal
   ditutup otomatis oleh pass berikutnya (dedupe `processed_deals`), dan ground-truth-nya
   **import statement/CSV MT5**.
   Installasi EA lama (legacy, lihat ADR-022): periksa log `SakuBridge.mq5` di MT5 Terminal ->
   Experts tab dan whitelist WebRequest `http://your-api-domain.com/api/v1/trading/sync`
   di MT5 Tools -> Options -> Expert Advisors.
