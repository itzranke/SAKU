'use client';

import React, { useState } from 'react';
import { validateJournalEntries, LedgerEntryInput } from '@saku/ledger-core';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (newTx: any) => void;
}

export default function TransactionModal({ isOpen, onClose, onAddTransaction }: TransactionModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [account, setAccount] = useState('Bank BCA');
  const [category, setCategory] = useState('Makanan & Minuman');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError('Jumlah transaksi harus berupa angka positif.');
      return;
    }

    // Double-Entry Ledger Validation using @saku/ledger-core
    let entries: LedgerEntryInput[] = [];

    if (type === 'EXPENSE') {
      entries = [
        { accountId: category, amount: numericAmount, currency: 'IDR' }, // Debit: Expense
        { accountId: account, amount: -numericAmount, currency: 'IDR' },  // Credit: Asset decreases
      ];
    } else if (type === 'INCOME') {
      entries = [
        { accountId: account, amount: numericAmount, currency: 'IDR' },   // Debit: Asset increases
        { accountId: category, amount: -numericAmount, currency: 'IDR' }, // Credit: Income
      ];
    } else {
      // TRANSFER
      entries = [
        { accountId: 'Bank Mandiri', amount: numericAmount, currency: 'IDR' },
        { accountId: account, amount: -numericAmount, currency: 'IDR' },
      ];
    }

    const validation = validateJournalEntries(entries);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Pencatatan jurnal akuntansi tidak seimbang.');
      return;
    }

    onAddTransaction({
      id: `t-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description,
      account,
      amount: type === 'EXPENSE' ? -numericAmount : numericAmount,
      type,
    });

    // Reset Form
    setDescription('');
    setAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white">Tambah Transaksi Baru</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">
            ✕
          </button>
        </div>

        {validationError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Jenis Transaksi</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  type === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  type === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setType('TRANSFER')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  type === 'TRANSFER' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Keterangan Transaksi</label>
            <input
              type="text"
              required
              placeholder="Contoh: Kopi, Pembelian Saham, Gaji"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Jumlah (IDR)</label>
            <input
              type="number"
              required
              placeholder="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Sumber Akun / Wallet</label>
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="Bank BCA">Bank BCA</option>
              <option value="Bank Mandiri">Bank Mandiri</option>
              <option value="GoPay / OVO">GoPay / OVO</option>
              <option value="Physical Cash">Physical Cash Wallet</option>
            </select>
          </div>

          {/* Category */}
          {type !== 'TRANSFER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Makanan & Minuman">Makanan & Minuman</option>
                <option value="Transportasi">Transportasi</option>
                <option value="Tagihan & Utilitas">Tagihan & Utilitas</option>
                <option value="Gaji & Bonus">Gaji & Bonus</option>
                <option value="Hasil Investasi">Hasil Investasi / Dividen</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/20"
            >
              Simpan ke Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
