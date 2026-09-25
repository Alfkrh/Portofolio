/**
 * Autentikasi admin: hashing password, token sesi, dan pembatasan percobaan
 * login. Semua memakai `node:crypto` sehingga tidak ada dependency tambahan.
 *
 * Model keamanan:
 * - Password disimpan sebagai scrypt (salt acak per akun) — tidak pernah
 *   dikembalikan ke klien.
 * - Token sesi 32 byte acak; yang disimpan di database hanya hash SHA-256-nya,
 *   jadi bocornya file database tidak langsung memberi token yang bisa dipakai.
 * - Sesi punya masa berlaku dan bisa dicabut (logout / ganti password).
 */

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import {
  MIN_PASSWORD_LENGTH,
  SESSION_TTL_DAYS,
} from '../src/config/authPolicy.ts'

export { MIN_PASSWORD_LENGTH }

/* -------------------------------- password -------------------------------- */

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

/** Hash password dengan salt acak. Format: `scrypt$N$r$p$salt$hash`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2,
  })

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$')
}

/** Verifikasi password terhadap hash tersimpan (perbandingan waktu konstan). */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false
  }

  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(parts[4], 'base64url')
    expected = Buffer.from(parts[5], 'base64url')
  } catch {
    return false
  }

  if (salt.length === 0 || expected.length === 0) return false

  let actual: Buffer
  try {
    actual = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    })
  } catch {
    return false
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/**
 * Periksa kekuatan password. Mengembalikan pesan galat, atau `null` bila lolos.
 */
export function validatePassword(
  password: string,
  email: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password harus memuat huruf dan angka.'
  }
  const localPart = email.split('@')[0]?.trim().toLowerCase() ?? ''
  if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    return 'Password tidak boleh memuat bagian dari email admin.'
  }
  return null
}

/** Pemeriksaan sederhana format email. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

/* --------------------------------- sesi ---------------------------------- */

/** Masa berlaku sesi admin (persistent di browser, dicabut saat logout). */
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

/** Hash token sesi untuk disimpan di database. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Buat token sesi baru + waktu kedaluwarsanya. */
export function createSessionToken(): {
  token: string
  tokenHash: string
  expiresAt: string
} {
  const token = randomBytes(32).toString('base64url')

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
}

/** Ambil token dari header `Authorization: Bearer <token>`. */
export function readBearerToken(req: {
  headers: Record<string, unknown>
}): string | null {
  const header = req.headers.authorization
  const raw = Array.isArray(header) ? header[0] : header
  if (typeof raw !== 'string') return null

  const match = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return match ? match[1].trim() : null
}

/* --------------------------- pembatasan percobaan -------------------------- */

const MAX_ATTEMPTS = 8
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000

const attempts = new Map<string, { count: number; resetAt: number }>()

function prune() {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key)
  }
}

/** Kunci pembatas: kombinasi IP dan email yang dicoba. */
export function attemptKey(
  clientIp: string,
  email: string,
): string {
  return `${clientIp}::${email.trim().toLowerCase()}`
}

/** `true` bila percobaan login dari kunci ini sedang diblokir. */
export function isLoginBlocked(key: string): boolean {
  prune()
  const entry = attempts.get(key)
  if (!entry) return false
  return entry.count >= MAX_ATTEMPTS
}

/** Catat satu percobaan login yang gagal. */
export function registerFailedLogin(key: string): void {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS })
    return
  }

  entry.count += 1
}

/** Hapus riwayat percobaan setelah login berhasil. */
export function clearLoginAttempts(key: string): void {
  attempts.delete(key)
}
