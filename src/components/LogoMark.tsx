/**
 * Mark logo situs: badge squircle bergradien dengan monogram "A".
 *
 * Geometrinya identik dengan `public/favicon.svg` (ikon tab browser) — bila
 * mark berubah, ubah keduanya supaya tab dan navbar tetap sama.
 *
 * Warnanya sengaja tetap (bukan `currentColor`) karena badge ini dipakai di
 * latar terang maupun gelap: navbar putih, footer, dan sidebar admin navy.
 */

import { useId } from 'react'
import { cn } from '../lib/cn'

interface LogoMarkProps {
  className?: string
  /** Bila diisi, mark diberi label aksesibilitas; kalau kosong dianggap dekoratif. */
  title?: string
  /**
   * URL logo yang diunggah dari dashboard (Settings → Browser favicon).
   * Bila diisi, gambar itu dipakai sebagai mark; mark bawaan hanya jadi
   * cadangan saat pengaturan situs masih memakai `/favicon.svg`.
   */
  src?: string | null
}

export default function LogoMark({ className, title, src }: LogoMarkProps) {
  // Id gradien harus unik per instance supaya beberapa mark tidak saling menimpa.
  const uid = useId().replace(/:/g, '')
  const tileId = `logo-tile-${uid}`
  const sheenId = `logo-sheen-${uid}`

  if (src) {
    // Tile membulat dengan `overflow-hidden` supaya logo apa pun (termasuk yang
    // berlatar putih) tampil rapi seperti ikon aplikasi, bukan kotak mentah.
    return (
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-[28%] bg-white ring-1 ring-navy/10 dark:ring-white/15',
          className,
        )}
      >
        <img
          src={src}
          alt={title ?? ''}
          aria-hidden={title ? undefined : true}
          className="h-full w-full object-cover"
        />
      </span>
    )
  }

  return (
    <svg
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className={cn('h-8 w-8 shrink-0', className)}
    >
      {title ? <title>{title}</title> : null}

      <defs>
        <linearGradient
          id={tileId}
          x1="4"
          y1="2"
          x2="60"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.5" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient
          id={sheenId}
          x1="32"
          y1="2"
          x2="32"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${tileId})`} />
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${sheenId})`} />

      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 51.5 32 12.5l13 39" />
        <path d="M24.7 40.5h14.6" />
      </g>
    </svg>
  )
}
