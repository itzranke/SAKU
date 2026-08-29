# ⚡ SAKU ADVANCED DATA PIPELINES, OTP EXPONENTIAL BACKOFF, & RETENTION POLICIES

---

## EXECUTIVE SUMMARY
Based on real-world engineering precedents and user feedback, SAKU incorporates **3 Critical System Refinements**:
1. **Decoupled Dual Ingestion Pipelines** (Offline Client Queue vs. Server MT5 Stream).
2. **Progressive Exponential Backoff OTP Cooldown** (Industry-standard OTP spam protection).
3. **Hot/Warm/Cold Data Retention & Aggregation Policy** (Database scalability for 100k+ active users).

---

## 1. DECOUPLED DUAL INGESTION PIPELINES

Offline cash tracking and live MT5 broker streams belong to fundamentally separate execution pipelines:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PIPELINE A: OFFLINE CLIENT QUEUE (Kas Tunai / Local Input)                  │
│ └── Local Device Storage (SQLite/IndexedDB) ──► Asynchronous Sync on Network │
├─────────────────────────────────────────────────────────────────────────────┤
│ PIPELINE B: SERVER BROKER STREAM (MT5 Live EA Bridge)                      │
│ └── Server WebSocket / ZMQ Socket ──► Real-Time Server Journal Posting       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. OTP EXPONENTIAL BACKOFF & DAILY HARD CAP (SECURITY)

To prevent OTP abuse while matching industry precedents (WhatsApp, GoJek, Telegram):

$$\text{Cooldown}(n) = \min(30 \text{s} \times 2^{n-1}, 24 \text{ hours})$$

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PROGRESSIVE OTP COOLDOWN MATRIX                                             │
├───────────────────┬─────────────────────────┬───────────────────────────────┤
│ Request Number    │ Resend Cooldown Delay   │ System Action                 │
├───────────────────┼─────────────────────────┼───────────────────────────────┤
│ Request 1         │ 0 seconds (60s timer)   │ Sent Instantly                │
│ Request 2         │ 30 seconds delay        │ Sent after 30s                │
│ Request 3         │ 2 minutes delay         │ Sent after 2m                 │
│ Request 4         │ 15 minutes delay        │ Sent after 15m                │
│ Request 5+        │ 24-Hour Lockout         │ Blocked until Next Day        │
└───────────────────┴─────────────────────────┴───────────────────────────────┘
```
* **Daily Hard Cap**: Maximum 5 OTP requests per user/phone number per 24 hours.

---

## 3. DATA RETENTION & HISTORICAL AGGREGATION POLICY (SCALABILITY)

To maintain ultra-fast database performance when user base reaches 100,000+ active users:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAKU 3-TIER DATA LIFECYCLE                                                  │
├───────────────────┬─────────────────────────┬───────────────────────────────┤
│ Storage Tier      │ Date Range              │ Storage Mechanism             │
├───────────────────┼─────────────────────────┼───────────────────────────────┤
│ 1. HOT ACTIVE     │ 0 - 12 Months           │ Raw Micro-Transactions        │
│    (Primary DB)   │ (Current Year)          │ (PostgreSQL Main Table)       │
├───────────────────┼─────────────────────────┼───────────────────────────────┤
│ 2. WARM SUMMARY   │ 12 - 36 Months          │ Condensed Monthly Snapshots   │
│    (Time-Series)  │ (1 to 3 Years)          │ (TimescaleDB Hypertables)     │
├───────────────────┼─────────────────────────┼───────────────────────────────┤
│ 3. COLD ARCHIVE   │ 36+ Months              │ Encrypted `.saku_archive` ZIP │
│    (User Backup)  │ (> 3 Years)             │ Offloaded from Primary DB     │
└───────────────────┴─────────────────────────┴───────────────────────────────┘
```

* **Outcome**: Keeps the primary database small, lean, and sub-millisecond fast forever regardless of user growth.

---
*SAKU Advanced Data Pipelines, OTP Exponential Backoff & Retention Policies complete.*
