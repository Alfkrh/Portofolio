/**
 * Pengaturan tingkat situs (tabel `settings`), dipakai bersama oleh server dan
 * frontend supaya nilai bawaan serta nama key tidak pernah berbeda.
 *
 * Nilai disimpan sebagai key/value teks di database sehingga bisa diubah dari
 * dashboard (Settings → Portfolio) tanpa mengubah kode.
 */

/** Key pengaturan yang boleh dibaca & ditulis lewat API. */
export const SITE_SETTING_KEYS = [
  'site.name',
  'site.title',
  'site.description',
  'site.favicon_url',
] as const

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number]

export type SiteSettings = Partial<Record<SiteSettingKey, string>>

export function isSiteSettingKey(value: string): value is SiteSettingKey {
  return (SITE_SETTING_KEYS as readonly string[]).includes(value)
}

/**
 * Nilai bawaan: dipakai saat tabel `settings` masih kosong dan sebagai
 * fallback di UI bila sebuah key belum pernah diisi.
 */
export const SITE_SETTING_DEFAULTS: Record<SiteSettingKey, string> = {
  'site.name': 'Alif Fikri',
  'site.title': 'Alif Fikri — Information Systems Student & Digital Creative',
  'site.description':
    'Portfolio pribadi Alif Fikri — mahasiswa Sistem Informasi yang berfokus pada UI/UX Design, Web Development, dan teknologi digital.',
  'site.favicon_url': '/favicon.svg',
}

/** Ambil nilai pengaturan dengan fallback ke nilai bawaan. */
export function siteSetting(
  settings: SiteSettings | undefined,
  key: SiteSettingKey,
): string {
  const value = settings?.[key]
  return value && value.trim().length > 0 ? value : SITE_SETTING_DEFAULTS[key]
}
