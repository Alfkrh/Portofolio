/**
 * Kelas input standar dashboard admin.
 *
 * Dipisah dari `AdminForm.tsx` supaya file komponen tetap hanya mengekspor
 * komponen (aturan react-refresh), dan supaya form admin yang dibuat khusus
 * (mis. halaman Experience) memakai tampilan input yang sama persis.
 */

import { cn } from '../../lib/cn'

const inputBase =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-navy shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] transition duration-200 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-surface'

/** Kelas input admin; `hasError` mengubah warna border menjadi merah. */
export function fieldInputClasses(hasError = false) {
  return cn(inputBase, hasError ? 'border-red-300' : 'border-line')
}
