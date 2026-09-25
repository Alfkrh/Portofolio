import { useEffect, useRef, useState } from 'react'

interface UseRevealOptions {
  /** How much of the element must be visible before revealing. */
  threshold?: number
  /** Shrinks the viewport so elements reveal slightly before the edge. */
  rootMargin?: string
}

/**
 * Reveals an element once it scrolls into view. The observer unobserves after
 * the first intersection, so the animation runs only once and stays cheap.
 */
export function useReveal<T extends HTMLElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
}: UseRevealOptions = {}) {
  const ref = useRef<T | null>(null)
  // Without IntersectionObserver support, content starts revealed.
  const [isVisible, setIsVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, isVisible }
}
