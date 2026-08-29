'use client';

import React, { useState } from 'react';
import TransactionModal from './components/TransactionModal';

export default function SakuDashboard() {
  const [baseCurrency, setBaseCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sample Aggregated State
  const [netWorthIDR, setNetWorthIDR] = useState(1450230000);
  const [totalAssetsIDR, setTotalAssetsIDR] = useState(1600000000);
  const totalDebtsIDR = 149770000;

  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Bank BCA', type: 'BANK', balance: 185000000, currency: 'IDR' },
    { id: '2', name: 'Bank Mandiri', type: 'BANK', balance: 60000000, currency: 'IDR' },
    { id: '3', name: 'GoPay / OVO', type: 'EWALLET', balance: 12500000, currency: 'IDR' },
    { id: '4', name: 'Physical Cash', type: 'CASH', balance: 3000000, currency: 'IDR' },
    { id: '5', name: 'IDX Equities', type: 'INVESTMENT', balance: 450000000, currency: 'IDR' },
    { id: '6', name: 'MetaTrader 5 Forex', type: 'TRADING', balance: 25400, currency: 'USD', eqIDR: 393700000 },
  ]);

  const [recentTransactions, setRecentTransactions] = useState([
    { id: 't1', date: '2026-08-28', description: 'Gaji Bulanan', account: 'Bank BCA', amount: 35000000, type: 'INCOME' },
    { id: 't2', date: '2026-08-28', description: 'Transfer ke MT5 Broker', account: 'Bank Mandiri', amount: -15500000, type: 'TRANSFER' },
    { id: 't3', date: '2026-08-27', description: 'Pembayaran Tagihan Listrik', account: 'GoPay / OVO', amount: -1250000, type: 'EXPENSE' },
    { id: 't4', date: '2026-08-26', description: 'Profit Trade EURUSD (MT5)', account: 'MetaTrader 5', amount: 480, type: 'TRADING_PROFIT', currency: 'USD' },
  ]);

  const handleAddTransaction = (newTx: any) => {
    setRecentTransactions((prev) => [newTx, ...prev]);

    // Update account balance
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.name === newTx.account) {
          return { ...acc, balance: acc.balance + newTx.amount };
        }
        return acc;
      })
    );

    // Update Net Worth and Total Assets
    setNetWorthIDR((prev) => prev + newTx.amount);
    setTotalAssetsIDR((prev) => prev + newTx.amount);
  };

  const formatCurrency = (val: number, curr = 'IDR') => {
    if (curr === 'USD') return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16] text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#0E1322] p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/30">
              S
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide text-white">SAKU</h1>
              <p className="text-xs text-slate-400">Financial OS v1.0</p>
            </div>
          </div>

          <nav className="space-y-1">
            <a href="#dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-600/10 text-indigo-400 font-medium text-sm">
              <span>📊</span> Dashboard
            </a>
            <a href="#accounts" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm">
              <span>🏦</span> Rekening & Wallet
            </a>
            <a href="#ledger" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm">
              <span>📖</span> Jurnal Transaksi
            </a>
            <a href="#investments" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm">
              <span>📈</span> Portofolio Investasi
            </a>
            <a href="#trading" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm">
              <span>⚡</span> Active Trading MT5
            </a>
            <a href="#reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm">
              <span>📑</span> Laporan Laba/Rugi
            </a>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Status Sync MT5</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Connected
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Top Header */}
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Ringkasan Keuangan</h2>
            <p className="text-sm text-slate-400">Sumber kebenaran tunggal untuk kekayaan & aktivitas trading Anda.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center text-xs">
              <button
                onClick={() => setBaseCurrency('IDR')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  baseCurrency === 'IDR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IDR
              </button>
              <button
                onClick={() => setBaseCurrency('USD')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  baseCurrency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                USD
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
            >
              <span>+</span> Catat Transaksi
            </button>
          </div>
        </header>

        {/* Hero Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Worth</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              {formatCurrency(baseCurrency === 'IDR' ? netWorthIDR : netWorthIDR / 15500, baseCurrency)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400">
              <span>▲ +2.4%</span>
              <span className="text-slate-500">dibanding bulan lalu</span>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Aset</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-2">
              {formatCurrency(baseCurrency === 'IDR' ? totalAssetsIDR : totalAssetsIDR / 15500, baseCurrency)}
            </h3>
            <div className="mt-4 text-xs text-slate-400">
              Kas Cair: <span className="font-semibold text-white">Rp 260.500.000</span>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Liabilitas (Hutang)</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-2">
              {formatCurrency(baseCurrency === 'IDR' ? totalDebtsIDR : totalDebtsIDR / 15500, baseCurrency)}
            </h3>
            <div className="mt-4 text-xs text-slate-400">
              Kartu Kredit & Pinjaman
            </div>
          </div>
        </div>

        {/* Account Breakdown & Recent Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts List */}
          <div className="lg:col-span-1 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Daftar Akun & Saldo</h4>
              <button className="text-xs text-indigo-400 hover:underline">Kelola</button>
            </div>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                  <div>
                    <p className="font-semibold text-sm text-slate-200">{acc.name}</p>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{acc.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-slate-100">{formatCurrency(acc.balance, acc.currency)}</p>
                    {acc.eqIDR && <p className="text-[11px] text-slate-500">≈ {formatCurrency(acc.eqIDR, 'IDR')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Jurnal Transaksi Terbaru</h4>
              <button className="text-xs text-indigo-400 hover:underline">Lihat Semua</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800 uppercase tracking-wider">
                    <th className="pb-3">Tanggal</th>
                    <th className="pb-3">Keterangan</th>
                    <th className="pb-3">Akun</th>
                    <th className="pb-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 text-xs text-slate-400">{tx.date}</td>
                      <td className="py-3 font-medium text-slate-200">{tx.description}</td>
                      <td className="py-3 text-xs text-slate-400">{tx.account}</td>
                      <td className={`py-3 text-right font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency || 'IDR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Component */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTransaction={handleAddTransaction}
        />
      </main>
    </div>
  );
}
