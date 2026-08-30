/**
 * Proxy SAKU (ADR-024 §2.2) — satu-satunya jalan browser bicara ke api-core.
 *
 * Menggantikan rewrite statis lama (next.config.js) karena sekarang proxy harus melakukan
 * satu hal tambahan yang tidak bisa dilakukan rewrite: menerjemahkan cookie `saku_session`
 * (HttpOnly, tak terbaca JavaScript) menjadi header `X-Saku-Session` untuk api-core.
 *
 * Kontrak yang dijaga:
 * - Browser HANYA memakai path relatif `/api/proxy/*`; tidak ada URL absolut/localhost di klien.
 * - api-core tetap menerima identitas lewat header `X-Saku-Session` — kontraknya tidak berubah,
 *   jadi curl/CI/smoke test tetap identik.
 * - Nilai sesi tidak pernah dikembalikan ke JavaScript klien oleh handler ini.
 */
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../session-cookie';
import { API_BASE } from '../../api-base';

export const dynamic = 'force-dynamic';

/** Header yang tidak boleh diteruskan apa adanya ke upstream. */
const HOP_BY_HOP = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'cookie']);

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const search = req.nextUrl.search || '';
  const target = `${API_BASE}/api/v1/${path.join('/')}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  // Cookie HttpOnly → header kontrak api-core. Header eksplisit dari klien tidak menimpa sesi.
  const session = cookies().get(SESSION_COOKIE)?.value;
  if (session) headers.set('x-saku-session', session);
  else headers.delete('x-saku-session');

  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(target, { method, headers, body, cache: 'no-store' });
  } catch {
    return NextResponse.json(
      { message: 'API SAKU tidak dapat dihubungi. Coba lagi sebentar lagi.', statusCode: 502 },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  const res = new NextResponse(text, { status: upstream.status });
  const contentType = upstream.headers.get('content-type');
  if (contentType) res.headers.set('content-type', contentType);
  return res;
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const POST = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PATCH = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PUT = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const DELETE = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
