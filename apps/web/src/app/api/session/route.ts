/**
 * Session endpoints web (ADR-024 §2.2) — satu-satunya tempat nilai sesi disentuh.
 *
 *   POST   /api/session   { identifier, code } → verify-otp ke api-core, lalu SET cookie
 *                          `saku_session` HttpOnly. Nilai sesi TIDAK dikembalikan ke klien.
 *   DELETE /api/session    → POST /auth/logout ke api-core + hapus cookie. Idempoten.
 *
 * Kenapa di sini, bukan di klien: token yang disimpan di localStorage/Redux dapat dibaca skrip
 * apa pun. Cookie HttpOnly menutup kelas serangan itu tanpa mengubah kontrak api-core.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../session-cookie';
import { API_BASE } from '../api-base';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: { identifier?: string; code?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: 'Permintaan tidak valid.' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: payload.identifier, code: payload.code }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'API SAKU tidak dapat dihubungi. Coba lagi sebentar lagi.' },
      { status: 502 }
    );
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    sakuSession?: string;
    sakuSessionExpiresAt?: string;
    ownerId?: string;
    message?: string;
  };

  if (!upstream.ok || !data.sakuSession) {
    return NextResponse.json(
      { message: data.message || 'Kode OTP salah atau telah kadaluarsa.' },
      { status: upstream.ok ? 502 : upstream.status }
    );
  }

  // Hanya metadata yang boleh kembali ke browser — nilai sesi tetap di sisi server.
  const res = NextResponse.json({
    message: 'Autentikasi berhasil',
    ownerId: data.ownerId ?? 'user-local',
    expiresAt: data.sakuSessionExpiresAt ?? null,
  });

  const expiresAt = data.sakuSessionExpiresAt ? Date.parse(data.sakuSessionExpiresAt) : NaN;
  const maxAge = Number.isFinite(expiresAt)
    ? Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
    : 7 * 24 * 60 * 60;

  res.cookies.set({
    name: SESSION_COOKIE,
    value: data.sakuSession,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
  return res;
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'x-saku-session': session },
        cache: 'no-store',
      });
    } catch {
      // Logout server best-effort: cookie tetap dibuang agar browser pasti kehilangan sesi.
    }
  }
  const res = NextResponse.json({ message: 'Sesi diakhiri.' });
  res.cookies.set({ name: SESSION_COOKIE, value: '', httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

/** Status sesi untuk UI — hanya boolean, tidak pernah nilai sesinya. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ authenticated: Boolean(req.cookies.get(SESSION_COOKIE)?.value) });
}
