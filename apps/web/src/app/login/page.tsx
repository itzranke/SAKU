'use client';

/**
 * Halaman login SAKU (ADR-024 §2.3) — OTP dua langkah.
 *
 * Kontrak keamanan halaman ini:
 * - Nilai sesi TIDAK PERNAH menyentuh JavaScript: `/api/session` menaruhnya di cookie HttpOnly.
 * - Tidak ada localStorage, tidak ada Redux, tidak ada URL absolut — semua lewat path relatif.
 * - Kode OTP hanya hidup di state komponen dan dibersihkan setelah verifikasi.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'identifier' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Gagal mengirim kode OTP.');
      setInfo(data.message || 'Kode OTP telah dikirim.');
      setStep('code');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Kode OTP salah atau telah kadaluarsa.');
      setCode('');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <h1 className="text-2xl font-semibold text-slate-100">Masuk ke SAKU</h1>
        <p className="mt-2 text-sm text-slate-400">
          {step === 'identifier'
            ? 'Masukkan email atau nomor Anda untuk menerima kode sekali pakai.'
            : `Masukkan 6 digit kode yang dikirim ke ${identifier}.`}
        </p>

        {step === 'identifier' ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="nama@contoh.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={busy || identifier.trim().length < 3}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Mengirim…' : 'Kirim kode OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 tracking-[0.4em] text-slate-100 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Memverifikasi…' : 'Masuk'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('identifier');
                setCode('');
                setError(null);
              }}
              className="w-full text-sm text-slate-400 underline-offset-2 hover:underline"
            >
              Ganti email/nomor
            </button>
          </form>
        )}

        {info && !error ? <p className="mt-4 text-sm text-emerald-400">{info}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <p className="mt-6 text-xs text-slate-500">
          SAKU tidak pernah meminta password broker di halaman ini. Kredensial MT5 hanya berupa
          investor password (read-only) dan diisi di Settings → Integrations.
        </p>
      </div>
    </main>
  );
}
