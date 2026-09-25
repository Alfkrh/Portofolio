import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '../../lib/cn'

interface PlaceholderNoteProps {
  children: ReactNode
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Marks content that has not been filled in yet. Used instead of inventing
 * information — the owner can replace the source data in `src/data/portfolio.ts`.
 */
export default function PlaceholderNote({
  children,
  tone = 'light',
  className,
}: PlaceholderNoteProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border border-dashed px-3 py-1 text-xs font-medium',
        tone === 'dark'
          ? 'border-white/20 text-slate-300'
          : 'border-line text-slate-400',
        className,
      )}
    >
      <Info aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}
