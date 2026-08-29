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
2. **MT5 Sync Disconnection Alert**:  
   Check `SakuBridge.mq5` Expert Advisor logs in MT5 Terminal -> Experts tab. Ensure WebRequest URL `http://your-api-domain.com/api/v1/trading/sync` is permitted in MT5 Tools -> Options -> Expert Advisors -> Allow WebRequest for listed URL.
