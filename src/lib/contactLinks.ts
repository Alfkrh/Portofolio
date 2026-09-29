/**
 * Perapian tautan kontak yang disimpan di database.
 *
 * Kolom `url` diisi apa adanya dari dashboard. Kasus yang paling sering:
 * pemilik website menulis alamat email polos (`nama@email.com`) sehingga
 * tautannya jadi relatif dan berujung 404. Fungsi di sini membetulkan tautan
 * seperti itu menjadi `mailto:` — data di database tidak diubah.
 */

const EMAIL_PATTERN = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/

/** `true` bila tautan menuju situs lain (dibuka di tab baru). */
export function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

/** `href` siap pakai untuk sebuah kanal kontak. */
export function contactHref(url: string): string {
  const trimmed = url.trim()
  if (trimmed.length === 0) return trimmed

  // Sudah punya skema (http, https, mailto, tel, …) → pakai apa adanya.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed

  // Alamat email polos → jadikan tautan email.
  if (EMAIL_PATTERN.test(trimmed)) return `mailto:${trimmed}`

  return trimmed
}
