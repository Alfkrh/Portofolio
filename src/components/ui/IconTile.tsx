import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type IconTileSize = 'sm' | 'md' | 'lg'
type IconTileTone = 'soft' | 'solid' | 'onDark'

interface IconTileProps {
  icon: LucideIcon
  size?: IconTileSize
  tone?: IconTileTone
  className?: string
}

/**
 * Kotak ikon yang dipakai konsisten di seluruh halaman.
 *
 * Tangga ukuran (dipakai seragam agar tidak ada radius/ukuran acak):
 *   sm → h-8 w-8,  rounded-xl,  ikon 16px  (kartu mini)
 *   md → h-10 w-10, rounded-xl, ikon 20px  (kartu & baris kontak)
 *   lg → h-12 w-12, rounded-2xl, ikon 24px (kartu pendidikan)
 */
const sizeClasses: Record<IconTileSize, string> = {
  sm: 'h-8 w-8 rounded-xl',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
}

const iconSizeClasses: Record<IconTileSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const toneClasses: Record<IconTileTone, string> = {
  soft: 'bg-brand-50 text-brand-600',
  solid: 'bg-brand-600 text-white shadow-soft',
  onDark: 'border border-white/10 bg-white/5 text-brand-300',
}

export default function IconTile({
  icon: Icon,
  size = 'md',
  tone = 'soft',
  className,
}: IconTileProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center transition duration-200',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className={iconSizeClasses[size]} />
    </span>
  )
}
