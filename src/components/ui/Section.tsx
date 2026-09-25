import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SectionProps {
  id: string
  children: ReactNode
  className?: string
  /** `large` dipakai section yang menjadi sorotan utama halaman. */
  size?: 'default' | 'large'
}

const sizeClasses = {
  default: 'py-16 sm:py-20 lg:py-24',
  large: 'py-20 sm:py-24 lg:py-32',
} as const

/**
 * Consistent section shell. The anchor offset for the sticky navbar is handled
 * once globally via `scroll-padding-top` in `index.css`.
 */
export default function Section({
  id,
  children,
  className,
  size = 'default',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(sizeClasses[size], className)}
    >
      {children}
    </section>
  )
}
