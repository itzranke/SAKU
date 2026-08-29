'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'vip'>('pro');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl rounded-2xl border border-indigo-500/30 bg-[#0F172A] p-6 shadow-2xl text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">
                  ⭐ Upgrade SAKU Financial OS Pro
                </h3>
                <p className="text-xs text-slate-400">
                  Model Berlangganan Murni Bulanan. Akses penuh ke seluruh engine akuntansi & trading.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Plans Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pro Monthly */}
              <div
                onClick={() => setSelectedPlan('pro')}
                className={`cursor-pointer rounded-xl border p-5 transition-all ${
                  selectedPlan === 'pro'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">SAKU Pro</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Untuk Individu & Trader</p>
                  </div>
                  {selectedPlan === 'pro' && (
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                      Dipilih
                    </span>
                  )}
                </div>

                <div className="mt-4 font-mono">
                  <span className="text-2xl font-extrabold text-white">Rp 99.000</span>
                  <span className="text-xs text-slate-400"> / bulan</span>
                </div>

                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Double-Entry Ledger Core</li>
                  <li className="flex items-center gap-2">✓ Sync MetaTrader 5 Real-time</li>
                  <li className="flex items-center gap-2">✓ Telegram Chat Bot Assistant</li>
                  <li className="flex items-center gap-2">✓ SONZI Health Ratio Engine</li>
                </ul>
              </div>

              {/* Household & Trader VIP */}
              <div
                onClick={() => setSelectedPlan('vip')}
                className={`cursor-pointer rounded-xl border p-5 transition-all ${
                  selectedPlan === 'vip'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">SAKU VIP</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Untuk Keluarga & B2B Trader</p>
                  </div>
                  {selectedPlan === 'vip' && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      Dipilih
                    </span>
                  )}
                </div>

                <div className="mt-4 font-mono">
                  <span className="text-2xl font-extrabold text-white">Rp 199.000</span>
                  <span className="text-xs text-slate-400"> / bulan</span>
                </div>

                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Semua Fitur SAKU Pro</li>
                  <li className="flex items-center gap-2">✓ Multi-Tenant Household Sharing</li>
                  <li className="flex items-center gap-2">✓ Statement Staging Sandbox Unlimited</li>
                  <li className="flex items-center gap-2">✓ B2B API Key Access (Plaid Model)</li>
                </ul>
              </div>
            </div>

            {/* Footer Action */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                🔒 Pembayaran Aman via Midtrans / Xendit / Credit Card
              </span>
              <button
                onClick={() => {
                  alert(`Memproses Checkout Berlangganan untuk Plan ${selectedPlan.toUpperCase()} via Midtrans/Xendit Payment Gateway...`);
                  onClose();
                }}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-all"
              >
                Lanjutkan ke Pembayaran Bulanan →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
