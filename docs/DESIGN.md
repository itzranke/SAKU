# 🎨 SAKU DESIGN SYSTEM & UI/UX ARCHITECTURE (DESIGN.md)

---

## 1. DESIGN PHILOSOPHY: INSTITUTIONAL CLARITY & HIGH DENSITY

SAKU's UI/UX design philosophy is built on **Institutional Clarity, Zero Friction, and High Information Density**. Inspired by tools like **Linear.app**, **Stripe Dashboard**, **TradingView**, and **Copilot Money**, SAKU delivers financial control without visual clutter.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SAKU DESIGN PILLARS                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. TRUST & PRECISION: Tabular figures, high contrast, exact numbers.    │
│ 2. ZERO FRICTION: 1-Tap actions, fast modals, instant feedback.        │
│ 3. HIGH DENSITY: Maximized screen utility without cognitive overload.   │
│ 4. SEMANTIC STATUS: Universal color coding for gains, losses, warnings. │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. COLOR SYSTEM & SEMANTIC TOKENS

### 2.1 Dark Mode Palette (Default)
* **Background Root**: `#090D16` (Deep Midnight Obsidian)
* **Surface Card**: `#111827` (Slate Darkness)
* **Surface Border**: `#1E293B` (Subtle Divider Slate)
* **Sidebar / Drawer**: `#0E1322` (Nav Darkness)

### 2.2 Semantic Financial Color Tokens
* **Income / Profit / Asset Increase (Emerald Green)**: `#10B981` (Text/Badge: `emerald-400`, Bg: `emerald-500/10`)
* **Expense / Loss / Liability Increase (Rose Red)**: `#F43F5E` (Text/Badge: `rose-400`, Bg: `rose-500/10`)
* **Warning / Due Bills / High Risk (Amber Yellow)**: `#F59E0B` (Text/Badge: `amber-400`, Bg: `amber-500/10`)
* **Primary Action / Net Worth Focus (Indigo Blue)**: `#6366F1` (Primary Button: `bg-indigo-600 hover:bg-indigo-500`)

---

## 3. TYPOGRAPHY & NUMERIC STANDARDS

* **Font Family**: Inter, system-ui, -apple-system, sans-serif.
* **Numeric Typography Rule**: All monetary values, exchange rates, and quantities **MUST** use tabular numbers (`font-variant-numeric: tabular-nums`). This prevents layout jitter when numbers change dynamically.
* **Font Weight Hierarchy**:
  - *Net Worth Value*: `text-3xl font-extrabold text-white`
  - *Card Titles*: `text-xs font-semibold uppercase tracking-wider text-slate-400`
  - *Table Headers*: `text-xs text-slate-500 uppercase tracking-wider`
  - *Body Table Numbers*: `text-sm font-semibold text-slate-100`

---

## 4. COMPONENT ARCHITECTURE & RESPONSIVE DESIGN

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DASHBOARD COMPONENT LAYOUT                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ [ SIDEBAR NAV ] │ [ HEADER: BASE CURRENCY SELECTOR + CATAT BUTTON ]     │
│                 ├───────────────────────────────────────────────────────┤
│                 │ [ HERO GRID: NET WORTH | ASSETS | LIABILITIES ]       │
│                 ├───────────────────────────┬───────────────────────────┤
│                 │ [ ACCOUNT BREAKDOWN LIST ]│ [ TRANSACTIONS TIMELINE ] │
└─────────────────┴───────────────────────────┴───────────────────────────┘
```

* **Responsive Adaptation Rules**:
  - **Desktop (Tauri/Web)**: Multi-column 3-pane layout, persistent sidebar, dual-currency switcher.
  - **Mobile (React Native/Expo)**: Single-column scroll, persistent bottom navigation bar, 1-tap floating action button (`+ Catat`).

---

## 5. DESIGN PRECEDENTS BENCHMARK MATRIX

| Design Attribute | Copilot Money | Stripe Dashboard | Ollo App | SAKU Design System |
| :--- | :--- | :--- | :--- | :--- |
| **Theme** | Dark Aesthetic | High Density | Light/Colorful | Deep Obsidian High-Contrast |
| **Numeric Font** | Standard Sans | Tabular Mono | Standard Sans | Tabular Figures (`tabular-nums`) |
| **Modal Entry** | 3-step Wizard | Inline Form | Voice/Chat | 1-Tap Fast Modal + Bot |
| **MT5 / Trading**| ❌ None | ❌ None | ❌ None | High-Density Trading Table |
