/**
 * Terapkan pengaturan situs (tabel `settings`) ke dokumen: judul tab browser,
 * meta description, dan favicon.
 *
 * Nilai berasal dari database sehingga perubahan di dashboard (Settings →
 * Portfolio) langsung terpakai tanpa build ulang.
 */

import { useEffect } from 'react'
import {
  SITE_SETTING_DEFAULTS,
  siteSetting,
  type SiteSettings,
} from '../config/siteSettings'

function applyMetaTag(name: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  )

  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

function applyFavicon(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  link.removeAttribute('type')
  link.setAttribute('href', href)
}

/**
 * @param settings Pengaturan dari database.
 * @param fallbackTitle Judul cadangan bila `site.title` sengaja dikosongkan
 *   (mis. diturunkan dari data profil).
 */
export function useSiteMeta(
  settings: SiteSettings | undefined,
  fallbackTitle?: string,
): void {
  // Judul eksplisit dari pengaturan menang; fallback hanya dipakai bila kosong.
  const configuredTitle = settings?.['site.title']?.trim()
  const title =
    configuredTitle && configuredTitle.length > 0
      ? configuredTitle
      : (fallbackTitle ?? SITE_SETTING_DEFAULTS['site.title'])
  const description = siteSetting(settings, 'site.description')
  const favicon = siteSetting(settings, 'site.favicon_url')

  useEffect(() => {
    document.title = title
    applyMetaTag('description', description)
    applyFavicon(favicon)
  }, [description, favicon, title])
}
