'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-[#0E1322]/80 backdrop-blur-md sticky top-0 z-50 p-5 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/30">
            S
          </div>
          <span className="font-bold text-xl tracking-wide text-white">SAKU</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <a href="/" className="text-slate-300 hover:text-white transition">Masuk ke Dasbor</a>
          <a href="#features" className="text-slate-300 hover:text-white transition">Fitur Utama</a>
          <a href="#b2b" className="text-slate-300 hover:text-white transition">B2B Open Finance</a>
          <a href="/" className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-lg hover:bg-indigo-500 transition">
            Coba Gratis Sekarang
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            ✨ SAKU v1.0.0 Release — Financial OS Berstandar Institusional
          </span>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Kelola Kekayaan & Trading Forex MT5 Dalam <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Satu Dasbor Terpadu</span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
            SAKU menggabungkan Rekening Bank, E-Wallet, Saham, hingga Akun MetaTrader 5 secara otomatis dengan engine Akuntansi Double-Entry Immutable.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <a
              href="/"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              🚀 Mulai Gratis (Tanpa Kartu Kredit)
            </a>
            <a
              href="https://github.com/itzranke/SAKU"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              ⭐ GitHub Repository
            </a>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 space-y-3">
            <span className="text-3xl">📖</span>
            <h3 className="font-bold text-lg text-white">Immutable Double-Entry</h3>
            <p className="text-xs text-slate-400">Setiap saldo didasarkan pada entitas jurnal debit dan kredit yang seimbang. Tanpa manipulasi saldo mentah.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 space-y-3">
            <span className="text-3xl">⚡</span>
            <h3 className="font-bold text-lg text-white">MetaTrader 5 Real-time Sync</h3>
            <p className="text-xs text-slate-400">Script MQL5 SakuBridge menyinkronkan ekuitas, margin, dan profit/loss trading forex secara otomatis.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 space-y-3">
            <span className="text-3xl">🛡️</span>
            <h3 className="font-bold text-lg text-white">SONZI Health Framework</h3>
            <p className="text-xs text-slate-400">Engine proteksi kekayaan dengan rasio kesehatan finansial (DSR, Dana Darurat, Solvabilitas) dan profil risiko adaptif.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0E1322] p-6 text-center text-xs text-slate-500">
        © 2026 SAKU Financial OS. Released under the MIT License.
      </footer>
    </div>
  );
}
