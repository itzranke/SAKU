/**
 * OwnerGuard (ADR-023 fase 1) — resolusi `ownerId` per request, global & aditif.
 *
 * Setiap request dapat `req.ownerId`:
 *   header/cookie sesi valid → owner dari sesi;
 *   tanpa sesi / token asing / kadaluarsa → `LOCAL_OWNER` ('user-local') — nilai kontrak lama,
 *   jadi seluruh tes, CI, dan klien eksisting tidak berubah perilaku.
 *
 * `SAKU_AUTH_ENFORCE=true` (default FALSE): endpoint ber-metadata `@OwnerScoped()` menolak
 * request tanpa sesi valid dengan 401 ramah. Default off agar CI/unit-test/repro lokal tetap
 * jalan tanpa login (ADR-023 §2.2).
 *
 * `ownerId` TIDAK PERNAH diambil dari klien (body/query diabaikan — deprecated). Inilah yang
 * menutup lubang "POST /integrations dengan owner apa pun" yang dicatat ADR-023 §1.
 */
import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LOCAL_OWNER, SessionService } from './session.service';

export const OWNER_SCOPED_KEY = 'saku:owner-scoped';
/** Tandai controller/route yang wajib sesi saat `SAKU_AUTH_ENFORCE=true`. */
export const OwnerScoped = () => SetMetadata(OWNER_SCOPED_KEY, true);

/** Bentuk minimal request yang dipakai guard + controller (struktural, tanpa dep express). */
export interface RequestWithOwner {
  headers: { 'x-saku-session'?: string | string[] };
  ownerId?: string;
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithOwner>();
    const owner = this.sessions.resolve(req.headers?.['x-saku-session']);
    req.ownerId = owner ?? LOCAL_OWNER;

    const enforce = process.env.SAKU_AUTH_ENFORCE === 'true';
    const ownerScoped = this.reflector.getAllAndOverride<boolean>(OWNER_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (enforce && ownerScoped && !owner) {
      throw new UnauthorizedException(
        'Sesi tidak valid atau kadaluarsa. Login ulang (POST /auth/verify-otp) lalu kirim header X-Saku-Session.'
      );
    }
    return true;
  }
}
