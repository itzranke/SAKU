# 👥 SAKU MULTI-PERSONA AUDIT & USER PERSPECTIVES

---

## EXECUTIVE SUMMARY
This document performs a multi-perspective audit of SAKU from 4 distinct user personas: **The Total Beginner**, **The Informed Intermediate**, **The Expert Active Trader**, and **The Privacy Minimalist**.

It identifies persona-specific mental models, friction points, constructive critiques, and actionable architectural solutions.

---

## 1. PERSPECTIVE 1: THE TOTAL BEGINNER (PENGGUNA BARU YANG TIDAK TAHU APA-APA)

### Mental Model
*"Saya cuma mau tahu sisa uang saya di dompet dan bank, serta tidak lupa bayar kos. Saya takut melihat istilah akuntansi yang membingungkan seperti Debit, Kredit, atau FIFO Cost Basis."*

### How SAKU Appeals
* **Default SONZI Framework**: Provides a clear out-of-the-box roadmap (50% Kebutuhan, 30% Keinginan, 20% Dana Darurat) so they don't face a blank screen.
* **1-Tap Fast Ingestion**: Simple modal or Telegram/WhatsApp bot (`Kopi 25k BCA`).

### Critique, Gap & Solution
* ⚠️ **Gap / Fear**: If the beginner sees accounting terms ("Journal", "Debit/Credit", "Ledger Entry") on the main screen, they will panic and uninstall the app.
* 🛠️ **Constructive Solution**: **Jargon-Free UI Abstraction**:
  - Replace "Debit/Credit" with plain language: **"Pemasukan (+)"** and **"Pengeluaran (-)"**.
  - Hide double-entry complexity under the hood. The beginner only sees "Simpan".

---

## 2. PERSPECTIVE 2: THE INFORMED INTERMEDIATE (PENGGUNA YANG SUDAH TAHU)

### Mental Model
*"Saya punya rekening BCA untuk gaji, Bank Jago untuk kantong-kantong, Ajaib untuk saham, dan ShopeePayLater. Saya pusing harus membuka 4 aplikasi berbeda tiap malam hanya untuk tahu Net Worth saya."*

### How SAKU Appeals
* **Single Pane of Glass Aggregator**: Consolidates all digital pockets, banks, investments, and PayLater obligations into one unified Net Worth card.
* **Angsuran & PayLater Split**: Automatically tracks remaining PayLater limits and loan principal reductions.

### Critique, Gap & Solution
* ⚠️ **Gap / Friction**: If adding a transaction requires manually typing categories and accounts every single time, they will get tired after 2 weeks.
* 🛠️ **Constructive Solution**: **Smart Auto-Suggest & Transaction Templates**:
  - Remember frequent payees (`GRAB` $\to$ Auto-select GoPay + Transportation).
  - Provide "1-Tap Quick Buttons" for daily routine transactions (e.g., "Kopi Pagi - Rp 25.000").

---

## 3. PERSPECTIVE 3: THE EXPERT ACTIVE TRADER (PENGGUNA EXPERT & QUANT)

### Mental Model
*"Saya trade Forex/Emas di MT5, holding crypto di Indodax/Bybit, dan punya portofolio saham. Saya butuh presisi akuntansi double-entry yang tidak ada 'ghost balance', serta MQL5 EA bridge untuk membaca floating equity real-time."*

### How SAKU Appeals
* **Immutable Double-Entry Ledger Core**: Guarantees zero math errors and traceable journal audits.
* **MT5 Read-Only Local Bridge**: Live floating equity, drawdown metrics, and trading journal notes without manual entry.

### Critique, Gap & Solution
* ⚠️ **Gap / Need**: Experts need high information density, multi-currency conversion spread tracking, and trade tagging (`#FOMO`, `#BREAKOUT`).
* 🛠️ **Constructive Solution**: **Trader Desk Mode & FX Conversion Fee Automation**:
  - High-density view toggle for MT5 accounts.
  - Automatic calculation of bank/broker FX exchange rate spreads into `Expense:FX Conversion Fees`.

---

## 4. PERSPECTIVE 4: THE PRIVACY MINIMALIST (PENGGUNA PRIVASI & SECURITY)

### Mental Model
*"Saya tidak mau kata sandi bank atau broker saya disimpan di server cloud orang lain. Data keuangan saya adalah privasi mutlak."*

### How SAKU Appeals
* **Non-Custodial Architecture**: Read-only local MT5 bridge EA running on the user's PC; no financial execution secrets stored on cloud servers.
* **Envelope Encryption**: DEK/MEK key isolation for data at rest.

### Critique, Gap & Solution
* ⚠️ **Gap / Concern**: Fear of cloud data leaks.
* 🛠️ **Constructive Solution**: **Offline-First Storage Option & Full Export**:
  - Support local-first SQLite offline mode with 1-click JSON/CSV backup & export.

---

## 5. SUMMARY: THE BALANCED SAKU EXPERIENCE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAKU MULTI-PERSONA UI ABSTRACTION LAYER                                     │
├───────────────────┬───────────────────────────┬─────────────────────────────┤
│ User Persona      │ What They See (UI View)   │ What Runs Under the Hood    │
├───────────────────┼───────────────────────────┼─────────────────────────────┤
│ 1. Beginner       │ "Masuk (+)" / "Keluar (-)"│ Balanced Double-Entry Ledger│
│ 2. Intermediate   │ Net Worth & Pockets Card  │ Multi-Account Consolidation │
│ 3. Expert Trader  │ MT5 Desk & Equity Curves  │ MQL5 Local Bridge Payload   │
│ 4. Privacy User   │ Local Data & Security Key │ Zero-Trust Envelope Enc.    │
└───────────────────┴───────────────────────────┴─────────────────────────────┘
```

SAKU successfully serves all 4 personas without compromising simplicity or technical rigor.
