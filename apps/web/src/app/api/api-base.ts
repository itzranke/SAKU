/**
 * Satu definisi basis URL api-core untuk semua route handler web (audit #10).
 *
 * Kenapa modul sendiri, bukan diekspor dari `route.ts`: file rute Next.js HANYA boleh
 * mengekspor handler HTTP — ekspor lain membuat `next build` gagal (jebakan §11.5 #2).
 * Pola yang sama sudah dipakai `session-cookie.ts`.
 *
 * Catatan keamanan: ini basis URL **server-side** (route handler), BUKAN URL yang
 * dipanggil browser. Klien tetap hanya memakai path relatif `/api/proxy/*`, jadi
 * `localhost` di sini tidak pernah sampai ke kode browser.
 */
export const API_BASE = process.env.SAKU_API_INTERNAL_URL || 'http://localhost:4000';
