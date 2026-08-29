# 📄 SAKU — PRODUCT REQUIREMENT DOCUMENT (PRD.md)

> **Document Status**: Production Baseline v1.0  
> **Product Name**: SAKU (Personal Financial & Active Trading Operating System)  
> **Repository**: `itzranke/SAKU`

---

## 1. PRODUCT VISION & MISSION

* **Vision**: To be the world's premier unified personal financial operating system that consolidates everyday offline micro-purchases, digital bank/e-wallet cashflow, long-term multi-asset wealth portfolios, and high-frequency MetaTrader 5 trading accounts into a single, lightning-fast "Single Pane of Glass" console.
* **Mission**: Eliminate financial fragmentation and math errors by providing an immutable double-entry ledger core, frictionless ingestion channels, and privacy-first non-custodial security.

---

## 2. TARGET USER PERSONAS

1. **The Total Beginner (*Pengguna Baru yang Tidak Tahu Apa-apa*)**: Needs jargon-free UI ("Pemasukan (+)" / "Pengeluaran (-)") and an automated out-of-the-box roadmap (SONZI Default Engine).
2. **The Informed Intermediate (*Middle-Class Wealth Builder*)**: Manages 3+ bank accounts, e-wallets, PayLater, and KPR installments. Needs unified Net Worth clarity.
3. **The Active Trader / Quant (*Expert MT5 Trader*)**: Trades Forex/Gold on MT5, holds crypto/stocks, and requires double-entry accounting precision with MQL5 live equity sync.
4. **The Privacy Minimalist (*Security Paranoiac*)**: Demands non-custodial local-first bridge architecture and zero-trust envelope encryption.

---

## 3. CORE FUNCTIONAL REQUIREMENTS

### 3.1 Immutable Double-Entry Ledger Engine
* Every transaction MUST balance across Debit and Credit legs:
  $$\sum (\text{Debits} \times \text{ExchangeRate}) - \sum (\text{Credits} \times \text{ExchangeRate}) = 0$$
* Support for multi-currency conversion with explicit logging of bank/broker FX conversion spreads (`Expense:FX Conversion Fees`).

### 3.2 12 Full-Spectrum Financial Touchpoints
* **Offline**: Cash in Hand, Arisan/Community Pockets, Informal Debts/Piutang, Gold/Logam Mulia, Warranty Vault, Physical Property/Vehicles.
* **Online**: Recurring Subscriptions, Annual Tax Reminders (STNK/PBB), PayLater/Credit Cards, Poin Rewards, Digital Investments (Saham/Crypto/SBN), Active MT5 Trading.

### 3.3 Frictionless Fast Ingestion
* 1-Tap Fast Transaction Modal in Web/Mobile.
* Telegram/WhatsApp Assistant Bot (`Kopi 25k BCA`) with cryptographic user verification and deterministic grammar sanitization.
* Staging sandbox modal for PDF/CSV e-Statement imports with automated rule-matching categories.

### 3.4 Read-Only MT5 Local EA Bridge *(legacy — lihat ADR-022; jalur default kini konektor cloud investor-password, EA tetap tersedia sebagai opsi privasi zero-password)*
* MQL5 Expert Advisor (`SakuBridge.mq5`) pushing read-only account balance, floating equity, margin, and closed trade deals over encrypted WebSockets/HTTPS.
* Event-driven `OnTradeTransaction()` execution to eliminate MT5 terminal CPU/RAM lag.

### 3.5 SONZI Framework & Risk-Profile Presets
* Pre-configured with **SONZI as the Built-in Default Engine**:
  - *Stage 1*: 50% Needs / 30% Wants / 20% Emergency Fund (Locked investment alerts until 6-month buffer met).
  - *Stage 2*: 40% Needs / 30% Wants / 20% Investment (Productive Assets, Securities, Crypto, Buffer) / 10% Social (Knowledge, Connections, Giving).
  - *Stage 3*: FIRE 4% Trinity Rule Calculator.
* Risk Presets: Conservative, Moderate, Aggressive, and Custom Mode.

### 3.6 Hybrid Household Workspace Sharing
* Shared Household Accounts (joint bank, groceries, KPR, children) visible to both spouses.
* Encrypted Individual Accounts visible only to the account owner.

### 3.7 Localized Tax Engine (Indonesia & Global)
* Indonesia: PPh Final 0.1% IDX stock sales, PPh Final 0.1% Crypto (PMK 68), PPh Final 10% Dividends (PP 55), PPh Final 10% SBN interest (PP 91).
* Global: 30% US Dividend Withholding Tax (W-8BEN standard).

---

## 4. NON-FUNCTIONAL REQUIREMENTS & COMPLIANCE

* **Performance**: Sub-second dashboard load time (< 1s).
* **Data Retention**: 3-Tier Lifecycle (Hot: 0-12 months raw; Warm: 12-36 months monthly snapshots; Cold: 36+ months encrypted ZIP archive).
* **Security & Privacy**: Envelope Encryption (DEK/MEK isolation), Progressive Exponential Backoff for OTP (0s -> 30s -> 2m -> 15m -> 24h lockout after 5 daily requests), full compliance with Indonesia PDP Act (UU No. 27/2022).
* **Disaster Recovery**: ISO 22301 compliance with RTO < 15 Minutes and RPO < 1 Minute.

---

## 5. BUSINESS MODEL & MONETIZATION

* **Pure Monthly SaaS Subscription**: No lifetime licenses.
  - *Free Tier*: Core Net Worth, basic cash/bank accounts, 1-tap logging.
  - *Pro Tier (Rp 49.000/month)*: Unlimited wallets, MT5 local bridge, automated bot capture, cloud backup sync.
* **Proprietary B2B API Ecosystem**: Closed-source commercial IP core for enterprise partnerships (Plaid model).
