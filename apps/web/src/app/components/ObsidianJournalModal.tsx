'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ObsidianJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMarkdown: (note: string) => void;
}

export function ObsidianJournalModal({ isOpen, onClose, onSaveMarkdown }: ObsidianJournalModalProps) {
  const [title, setTitle] = useState('Evaluasi Trading EURUSD & Refleksi SONZI Stage 2');
  const [noteBody, setNoteBody] = useState(`## Refleksi Keuangan SAKU
- **Profit Trading MT5**: +$480 USD (Sesuai Plan)
- **Rasio Dana Darurat**: 21.7 Bulan (Aman)
- **Tag**: #trading #fomo #sonzi-stage2

*Catatan ini diformat khusus dengan YAML Frontmatter agar dapat langsung di-import ke Obsidian Vault.*`);

  const handleExport = () => {
    const markdownOutput = `---
title: "${title}"
date: ${new Date().toISOString().split('T')[0]}
tags: ["trading", "sonzi", "journal"]
vault: SAKU-Financial-OS
---

${noteBody}`;

    onSaveMarkdown(markdownOutput);
    onClose();
  };

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
            className="relative w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-[#0F172A] p-6 shadow-2xl text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📓</span>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Obsidian Vault Markdown Financial Journal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ekspor catatan transaksi & refleksi trading langsung ke format Obsidian Markdown Vault (.md).
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Catatan Jurnal</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Isi Jurnal (Markdown Format)</label>
                <textarea
                  rows={6}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-xs font-mono text-slate-200 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  onClick={handleExport}
                  className="rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-purple-500 transition-all"
                >
                  📄 Ekspor ke Obsidian Vault (.md)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
