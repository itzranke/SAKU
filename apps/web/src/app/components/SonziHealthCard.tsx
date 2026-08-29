'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccountStateQuery } from '../store/integrationApi';

export function SonziHealthCard() {
  const [riskProfile, setRiskProfile] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE');

  const allocations = {
    CONSERVATIVE: { cash: 60, equities: 30, trading: 10 },
    MODERATE: { cash: 40, equities: 40, trading: 20 },
    AGGRESSIVE: { cash: 20, equities: 50, trading: 30 },
  };

  const currentAllocation = allocations[riskProfile];

  // MT5 equity/balance = DATA TAMPILAN (ADR-022). Snapshot read-only ini tidak pernah
  // menulis saldo; kalau kosong, yang muncul empty state — bukan error merah.
  const { data: connector, isError: connectorOffline } = useAccountStateQuery(undefined, {
    pollingInterval: 60_000,
  });
  const snap = connector?.state ?? null;
  const ageSec = snap?.updatedAt ? Math.max(0, Math.round((Date.now() - Date.parse(snap.updatedAt)) / 1000)) : null;
  const emptyReason = connectorOffline
    ? 'SAKU API tidak terjangkau'
    : !connector?.enabled
      ? 'Konektor MT5 mati (MT5_CLOUD_ENABLED=false) — data masuk lewat import statement'
      : 'Belum pernah sync — tekan Sync now di Settings › Integrations';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl border border-indigo-500/20 bg-[#111827] p-6 shadow-xl relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-lg font-bold text-white tracking-wide">SONZI Framework Engine</h3>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              Adaptable Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standard default framework untuk proteksi kekayaan, pertumbuhan modal, dan pemetaan kebebasan finansial.
          </p>
        </div>

        {/* Risk Profile Switcher Buttons */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1 text-xs font-semibold">
          <button
            onClick={() => setRiskProfile('CONSERVATIVE')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              riskProfile === 'CONSERVATIVE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Konservatif
          </button>
          <button
            onClick={() => setRiskProfile('MODERATE')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              riskProfile === 'MODERATE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Moderat
          </button>
          <button
            onClick={() => setRiskProfile('AGGRESSIVE')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              riskProfile === 'AGGRESSIVE'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Agresif
          </button>
        </div>
      </div>

      {/* Progress & Health Ratios Body */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stage Progression Column */}
        <div className="md:col-span-1 space-y-3 border-r border-slate-800/60 pr-0 md:pr-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Progres Tahapan SONZI
          </span>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-emerald-400">Tahap 2: Active Capital Growth</h4>
            <p className="text-xs text-slate-400">Target FIRE: Rp 3.600.000.000 (25x Pengeluaran Tahunan)</p>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span>Capaian Modal SAKU</span>
              <span className="font-mono text-emerald-400">40.2%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '40.2%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Financial Health Ratios Column */}
        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          {/* Ratio 1: DSR */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Debt Service Ratio (DSR)
            </span>
            <div className="flex items-baseline gap-1">
              <h5 className="text-xl font-extrabold text-white font-mono">14.8%</h5>
              <span className="text-[10px] text-emerald-400 font-semibold">✓ Ideal (&lt;35%)</span>
            </div>
            <p className="text-[10px] text-slate-500">Angsuran Rp 5.2jt / Penghasilan Rp 35jt</p>
          </div>

          {/* Ratio 2: Emergency Fund */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Rasio Dana Darurat
            </span>
            <div className="flex items-baseline gap-1">
              <h5 className="text-xl font-extrabold text-white font-mono">21.7 Bln</h5>
              <span className="text-[10px] text-emerald-400 font-semibold">✓ Aman (&ge;6 Bln)</span>
            </div>
            <p className="text-[10px] text-slate-500">Kas Cair Rp 260.5jt / Pengeluaran Rp 12jt</p>
          </div>

          {/* Ratio 3: Allocation Distribution */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Rekomendasi Alokasi
            </span>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Kas/Pasar Uang:</span>
                <span className="text-emerald-400 font-bold">{currentAllocation.cash}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Saham Equities:</span>
                <span className="text-indigo-400 font-bold">{currentAllocation.equities}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trading / Forex:</span>
                <span className="text-amber-400 font-bold">{currentAllocation.trading}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MT5 snapshot strip — display only, with an honest empty state */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          MT5 Equity (read-only)
        </span>
        {snap ? (
          <>
            <span className="font-mono text-base font-extrabold text-emerald-400">
              {snap.currency} {snap.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400">
              Balance {snap.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {snap.margin != null ? ` · Margin ${snap.margin.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
            </span>
            <span className={`text-[10px] font-semibold ${ageSec !== null && ageSec > 600 ? 'text-amber-400' : 'text-slate-500'}`}>
              {ageSec === null ? 'snapshot tersedia' : `${ageSec} dtk lalu`}
            </span>
            <span className="ml-auto text-[10px] text-slate-600">
              {connector?.provider ? `provider: ${connector.provider}` : ''} · saldo jurnal tetap dari closed deals
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-500">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-600 align-middle" />
            {emptyReason}
          </span>
        )}
      </div>
    </motion.div>
  );
}
