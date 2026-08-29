/**
 * OwnerGuard (ADR-023): req.ownerId = sesi → owner; tanpa sesi → 'user-local' (kontrak lama).
 * SAKU_AUTH_ENFORCE=true hanya menolak endpoint ber-@OwnerScoped tanpa sesi (401 ramah).
 */
import { describe, expect, it, afterEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { OwnerGuard, OWNER_SCOPED_KEY } from './owner.guard';
import { SessionService } from './session.service';

function makeContext(headers: Record<string, unknown>) {
  const req: { headers: Record<string, unknown>; ownerId?: string } = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => function handler() {},
    getClass: () => class HandlerClass {},
  } as unknown as ExecutionContext;
  return { req, context };
}

const reflectorScoped = (scoped: boolean) =>
  ({ getAllAndOverride: (key: string) => (key === OWNER_SCOPED_KEY ? scoped : false) }) as any;

describe('OwnerGuard (ADR-023)', () => {
  const prevEnforce = process.env.SAKU_AUTH_ENFORCE;
  afterEach(() => {
    if (prevEnforce === undefined) delete process.env.SAKU_AUTH_ENFORCE;
    else process.env.SAKU_AUTH_ENFORCE = prevEnforce;
  });

  const sessions = new SessionService();

  it('tanpa header sesi → owner fallback user-local (perilaku lama), guard lolos', () => {
    const guard = new OwnerGuard(sessions, reflectorScoped(true));
    const { req, context } = makeContext({});
    expect(guard.canActivate(context)).toBe(true);
    expect(req.ownerId).toBe('user-local');
  });

  it('header X-Saku-Session valid → owner dari sesi (bentuk array pun diterima)', () => {
    const guard = new OwnerGuard(sessions, reflectorScoped(true));
    const { token } = sessions.issue('owner-sesi');
    const a = makeContext({ 'x-saku-session': token });
    expect(guard.canActivate(a.context)).toBe(true);
    expect(a.req.ownerId).toBe('owner-sesi');
    const b = makeContext({ 'x-saku-session': [token] });
    expect(guard.canActivate(b.context)).toBe(true);
    expect(b.req.ownerId).toBe('owner-sesi');
  });

  it('token asing → fallback user-local, guard tetap lolos (enforce off)', () => {
    const guard = new OwnerGuard(sessions, reflectorScoped(true));
    const { req, context } = makeContext({ 'x-saku-session': 'token-palsu' });
    expect(guard.canActivate(context)).toBe(true);
    expect(req.ownerId).toBe('user-local');
  });

  it('SAKU_AUTH_ENFORCE=true + @OwnerScoped + tanpa sesi → 401 dengan pesan ramah', () => {
    process.env.SAKU_AUTH_ENFORCE = 'true';
    const guard = new OwnerGuard(sessions, reflectorScoped(true));
    const { context } = makeContext({});
    expect(() => guard.canActivate(context)).toThrowError(/X-Saku-Session/);
  });

  it('SAKU_AUTH_ENFORCE=true + sesi valid → lolos; route tanpa @OwnerScoped tetap terbuka', () => {
    process.env.SAKU_AUTH_ENFORCE = 'true';
    const { token } = sessions.issue('owner-sesi');
    const scoped = new OwnerGuard(sessions, reflectorScoped(true));
    const ok = makeContext({ 'x-saku-session': token });
    expect(scoped.canActivate(ok.context)).toBe(true);

    const open = new OwnerGuard(sessions, reflectorScoped(false));
    const openReq = makeContext({});
    expect(open.canActivate(openReq.context)).toBe(true);
    expect(openReq.req.ownerId).toBe('user-local');
  });
});
