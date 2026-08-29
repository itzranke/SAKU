'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectAction('OPEN');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectAction]);

  const commands = [
    { id: 'add-tx', label: '+ Catat Transaksi Baru', icon: '📝', category: 'Aksi Cepat' },
    { id: 'import-mutasi', label: '📥 Import Mutasi Bank (CSV/PDF)', icon: '📄', category: 'Aksi Cepat' },
    { id: 'sonzi-health', label: '🛡️ Buka SONZI Framework Health Engine', icon: '⚡', category: 'Analistik' },
    { id: 'mt5-journal', label: '📈 Lihat Trading Journal MetaTrader 5', icon: '📊', category: 'Trading' },
    { id: 'upgrade-pro', label: '⭐ Upgrade SAKU Pro Monthly (Midtrans/Xendit)', icon: '💳', category: 'Langganan' },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-[#0F172A] p-4 shadow-2xl text-slate-100"
          >
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik perintah atau cari fitur... (Cmd + K)"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                ESC
              </span>
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
              {filteredCommands.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500">Perintah tidak ditemukan.</p>
              ) : (
                filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onSelectAction(cmd.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-left text-xs text-slate-200 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{cmd.icon}</span>
                      <span className="font-medium group-hover:text-white">{cmd.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{cmd.category}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
