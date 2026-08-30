/**
 * Satu tempat untuk format angka uang di UI (laporan audit ponytail #8 — handoff §12.2).
 *
 * Sebelumnya pola yang sama diulang di 7 titik (SonziHealthCard ×3, IntegrationsSettingsModal ×2,
 * StatementImportModal ×1, page.tsx ×1) sementara `formatCurrency()` yang sudah ada di page.tsx
 * memakai dua dialek berbeda. Sekarang: dua helper, satu sumber.
 *
 * ponytail: helper murni (tanpa state, tanpa dependensi UI). Plafon: dua dialek tampilan
 * (angka broker vs rupiah mutasi) — cukup untuk fase single-currency display.
 * Jalur upgrade (butuh keputusan user): kalau kurs mulai dikirim API (#9 ideal), format
 * mengikuti mata uang dari snapshot, bukan diasumsikan di sini.
 */

/**
 * Angka broker (equity / balance / margin): pemisah ribuan gaya US, minimal 2 desimal.
 *
 * Opsi disalin **persis** dari pemakaian lama — TANPA `maximumFractionDigits` (bawaan 3) —
 * supaya keluaran per angka tetap identik. Ini pembersihan duplikasi, BUKAN ubah tampilan.
 */
export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

/** Rupiah untuk baris mutasi/statement: pemisah ribuan gaya Indonesia. */
export function formatRupiah(value: number): string {
  return value.toLocaleString('id-ID');
}
