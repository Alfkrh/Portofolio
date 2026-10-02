/**
 * Hashing password dengan scrypt dari `node:crypto`.
 *
 * Format hash yang disimpan: `scrypt$N$r$p$salt$hash` (base64url). Parameter
 * ikut disimpan di dalam string supaya bisa dinaikkan di masa depan tanpa
 * memaksa semua password lama di-reset.
 *
 * Scrypt sengaja dipilih ketimbang bcrypt karena tersedia di Node tanpa
 * dependency native — tidak perlu compile apa pun saat deploy.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

/** Buat hash password dengan salt acak per akun. */
export function hashPassword(password) {
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

/** Verifikasi password terhadap hash tersimpan, dengan perbandingan waktu konstan. */
export function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, n, r, p, saltPart, hashPart] = parts
  const N = Number(n)
  const rValue = Number(r)
  const pValue = Number(p)

  if (!Number.isFinite(N) || !Number.isFinite(rValue) || !Number.isFinite(pValue)) {
    return false
  }

  let salt
  let expected
  try {
    salt = Buffer.from(saltPart, 'base64url')
    expected = Buffer.from(hashPart, 'base64url')
  } catch {
    return false
  }

  if (salt.length === 0 || expected.length === 0) return false

  let actual
  try {
    actual = scryptSync(password, salt, expected.length, {
      N,
      r: rValue,
      p: pValue,
      maxmem: 128 * N * rValue * 2,
    })
  } catch {
    return false
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/**
 * Aturan kekuatan password minimum.
 * Mengembalikan pesan galat, atau `null` bila lolos.
 */
export function validatePasswordStrength(password, email = '') {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password minimal 8 karakter.'
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password harus memuat huruf dan angka.'
  }

  const localPart = String(email).split('@')[0]?.trim().toLowerCase() ?? ''
  if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    return 'Password tidak boleh memuat bagian dari email admin.'
  }

  return null
}
