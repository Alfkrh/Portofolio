/**
 * Penyimpanan sesi admin di browser.
 *
 * Token login disimpan di `localStorage` supaya sesi bertahan setelah tab atau
 * browser ditutup ("persistent"), lengkap dengan waktu kedaluwarsanya. Server
 * memegang hash token di database, jadi logout (atau ganti password) langsung
 * mencabut akses walaupun token masih ada di browser.
 *
 * Token TIDAK pernah di-bake ke bundle: nilainya hanya ada di browser admin
 * yang benar-benar login.
 */

const STORAGE_KEY = 'portfolio-admin-session'

interface StoredSession {
  token: string
  /** ISO timestamp; `null` berarti tanpa kedaluwarsa eksplisit. */
  expiresAt: string | null
}

function readStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { token, expiresAt } = parsed as Partial<StoredSession>
    if (typeof token !== 'string' || token.length === 0) return null

    return {
      token,
      expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
    }
  } catch {
    return null
  }
}

/** Token sesi yang masih berlaku, atau `null` bila belum login / kedaluwarsa. */
export function getAdminToken(): string | null {
  const stored = readStored()
  if (!stored) return null

  if (stored.expiresAt && Date.parse(stored.expiresAt) <= Date.now()) {
    clearAdminToken()
    return null
  }

  return stored.token
}

/** Waktu kedaluwarsa sesi tersimpan (untuk ditampilkan di panel Security). */
export function getAdminSessionExpiry(): string | null {
  return readStored()?.expiresAt ?? null
}

export function setAdminSession(token: string, expiresAt: string | null): void {
  try {
    const payload: StoredSession = { token: token.trim(), expiresAt }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage tidak tersedia (mode privat) — request tulis akan ditolak.
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // tidak ada yang perlu dibersihkan
  }
}
