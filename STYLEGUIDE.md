# 🎨 SAKU — ENGINEERING & UI/UX STYLEGUIDE (STYLEGUIDE.md)

---

## 1. UI/UX DESIGN SYSTEM TOKENS

### 1.1 Color System (Deep Midnight Obsidian)
* **Root Background**: `#090D16` (`bg-[#090D16]`)
* **Surface Card**: `#111827` (`bg-[#111827]`)
* **Surface Border**: `#1E293B` (`border-slate-800`)
* **Sidebar Nav**: `#0E1322` (`bg-[#0E1322]`)

### 1.2 Semantic Financial Tokens
* **Income / Asset Increase / Profit**: `#10B981` (`text-emerald-400`, `bg-emerald-500/10`)
* **Expense / Liability Increase / Loss**: `#F43F5E` (`text-rose-400`, `bg-rose-500/10`)
* **Warning / Due Bills / High Risk**: `#F59E0B` (`text-amber-400`, `bg-amber-500/10`)
* **Primary Action / Net Worth**: `#6366F1` (`bg-indigo-600 hover:bg-indigo-500`)

---

## 2. TYPOGRAPHY & NUMERIC STANDARDS

* **Primary Font**: Inter, system-ui, -apple-system, sans-serif.
* **MANDATORY NUMERIC RULE**: All monetary values, exchange rates, lot sizes, and percentages **MUST** use tabular numbers (`font-variant-numeric: tabular-nums`).
* **Formatting Rules**:
  - *IDR Currency*: `Rp 1.450.230.000` (`IDR` formatting with Indonesian locale).
  - *USD Currency*: `$25,400.00` (`USD` formatting with US locale).

---

## 3. TYPESCRIPT & CODE CONVENTIONS

### 3.1 Strict Mode & ESLint Rules
* Enable strict TypeScript (`"strict": true` in `tsconfig.json`).
* Explicit type definitions required for all API request/response DTOs and ledger function parameters. No `any` types in production code.

### 3.2 File & Directory Naming Conventions
* **React Components**: PascalCase (`TransactionModal.tsx`, `NetWorthCard.tsx`).
* **Utilities & Core Engines**: camelCase (`validateJournalEntries.ts`, `reconcileAccount.ts`).
* **Documentation & Specifications**: UPPERCASE or kebab-case (`PRD.md`, `STYLEGUIDE.md`, `TASK.md`).

---

## 4. ARCHITECTURAL PATTERNS

* **Next.js App Router**: Use Client Components (`'use client'`) for interactive modals and Server Components for static SSR data.
* **Tailwind CSS Utility First**: Avoid custom CSS files except for root variable declarations in `globals.css`.
* **Double-Entry Ledger Invariant**: Every backend transaction endpoint MUST validate `SUM(Debits * Rate) === SUM(Credits * Rate)` using `@saku/ledger-core` before committing to PostgreSQL.
