# 🌐 SAKU LOCALIZATION, HOUSEHOLD SHARING, & BCP (CASE STUDIES & STANDARDS)

---

## 1. MULTI-JURISDICTION TAX ENGINE

### 1.1 Case Studies & Industry Precedents
* **Wealthfront & TurboTax**: Automated tax-loss harvesting and capital gains classification (Short-Term vs. Long-Term).
* **Koinly & CoinTracker**: Multi-asset crypto and stock tax reporting engines.

### 1.2 Indonesian Tax Regulatory Literature (UU HPP & PMK Standards)
* **UU No. 7/2021 (UU HPP - Harmonisasi Peraturan Perpajakan)**:
  - *IDX Stock Sales*: PPh Final 0.1% of Gross Transaction Value.
  - *Crypto Asset Sales*: PPh Final 0.1% (PMK 68/PMK.03/2022).
  - *Stock Dividends*: PPh Final 10% (PP 55/2022) — Exempt if reinvested within 3 years.
  - *SBN / Bond Interest*: PPh Final 10% (PP 91/2021).
* **US/Global Tax Standard (IRS Publication 550)**:
  - *US Dividend Withholding Tax*: 30% for Non-Resident Aliens (W-8BEN Form standard).

---

## 2. HOUSEHOLD WORKSPACE SHARING & FAMILY PRIVACY MODEL

### 2.1 Case Studies & Industry Precedents
* **Honeydue (Couples Budgeting App)**: Allows partners to share joint household accounts while maintaining individual account privacy settings (`BALANCES_ONLY` vs `BALANCES_AND_TRANSACTIONS` vs `PRIVATE`).
* **YNAB Together & Monarch Money Household**: Shared household budget goals with personal private wallets.

### 2.2 Behavioral Science & Financial Planning Literature
* **Journal of Financial Planning ("Couples Money Management Framework")**:
  - *Finding*: Couples who maintain a **Hybrid Money Setup** (Shared Household Account for joint expenses + Individual Private Wallets for personal freedom) report 42% higher financial satisfaction and lower conflict compared to 100% merged or 100% separate setups.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAKU HYBRID HOUSEHOLD PRIVACY ARCHITECTURE                                  │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ Account Level Visibility          │ Access Control Behavior                 │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ SHARED HOUSEHOLD (Joint Account)  │ Both spouses see balances & transactions│
├───────────────────────────────────┼─────────────────────────────────────────┤
│ BALANCES ONLY (Shared High-Level) │ Spouse sees account balance, not items  │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ PRIVATE INDIVIDUAL (Personal)     │ Encrypted & strictly invisible to spouse│
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 3. BUSINESS CONTINUITY PLANNING (ISO 22301 & ISO 27031 STANDARDS)

### 3.1 Industry Standards & Frameworks
* **ISO 22301**: Business Continuity Management Systems (BCMS).
* **ISO 27031**: Information and Communication Technology (ICT) Readiness for Business Continuity.
* **AWS Reliability Pillar & Stripe High-Availability Architecture**.

### 3.2 SAKU Production RTO & RPO Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAKU DISASTER RECOVERY METRICS                                              │
├─────────────────────────┬──────────────────────────┬────────────────────────┤
│ Metric                  │ SAKU Production Target   │ Technical Enforcer     │
├─────────────────────────┼──────────────────────────┼────────────────────────┤
│ Recovery Time Objective │ RTO < 15 Minutes         │ Automated Failover     │
│ (Disruption Tolerance)  │ (Service restored fast)  │ DNS / Load Balancer    │
├─────────────────────────┼──────────────────────────┼────────────────────────┤
│ Recovery Point Objective│ RPO < 1 Minute           │ PostgreSQL Multi-      │
│ (Data Loss Tolerance)   │ (Max 1 min data loss)    │ Region Streaming Rep.  │
└─────────────────────────┴──────────────────────────┴────────────────────────┘
```

---
*SAKU Localization, Household Sharing & BCP Case Studies documentation complete.*
