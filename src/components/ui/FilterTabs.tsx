import { cn } from '../../lib/cn'

export interface FilterOption<T extends string> {
  id: T
  label: string
  count?: number
}

interface FilterTabsProps<T extends string> {
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/** Segmented pill filter reused by the Experience and Projects sections. */
export default function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-pill border border-line bg-white p-1 shadow-soft',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.id === value

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
              isActive
                ? 'bg-brand-600 text-white shadow-soft'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded-pill px-1.5 text-[11px] tabular-nums',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
