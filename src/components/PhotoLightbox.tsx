import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface PhotoLightboxProps {
  src: string
  alt: string
  caption?: string
  onClose: () => void
}

/**
 * Full-size preview of the profile photo. Mounted only while open, so focus
 * handling and the scroll lock live in a single effect.
 */
export default function PhotoLightbox({
  src,
  alt,
  caption,
  onClose,
}: PhotoLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${alt}`}
      onClick={onClose}
      className="animate-reveal fixed inset-0 z-[70] flex items-center justify-center bg-navy/80 p-5 backdrop-blur-sm"
    >
      <div
        className="relative w-full max-w-md sm:max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="aspect-square w-full rounded-[2rem] border border-white/10 bg-white object-cover shadow-lift"
        />

        {caption ? (
          <p className="mt-3 text-center text-xs text-slate-300">{caption}</p>
        ) : null}

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup preview foto"
          className="absolute -top-3 -right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-navy shadow-lift transition duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
