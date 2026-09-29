import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark'
type ButtonSize = 'sm' | 'md' | 'lg'

interface CommonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** Optional leading/trailing icon. */
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  /** Kelas tambahan untuk ikon, mis. `animate-spin` saat tombol memuat. */
  iconClassName?: string
  fullWidth?: boolean
  className?: string
}

type AnchorProps = CommonProps & {
  href: string
} & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'className' | 'children'>

type NativeButtonProps = CommonProps & {
  href?: undefined
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'>

export type ButtonProps = AnchorProps | NativeButtonProps

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-700 hover:shadow-lift dark:bg-brand-400 dark:text-navy dark:hover:bg-brand-300',
  secondary:
    'border border-line bg-white text-navy shadow-soft hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-400/50 dark:hover:bg-slate-700 dark:hover:text-brand-300',
  ghost: 'text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-800',
  onDark: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
}

const baseClasses =
  'inline-flex items-center justify-center rounded-pill font-semibold whitespace-nowrap transition duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 dark:focus-visible:ring-brand-400 dark:focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-60 motion-safe:hover:-translate-y-0.5'

/**
 * Renders an `<a>` when `href` is provided, otherwise a `<button>`.
 * Keeps hover/focus styling consistent across the site.
 */
export default function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'right',
    iconClassName,
    fullWidth = false,
    className,
    ...rest
  } = props

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {Icon && iconPosition === 'left' ? (
        <Icon aria-hidden="true" className={cn('h-4 w-4', iconClassName)} />
      ) : null}
      <span>{children}</span>
      {Icon && iconPosition === 'right' ? (
        <Icon aria-hidden="true" className={cn('h-4 w-4', iconClassName)} />
      ) : null}
    </>
  )

  if (typeof props.href === 'string') {
    const anchorProps = rest as ComponentPropsWithoutRef<'a'>

    return (
      <a href={props.href} className={classes} {...anchorProps}>
        {content}
      </a>
    )
  }

  const buttonProps = rest as ComponentPropsWithoutRef<'button'>

  return (
    <button
      type={buttonProps.type ?? 'button'}
      className={classes}
      {...buttonProps}
    >
      {content}
    </button>
  )
}
