/**
 * Tiny class name joiner — keeps conditional Tailwind classes readable
 * without pulling in an extra dependency.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ')
}
