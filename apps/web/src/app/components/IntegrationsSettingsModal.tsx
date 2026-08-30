'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  apiErrorMessage,
  useAccountStateQuery,
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useListIntegrationsQuery,
  usePatchIntegrationMutation,
  useSyncNowMutation,
  useTestIntegrationMutation,
} from '../store/integrationApi';
import { useSakuDispatch } from '../store/hooks';
import { fetchSnapshot } from '../store/ledgerSlice';
import { formatMoney } from '../format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string, kind?: 'success' | 'warning' | 'info') => void;
}

/**
 * Settings → Integrations (M5 / ADR-022).
 *
 * Password policy, enforced in the UI as well as the API:
 *  - only an **investor password (read-only)** is accepted — the field label says so;
 *  - value kept in this component's local state only, wiped right after submit;
 *  - never dispatched to Redux, never persisted (no localStorage/sessionStorage),
 *    never rendered back after save (the API only returns `hasCredential`).
 */
export function IntegrationsSettingsModal({ isOpen, onClose, onNotify }: Props) {
  const dispatch = useSakuDispatch();
  const { data: list, isError: listError, error: listErr, refetch: refetchList } = useListIntegrationsQuery(undefined, { skip: !isOpen });
  const { data: state, refetch: refetchState } = useAccountStateQuery(undefined, { skip: !isOpen });
  const [createIntegration, createStatus] = useCreateIntegrationMutation();
  const [patchIntegration] = usePatchIntegrationMutation();
  const [deleteIntegration] = useDeleteIntegrationMutation();
  const [testIntegration] = useTestIntegrationMutation();
  const [syncNow, syncStatus] = useSyncNowMutation();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [login, setLogin] = useState('');
  const [server, setServer] = useState('');
  const [port, setPort] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [probing, setProbing] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      // Belt-and-braces: never leave a typed credential in memory after closing.
      setInvestorPassword('');
      setShowForm(false);
      setFormError(null);
    }
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!login.trim() || !server.trim()) {
      setFormError('Login dan nama server wajib diisi (contoh: 50123456 @ Exness-MT5Real42).');
      return;
    }
    if (!investorPassword) {
      setFormError('Investor password (read-only) wajib diisi — SAKU tidak menyimpan trader/master password.');
      return;
    }
    try {
      const res = await createIntegration({
        type: 'MT5_CLOUD',
        label: label.trim() || `${login.trim()} @ ${server.trim()}`,
        login: login.trim(),
        server: server.trim(),
        port: port.trim() ? Number(port.trim()) : null,
        investor_password: investorPassword,
      }).unwrap();
      // Wipe immediately — the store must never see this value.
      setInvestorPassword('');
      setLabel('');
      setLogin('');
      setServer('');
      setPort('');
      setShowForm(false);
      onNotify?.(`Koneksi "${res.integration.label}" tersimpan (terenkripsi AES-256-GCM). ${res.notice}`, 'success');
      refetchList();
      refetchState();
    } catch (err) {
      setFormError(apiErrorMessage(err));
      setInvestorPassword('');
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    await patchIntegration({ id, body: { enabled } });
    refetchList();
    refetchState();
  };

  const probe = async (id: string) => {
    setProbing((p) => ({ ...p, [id]: 'Menguji koneksi read-only…' }));
    try {
      const res = await testIntegration(id).unwrap();
      setProbing((p) => {
        const next = { ...p };
        next[id] = res.ok
          ? `✓ ${res.message}${res.snapshot ? ` · Equity ${res.snapshot.currency} ${formatMoney(res.snapshot.equity)}` : ''}`
          : `✗ ${res.message}`;
        return next;
      });
      refetchState();
    } catch (err) {
      setProbing((p) => ({ ...p, [id]: `✗ ${apiErrorMessage(err)}` }));
    }
  };

  const remove = async (id: string, name: string) => {
    await deleteIntegration(id);
    onNotify?.(`Koneksi "${name}" diputus. Putar ulang investor password-nya juga di broker, ya.`, 'info');
    refetchList();
    refetchState();
  };

  const runSyncNow = async () => {
    try {
      const res = await syncNow().unwrap();
      refetchState();
      dispatch(fetchSnapshot());
      onNotify?.(
        res.provider === 'null'
          ? 'Konektor cloud mati di server (MT5_CLOUD_ENABLED=false) — jalur import statement tetap jalan.'
          : `Sync selesai: ${res.journalized} jurnal baru, ${res.skipped} entri yang sudah ada dilewati.`,
        res.provider === 'null' ? 'info' : 'success'
      );
    } catch (err) {
      onNotify?.(apiErrorMessage(err), 'warning');
    }
  };

  const integrations = list?.integrations ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0E1322] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Settings → Integrations</h3>
                <p className="text-xs text-slate-400">
                  MT5 ditarik <strong> dari sisi server</strong> pakai <strong>investor password (read-only)</strong> — tidak ada
                  yang diinstal di terminal, tidak ada yang perlu dibiarkan menyala.
                </p>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {/* Connector status strip (reads /trading/account-state; empty state, not an error) */}
            <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs">
              {listError ? (
                <p className="text-amber-300">
                  ⚠ SAKU API tidak terjangkau ({String((listErr as any)?.error ?? 'network')} — panel ini tetap aman dipakai untuk melihat
                  struktur, tapi simpan koneksi saat API sudah jalan.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className={state?.enabled ? 'text-emerald-400' : 'text-slate-400'}>
                    {state?.enabled ? `● Konektor aktif (${state.provider})` : `○ Konektor mati (${state?.provider ?? '…'})`}
                  </span>
                  {state?.state ? (
                    <span className="text-slate-300">
                      Equity {state.state.currency} {formatMoney(state.state.equity)} ·{' '}
                      {state.state.updatedAt ? `${Math.max(0, Math.round((Date.now() - Date.parse(state.state.updatedAt)) / 1000))} dtk lalu` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-500">{state?.notice ?? ''}</span>
                  )}
                  <button
                    onClick={runSyncNow}
                    disabled={syncStatus.isLoading}
                    className="ml-auto rounded-lg border border-indigo-500/30 bg-indigo-600/15 px-2.5 py-1 font-semibold text-indigo-300 hover:bg-indigo-600/25 disabled:opacity-50"
                  >
                    {syncStatus.isLoading ? 'Syncing…' : 'Sync now'}
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="space-y-3">
              {integrations.length === 0 && !listError && (
                <p className="rounded-xl border border-dashed border-slate-800 p-4 text-xs text-slate-500">
                  Belum ada koneksi. Tambah satu akun MT5 (login + server + <em>investor password</em>) atau tetap pakai{' '}
                  <strong>import statement/CSV</strong> — dua-duanya masuk ke jurnal yang sama.
                </p>
              )}
              {integrations.map((it) => (
                <div key={it.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">{it.label}</p>
                      <p className="text-[11px] text-slate-500">
                        {it.login}@{it.server}
                        {it.port ? `:${it.port}` : ''} · {it.type} ·{' '}
                        <span className="text-emerald-400/80">
                          {it.credentialMode} · {it.credentialAlgorithm}
                        </span>
                      </p>
                      {probing[it.id] && <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-300">{probing[it.id]}</p>}
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-slate-400">
                      <input type="checkbox" checked={it.enabled} onChange={(e) => toggle(it.id, e.target.checked)} className="accent-indigo-500" />
                      aktif
                    </label>
                    <button onClick={() => probe(it.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-indigo-500/40 hover:text-white">
                      Test connection
                    </button>
                    <button onClick={() => remove(it.id, it.label)} className="rounded-lg border border-rose-500/25 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10">
                      Putuskan
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add form */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 w-full rounded-xl border border-dashed border-indigo-500/30 bg-indigo-600/5 p-3 text-sm font-semibold text-indigo-300 hover:bg-indigo-600/10"
              >
                + Add MT5
              </button>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Koneksi MT5 baru (read-only)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Label" value={label} onChange={setLabel} placeholder="Exness Real" />
                  <Field label="Login (account number)" value={login} onChange={setLogin} placeholder="50123456" required />
                  <Field label="Server" value={server} onChange={setServer} placeholder="Exness-MT5Real42" required />
                  <Field label="Port (opsional)" value={port} onChange={setPort} placeholder="443" inputMode="numeric" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Investor password (read-only) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={investorPassword}
                    onChange={(e) => setInvestorPassword(e.target.value)}
                    // Write-only hygiene: no autofill, no history, no copy.
                    autoComplete="new-password"
                    name={`saku-investor-${Date.now()}`}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    placeholder="hanya password read-only — password trading/master ditolak"
                    className="w-full rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500/50"
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    Dibuat di MT5: <em>Tools → Options → Servers → (account) → Investor password</em>. Dientsikan AES-256-GCM di server, hanya untuk
                    membaca. Nilai ini tidak pernah disimpan di browser, tidak masuk Redux/localStorage, dan tidak dikembalikan API.
                  </p>
                </div>
                {formError && <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-[11px] text-rose-300">{formError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={createStatus.isLoading}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {createStatus.isLoading ? 'Menyimpan…' : 'Simpan koneksi'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setInvestorPassword(''); setFormError(null); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white">
                    Batal
                  </button>
                </div>
              </form>
            )}

            <p className="mt-5 text-[10px] leading-relaxed text-slate-600">
              Server tidak didukung? Pakai <strong>import statement/CSV MT5</strong> (fallback resmi). EA push lama tetap diterima tapi dicatat{' '}
              <code className="text-amber-500/80">EA_LEGACY</code> dan ditandai deprecated — lihat ADR-022.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: 'text' | 'numeric';
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-400">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500/50"
      />
    </div>
  );
}
