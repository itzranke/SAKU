'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StagingRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  account: string;
  autoMatched: boolean;
  status: 'PENDING' | 'APPROVED';
}

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostToLedger: (count: number, totalAmount: number) => void;
}

export function StatementImportModal({ isOpen, onClose, onPostToLedger }: StatementImportModalProps) {
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const sampleCsvData: StagingRow[] = [
    {
      id: 'stg-1',
      date: '2026-08-29',
      description: 'TRANSFER VIA BI-FAST TO GRAB INDONESIA',
      amount: 48000,
      category: 'Transportation',
      account: 'GoPay / OVO',
      autoMatched: true,
      status: 'PENDING',
    },
    {
      id: 'stg-2',
      date: '2026-08-28',
      description: 'STARBUCKS RESERVE JAKARTA GT',
      amount: 85000,
      category: 'Food & Beverage',
      account: 'Bank BCA',
      autoMatched: true,
      status: 'PENDING',
    },
    {
      id: 'stg-3',
      date: '2026-08-27',
      description: 'TOKOPEDIA PEMBAYARAN TAGIHAN PLN',
      amount: 450000,
      category: 'Utilities',
      account: 'Bank Mandiri',
      autoMatched: true,
      status: 'PENDING',
    },
    {
      id: 'stg-4',
      date: '2026-08-26',
      description: 'TRANSFER DARI AHMAD FAUZI',
      amount: 15000000,
      category: 'Uncategorized (Needs Review >10jt)',
      account: 'Bank BCA',
      autoMatched: false,
      status: 'PENDING',
    },
  ];

  const handleLoadSample = () => {
    setIsUploading(true);
    setTimeout(() => {
      setRows(sampleCsvData);
      setIsUploading(false);
    }, 600);
  };

  const handleApproveAll = () => {
    const pendingCount = rows.filter((r) => r.status === 'PENDING').length;
    const totalSum = rows.reduce((acc, r) => acc + r.amount, 0);
    onPostToLedger(pendingCount, totalSum);
    setRows([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-3xl rounded-2xl border border-emerald-500/20 bg-[#0F172A] p-6 shadow-2xl text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">
                  📥 Staging Sandbox Mutasi Rekening (CSV/PDF)
                </h3>
                <p className="text-xs text-slate-400">
                  Uji coba dan tinjau mutasi bank secara visual sebelum dimasukkan ke Ledger Akuntansi Immutable.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="mt-4 space-y-4">
              {rows.length === 0 ? (
                /* File Dropzone Area */
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm font-medium text-slate-300">
                    Tarik & Lepas File CSV / PDF Mutasi Bank BCA, Mandiri, atau E-Wallet di sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Atau gunakan seeder sampel di bawah ini untuk simulasi pengujian cepat Rule Matcher Engine SAKU.
                  </p>

                  <button
                    onClick={handleLoadSample}
                    disabled={isUploading}
                    className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition-all"
                  >
                    {isUploading ? 'Memproses Rule Engine...' : '⚡ Muat Sampel Mutasi BCA (Simulasi Auto-Match)'}
                  </button>
                </div>
              ) : (
                /* Staging Table View */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Ditemukan <strong className="text-emerald-400">{rows.length} transaksi</strong> dalam buffer Staging
                    </span>
                    <span className="text-amber-400 font-mono">
                      * Rule Engine Auto-Matched 75%
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="p-2">Tanggal</th>
                          <th className="p-2">Deskripsi</th>
                          <th className="p-2">Nominal (IDR)</th>
                          <th className="p-2">Kategori Suggested</th>
                          <th className="p-2">Status Matching</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {rows.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-800/40">
                            <td className="p-2 font-mono text-slate-400">{r.date}</td>
                            <td className="p-2 font-medium text-slate-200">{r.description}</td>
                            <td className="p-2 font-mono font-semibold text-white">
                              Rp {r.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="p-2">
                              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 font-mono">
                                {r.category}
                              </span>
                            </td>
                            <td className="p-2">
                              {r.autoMatched ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                                  ✓ Auto-Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                                  ⚠️ Flagged &gt;10jt
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setRows([])}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                    >
                      Reset Buffer
                    </button>
                    <button
                      onClick={handleApproveAll}
                      className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition-all"
                    >
                      ✓ Setujui Semua & Posting ke Double-Entry Ledger
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
