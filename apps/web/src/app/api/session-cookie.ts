/**
 * Nama cookie sesi (ADR-024 §2.2). Berada di modul sendiri karena file `route.ts` Next.js
 * hanya boleh mengekspor handler HTTP — ekspor lain membuat `next build` gagal.
 */
export const SESSION_COOKIE = 'saku_session';
