# ⚡ SAKU LIGHTWEIGHT SINGLE-PANE ARCHITECTURE
## DEEP THINK & PONYTAIL PIVOT: CENTRALIZED VIEW & RECORDING OS

---

### EXECUTIVE SUMMARY
Applying the **Ponytail** (Radical Simplification & YAGNI) filter and the **Council Penasehat** (First Principles) review, SAKU pivots from a bloated enterprise calculator to a **Lightning-Fast Centralized View & Recording OS (Single Pane of Glass)**.

By focusing strictly on **Centralized Consolidation, Clean Recording, and Unified Viewing**, SAKU eliminates 80% of backend complexity while delivering 95% of the user value.

---

## 1. PONYTAIL & COUNCIL DEEP-THINK EVALUATION

```
┌─────────────────────────────────────────────────────────────────────────┐
│ THE PONYTAIL PIVOT                                                      │
├───────────────────────────────────┬─────────────────────────────────────┤
│ BEFORE (HEAVY CALCULATOR):        │ AFTER (LIGHTWEIGHT SINGLE PANE):    │
│ ❌ Real-time VaR / Correlation    │ ✅ Centralized Net Worth & Cashflow │
│ ❌ EIR Bond Yield Amortization    │ ✅ Simple Holding & Balance View    │
│ ❌ Multi-mode Trading Engine      │ ✅ MT5 Equity & Closed Deal Reader  │
│ ❌ Wasm Local PDF Parsing         │ ✅ Visual Staging CSV/PDF View      │
│ ❌ Complex Math Workers           │ ✅ Fast 1-Tap & Bot Ingestion       │
└───────────────────────────────────┴─────────────────────────────────────┘
```

### 1.1 First Principles Question
* **Why does a user open SAKU?**
  - They do NOT open SAKU to run complex financial calculus or trade algorithmic bots.
  - They open SAKU to answer **"Where is my money, how much do I have right now, and what came in or went out today?"**

---

## 2. THE 5 PILLARS OF LIGHTWEIGHT SAKU

1. **Unified Net Worth View (Single Pane of Glass)**:
   - One master card showing: Net Worth = (Bank + E-Wallet + Cash + Investments + MT5 Equity) - (Hutang + Angsuran KPR).
2. **Unified Transaction Stream (Jurnal Tunggal)**:
   - One timeline for ALL money movements (Kasir offline, QRIS, Transfer, Bayar KPR, Profit MT5).
3. **Frictionless Fast Ingestion**:
   - 1-Tap Modal, WhatsApp/Telegram Bot ("Kopi 25k BCA"), or CSV Import.
4. **Read-Only MT5 Equity & Journal Viewer**:
   - Default: **cloud connector read-only** (login + investor password + server di Settings →
     Integrations). SAKU menarik Balance/Equity/Closed Deals dari sisi server — terminal user
     tidak perlu menyala, tidak ada yang diinstal. Equity = tampilan; hanya closed deals yang
     melahirkan jurnal. Fallback resmi: import statement/CSV.
   - Lightweight MQL5 EA (`services/deprecated/mt5-ea/`) dipertahankan sebagai **opsi privasi
     zero-password** untuk power user — legacy, lihat ADR-022.
5. **Simple Loan & Debt Tracker**:
   - Track remaining principal balance for KPR/Motor with a 1-tap "Bayar Angsuran" button.

---

## 3. LIGHTWEIGHT REFINED DATA MODEL

```sql
-- SAKU LIGHTWEIGHT SCHEMA

-- 1. Accounts (Bank, Cash, E-Wallet, Debt, MT5 Broker)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'CASH', 'BANK', 'EWALLET', 'DEBT', 'INVESTMENT', 'TRADING'
    balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR'
);

-- 2. Single Unified Transactions Stream
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    description TEXT NOT NULL,
    amount NUMERIC(20, 4) NOT NULL, -- Positive = Income/Inflow, Negative = Expense/Outflow
    category VARCHAR(64) NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---
*SAKU Lightweight Single-Pane Architecture documentation complete.*
