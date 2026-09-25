const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

/**
 * Format `YYYY-MM` (dari database) menjadi "Feb 2025".
 * Nilai lain (mis. "2025") dibiarkan apa adanya.
 */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  const match = /^(\d{4})-(\d{1,2})$/.exec(trimmed)
  if (!match) return trimmed

  const year = match[1]
  const month = Number(match[2])
  const label = MONTHS_ID[month - 1]

  return label ? `${label} ${year}` : trimmed
}

/**
 * Rentang waktu pengalaman, mis. "Feb 2025 – Agu 2025".
 * `end` kosong berarti masih berjalan.
 */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  ongoingLabel = 'Sekarang',
): string {
  const from = formatMonthYear(start)
  const to = formatMonthYear(end)

  if (!from && !to) return ''
  if (!from) return to
  return `${from} – ${to || ongoingLabel}`
}

/**
 * Timestamp lengkap, mis. "25 Sep 2026, 14.05" (dipakai "Last Updated" di
 * admin dashboard).
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.trim()

  const day = date.getDate()
  const month = MONTHS_ID[date.getMonth()]
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day} ${month} ${date.getFullYear()}, ${hours}.${minutes}`
}

/**
 * Waktu relatif singkat, mis. "5 menit lalu". Bila lebih dari 30 hari yang
 * lalu, format tanggal biasa yang dipakai.
 */
export function formatRelativeTime(
  value: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.trim()

  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (diffSeconds < 60) return 'baru saja'

  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays <= 30) return `${diffDays} hari lalu`

  return formatDateTime(value)
}

/**
 * Rentang tahun pendidikan, mis. "2023 – Sekarang".
 * Mengembalikan string kosong bila keduanya belum diisi.
 */
export function formatYearRange(
  start: string | null | undefined,
  end: string | null | undefined,
  ongoingLabel = 'Sekarang',
): string {
  const from = start?.trim() ?? ''
  const to = end?.trim() ?? ''

  if (!from && !to) return ''
  if (!from) return to
  if (!to) return `${from} – ${ongoingLabel}`
  return `${from} – ${to}`
}
