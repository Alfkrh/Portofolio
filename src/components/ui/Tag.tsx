import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type TagTone = 'brand' | 'neutral' | 'dark'

interface TagProps {
  children: ReactNode
  tone?: TagTone
  className?: string
}

const toneClasses: Record<TagTone, string> = {
  brand: 'border-brand-100 bg-brand-50/70 text-brand-700',
  neutral: 'border-line bg-white text-slate-600',
  dark: 'border-white/10 bg-white/5 text-slate-200',
}

/** Small pill used for skills, categories, and metadata. */
export default function Tag({ children, tone = 'brand', className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-3 py-1 text-xs font-medium transition duration-200',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
