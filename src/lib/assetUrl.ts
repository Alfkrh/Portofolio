/**
 * URL berkas yang disimpan di server (foto profil, thumbnail project, favicon
 * hasil unggahan).
 *
 * File-nya ada di storage server dan database hanya menyimpan path relatifnya
 * (`/uploads/nama-file.png`) supaya data tidak terikat ke satu domain. Saat
 * frontend dan API berada di origin berbeda — mis. frontend di Vercel dan API
 * di Render — path relatif itu menunjuk ke domain frontend dan gambarnya 404.
 * Fungsi ini mengarahkannya ke origin API.
 *
 * Hanya `/uploads/...` yang diubah: aset frontend seperti `/favicon.svg` tetap
 * dibaca dari domain frontend, dan URL luar (`https://…`) dibiarkan apa adanya.
 */

import { API_ORIGIN } from '../config/apiBase'

export function assetUrl(path: string): string {
  if (!path.startsWith('/uploads/')) return path
  return `${API_ORIGIN}${path}`
}
