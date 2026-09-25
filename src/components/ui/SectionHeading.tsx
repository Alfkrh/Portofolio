import { cn } from '../../lib/cn'

interface SectionHeadingProps {
  title: string
  eyebrow?: string
  subtitle?: string
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
  className?: string
}

/** Eyebrow + title + subtitle block shared by every section. */
export default function SectionHeading({
  title,
  eyebrow,
  subtitle,
  align = 'left',
  tone = 'light',
  className,
}: SectionHeadingProps) {
  const isDark = tone === 'dark'

  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow ? (
        <span
          className={cn(
            'inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.18em] uppercase',
            isDark ? 'text-brand-300' : 'text-brand-600',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-px w-6',
              isDark ? 'bg-brand-300/60' : 'bg-brand-600/50',
            )}
          />
          {eyebrow}
        </span>
      ) : null}

      <h2
        className={cn(
          'mt-3 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl',
          isDark && 'text-white',
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed',
            isDark ? 'text-slate-300' : 'text-slate-500',
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
