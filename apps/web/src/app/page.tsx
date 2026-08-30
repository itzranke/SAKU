'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSakuDispatch, useSakuSelector } from './store/hooks';
import { fetchSnapshot, postTransaction, toApiTransaction } from './store/ledgerSlice';
import TransactionModal from './components/TransactionModal';
import { StatementImportModal } from './components/StatementImportModal';
import { SonziHealthCard } from './components/SonziHealthCard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { CommandPalette } from './components/CommandPalette';
import { ToastProvider, useToast } from './components/ToastProvider';
import { GraphifyWealthChart } from './components/GraphifyWealthChart';
import { ObsidianJournalModal } from './components/ObsidianJournalModal';
import { IntegrationsSettingsModal } from './components/IntegrationsSettingsModal';
import { SourceBadge } from './components/SourceBadge';
import { useAccountStateQuery } from './store/integrationApi';
import { formatMoney, formatRupiah } from './format';

/**
 * Kurs tampilan USD → IDR untuk ringkasan hero (audit #9).
 *
 * ponytail: angka HARUS sama dengan sumber kebenaran server
 * `packages/ledger-core/journal-mapping.ts:16` (`DEFAULT_EXCHANGE_RATES.USD`), yang dipakai
 * saat menjurnal — kalau server berubah, konstanta ini wajib ikut (komentar ini sengaja
 * menyebut lokasinya). Plafon: kurs konstan, cukup untuk fase single-currency display.
 * Jalur upgrade (item terpisah, butuh keputusan user): API mengirim kurs di snapshot, bukan
 * di-hardcode klien.
 */
const USD_IDR_RATE = 15500;

type ConnectorOverview = {
  enabled: boolean;
  provider: string;
  state?: { equity: number; currency: string; updatedAt: string } | null;
  notice?: string;
} | undefined;

/**
 * Honest sync pill (replaces the old hardcoded "Connected"): reads GET /trading/account-state.
 * Empty/offline states are informative, never a red error — MT5 is one asset among many.
 */
function SyncPill({ connector, onManage }: { connector: ConnectorOverview; onManage: () => void }) {
  if (!connector) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 font-medium text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-500" /> cek API
      </span>
    );
  }
  if (!connector.enabled) {
    return (
      <button onClick={onManage} title={connector.notice} className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 font-medium text-slate-400 hover:text-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-500" /> statement/manual
      </button>
    );
  }
  const ageSec = connector.state?.updatedAt ? Math.max(0, Math.round((Date.now() - Date.parse(connector.state.updatedAt)) / 1000)) : null;
  const stale = ageSec === null || ageSec > 600;
  return (
    <button
      onClick={onManage}
      title={connector.state ? `Equity ${connector.state.currency} ${formatMoney(connector.state.equity)}` : 'Konektor aktif, belum ada snapshot'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium ${
        stale ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${stale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
      {stale ? 'butuh sync' : `${connector.provider} · ${ageSec}s`}
    </button>
  );
}

function DashboardContent() {
  const [baseCurrency, setBaseCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isObsidianModalOpen, setIsObsidianModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  // Health of the MT5 pull connector (ADR-022). Refreshed slowly; never blocks the dashboard.
  const { data: connector } = useAccountStateQuery(undefined, { pollingInterval: 60_000 });

  const { showToast } = useToast();
  const dispatch = useSakuDispatch();

  // Live projection of the immutable double-entry ledger (@saku/ledger-core via @saku/api-core).
  // While offline, the store keeps its seeded sample state so the layout never collapses.
  const { netWorthIDR, totalAssetsIDR, totalDebtsIDR, liquidityCashIDR, journalCount, accounts, transactions, source: dataSource, error: storeError, lastSyncAt } =
    useSakuSelector((s) => s.ledger);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    dispatch(fetchSnapshot());
  }, [dispatch]);

  const handleAddTransaction = async (newTx: any) => {
    if (isPosting) return;
    setIsPosting(true);
    try {
      await dispatch(postTransaction(toApiTransaction(newTx))).unwrap();
      showToast(`Jurnal "${newTx.description}" diposting — saldo diturunkan dari double-entry ledger.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Jurnal ditolak validator ledger (tidak balance?).', 'warning');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostStagingToLedger = async (count: number, totalSum: number) => {
    try {
      await dispatch(
        postTransaction(
          toApiTransaction({
            amount: totalSum,
            type: 'EXPENSE',
            description: `Batch Import Mutasi BCA (${count} item)`,
            account: 'Bank BCA',
            category: 'Import Mutasi',
            source: 'STATEMENT_IMPORT',
          })
        )
      ).unwrap();
      showToast(`Batch Import (${count} mutasi) disetujui & diposting sebagai 1 jurnal Double-Entry!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Batch staging gagal diposting ke ledger.', 'warning');
    }
  };

  const handleCommandPaletteAction = (actionId: string) => {
    if (actionId === 'OPEN') setIsCommandPaletteOpen(true);
    else if (actionId === 'add-tx') setIsModalOpen(true);
    else if (actionId === 'import-mutasi') setIsImportModalOpen(true);
    else if (actionId === 'upgrade-pro') setIsSubscriptionModalOpen(true);
    else if (actionId === 'sonzi-health') showToast('SONZI Health Engine aktif!', 'info');
    else if (actionId === 'integrations') setIsIntegrationsOpen(true);
  };

  // Keluaran identik dengan versi sebelumnya — sekarang memakai helper bersama (audit #8)
  // supaya tidak ada dua dialek format mata uang dalam satu berkas.
  const formatCurrency = (val: number, curr = 'IDR') => {
    if (curr === 'USD') return `$${formatMoney(val)}`;
    return `Rp ${formatRupiah(val)}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16] text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#0E1322] p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/30"
            >
              S
            </motion.div>
            <div>
              <h1 className="font-bold text-lg tracking-wide text-white">SAKU</h1>
              <p className="text-xs text-slate-400">Financial OS v1.0</p>
            </div>
          </div>

          <nav className="space-y-1">
            <a href="#dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 font-medium text-sm border border-indigo-500/20">
              <span>📊</span> Dashboard
            </a>
            <a href="#accounts" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm transition">
              <span>🏦</span> Rekening & Wallet
            </a>
            <a href="#ledger" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm transition">
              <span>📖</span> Jurnal Transaksi
            </a>
            <button
              onClick={() => setIsObsidianModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 text-sm transition border border-purple-500/10"
            >
              <span>📓</span> Obsidian Vault Journal
            </button>
            <a href="#investments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm transition">
              <span>📈</span> Portofolio Investasi
            </a>
            <a href="#trading" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm transition">
              <span>⚡</span> Active Trading MT5
            </a>
            <button
              onClick={() => setIsIntegrationsOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-sm transition"
            >
              <span>🔌</span> Settings &rsaquo; Integrations
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-xs font-mono text-slate-400 hover:text-white hover:border-slate-700 transition flex items-center justify-between"
          >
            <span>🔍 Cari...</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">Cmd+K</span>
          </button>

          <button
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 p-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>⭐</span> Berlangganan Pro
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Status Sync MT5</span>
            <SyncPill connector={connector} onManage={() => setIsIntegrationsOpen(true)} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Top Header */}
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Ringkasan Keuangan</h2>
            <p className="text-sm text-slate-400">Sumber kebenaran tunggal untuk kekayaan & aktivitas trading Anda.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
              <button
                onClick={() => setBaseCurrency('IDR')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  baseCurrency === 'IDR' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IDR
              </button>
              <button
                onClick={() => setBaseCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  baseCurrency === 'USD' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                USD
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsImportModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition"
            >
              <span>📥</span> Import Mutasi (CSV/PDF)
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition"
            >
              <span>+</span> Catat Transaksi
            </motion.button>
          </div>
        </header>

        {/* Hero Cards Grid with Framer Motion Stagger */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Worth</p>
            <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">
              {formatCurrency(baseCurrency === 'IDR' ? netWorthIDR : netWorthIDR / USD_IDR_RATE, baseCurrency)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg w-fit border border-emerald-500/20">
              <span>▲ +2.4%</span>
              <span className="text-slate-400">dibanding bulan lalu</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Aset</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-2 tracking-tight">
              {formatCurrency(baseCurrency === 'IDR' ? totalAssetsIDR : totalAssetsIDR / USD_IDR_RATE, baseCurrency)}
            </h3>
            <div className="mt-4 text-xs text-slate-400">
              Kas Cair: <span className="font-semibold text-white">{formatCurrency(liquidityCashIDR)}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Liabilitas (Hutang)</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-2 tracking-tight">
              {formatCurrency(baseCurrency === 'IDR' ? totalDebtsIDR : totalDebtsIDR / USD_IDR_RATE, baseCurrency)}
            </h3>
            <div className="mt-4 text-xs text-slate-400">
              Kartu Kredit & Pinjaman
            </div>
          </motion.div>
        </div>

        {/* SONZI Framework & Financial Health Card */}
        <SonziHealthCard />

        {/* Graphify Wealth Flow Network Chart */}
        <GraphifyWealthChart />

        {/* Account Breakdown & Recent Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts List */}
          <div className="lg:col-span-1 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">
                Daftar Akun & Saldo{' '}
                <span className="ml-1 align-middle text-[10px] font-semibold text-slate-500">
                  · {journalCount} jurnal
                </span>
              </h4>
              <button className="text-xs text-indigo-400 hover:underline">Kelola</button>
            </div>

            <div className="space-y-3">
              {accounts
                .filter((acc) => ['BANK', 'EWALLET', 'CASH', 'INVESTMENT', 'TRADING', 'CREDIT_CARD'].includes(acc.type))
                .map((acc, idx) => (
                <motion.div
                  key={acc.code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350, delay: idx * 0.04 }}
                  whileHover={{ scale: 1.01, x: 2 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-200">{acc.name}</p>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{acc.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-slate-100">{formatCurrency(acc.balanceNative, acc.currency)}</p>
                    {acc.currency !== 'IDR' && Math.abs(acc.balanceBaseIDR) > 0 && (
                      <p className="text-[11px] text-slate-500">≈ {formatCurrency(Math.round(acc.balanceBaseIDR), 'IDR')}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Jurnal Transaksi Terbaru</h4>
              <div className="flex items-center gap-2.5">
                <motion.span
                  key={dataSource}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                    dataSource === 'live'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}
                  title={dataSource === 'live' ? `Snapshot API ${lastSyncAt ?? ''}` : storeError ?? 'Data contoh lokal'}
                >
                  {dataSource === 'live' ? '● LIVE LEDGER' : '◎ DATA CONTOH (API OFFLINE)'}
                </motion.span>
                <button className="text-xs text-indigo-400 hover:underline">Lihat Semua</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800 uppercase tracking-wider">
                    <th className="pb-3">Tanggal</th>
                    <th className="pb-3">Keterangan</th>
                    <th className="pb-3">Akun</th>
                    <th className="pb-3">Sumber</th>
                    <th className="pb-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 text-xs text-slate-400">{tx.date}</td>
                      <td className="py-3 font-medium text-slate-200">
                        {tx.description}
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-slate-600 border border-slate-800 rounded px-1 py-0.5">{tx.type}</span>
                      </td>
                      <td className="py-3 text-xs text-slate-400">{tx.account}</td>
                      <td className="py-3 text-xs whitespace-nowrap">
                        <SourceBadge source={tx.source} />
                      </td>
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

        {/* Transaction Modal Component */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTransaction={handleAddTransaction}
          accounts={accounts}
        />

        {/* Statement Import Staging Modal Component */}
        <StatementImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onPostToLedger={handlePostStagingToLedger}
        />

        {/* Subscription Plan Modal Component */}
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
        />

        {/* Settings → Integrations (konektor MT5 read-only, ADR-022) */}
        <IntegrationsSettingsModal
          isOpen={isIntegrationsOpen}
          onClose={() => setIsIntegrationsOpen(false)}
          onNotify={(msg, kind) => showToast(msg, kind ?? 'info')}
        />

        {/* Command Palette (Cmd + K) Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectAction={handleCommandPaletteAction}
        />

        {/* Obsidian Markdown Vault Journal Modal */}
        <ObsidianJournalModal
          isOpen={isObsidianModalOpen}
          onClose={() => setIsObsidianModalOpen(false)}
          onSaveMarkdown={(note) => showToast('Jurnal Obsidian Vault (.md) berhasil diekspor!', 'success')}
        />
      </main>
    </div>
  );
}

export default function SakuDashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
