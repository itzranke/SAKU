'use client';

import React from 'react';

/**
 * Provenance badge for journal rows (M1 `source` column, exposed via GET /ledger/journals).
 * Doktrin UI: entri yang lahir dari sinkronisasi punya jejak audit — dan tidak ada yang
 * bisa mengedit saldo; badge ini informatif, bukan kontrol.
 */
const STYLE: Record<string, { cls: string; label: string; hint: string }> = {
  MANUAL: {
    cls: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    label: 'Manual',
    hint: 'Diketik manual (1-tap / Form / Telegram bot)',
  },
  STATEMENT_IMPORT: {
    cls: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    label: 'Statement',
    hint: 'Hasil rekonsiliasi import statement/CSV broker',
  },
  MT5_SYNC: {
    cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    label: 'MT5 Sync',
    hint: 'Tarikan konektor cloud MT5 (investor password, read-only)',
  },
  EA_LEGACY: {
    cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
    label: 'EA (legacy)',
    hint: 'Lama: push dari EA di terminal user — deprecated, lihat ADR-022',
  },
  BOT_CAPTURE: {
    cls: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
    label: 'Bot',
    hint: 'Tangkap dari chat bot (WhatsApp/Telegram)',
  },
  RECONCILIATION: {
    cls: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
    label: 'Rekonsiliasi',
    hint: 'Entri koreksi — jurnal reversal, bukan edit saldo',
  },
};

export function SourceBadge({ source }: { source?: string | null }) {
  const hit = STYLE[(source ?? 'MANUAL').toUpperCase()] ?? STYLE.MANUAL;
  return (
    <span
      title={hit.hint}
      className={`ml-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${hit.cls}`}
    >
      {hit.label}
    </span>
  );
}
