/**
 * Service autentikasi admin.
 *
 * Sesi disimpan di database (bukan JWT stateless) supaya bisa dicabut:
 * logout, logout dari semua perangkat, dan ganti password langsung
 * membatalkan token yang beredar. UI dashboard sudah memakai kemampuan itu.
 */

import { randomBytes } from 'node:crypto'
import { ADMIN_ROLE } from '../config/constants.js'
import { env } from '../config/env.js'
import { hashToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/response.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

const SESSION_TTL_MS = env.sessionTtlDays * 24 * 60 * 60 * 1000

/** Jumlah akun admin yang sudah ada — dipakai untuk menentukan perlu setup. */
export function countAdmins() {
  return prisma.adminUser.count()
}

/** Terbitkan sesi baru dan kembalikan token aslinya (hanya sekali ini terlihat). */
export async function issueSession(user) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await prisma.adminSession.create({
    data: { token_hash: hashToken(token), user_id: user.id, expires_at: expiresAt },
  })

  return { token, expiresAt, email: user.email }
}

/** Buat akun admin pertama. Ditolak bila sudah ada akun. */
export async function setupFirstAdmin({ email, password }) {
  if ((await countAdmins()) > 0) {
    throw ApiError.conflict('Akun admin sudah ada. Silakan login.')
  }

  const user = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase(),
      password_hash: hashPassword(password),
      role: ADMIN_ROLE,
    },
  })

  return issueSession(user)
}

/** Login dengan email + password. */
export async function login({ email, password }) {
  const user = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  })

  // Pesan galat sengaja sama untuk email tidak ada maupun password salah,
  // supaya tidak bisa dipakai menebak email mana yang terdaftar.
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw ApiError.unauthorized('Email atau password admin salah.')
  }

  return issueSession(user)
}

/** Cabut sesi yang sedang dipakai (logout). */
export async function logout(tokenHash) {
  if (!tokenHash) return { revoked: 0 }
  const result = await prisma.adminSession.deleteMany({ where: { token_hash: tokenHash } })
  return { revoked: result.count }
}

/** Cabut semua sesi milik satu akun (logout dari semua perangkat). */
export async function logoutAll(userId) {
  const result = await prisma.adminSession.deleteMany({ where: { user_id: userId } })
  return { revoked: result.count }
}

/** Ganti password. Perangkat lain dipaksa login ulang, sesi ini tetap hidup. */
export async function changePassword(userId, currentPassword, newPassword, currentTokenHash) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.unauthorized('Akun admin tidak ditemukan.')

  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw ApiError.unauthorized('Password saat ini salah.')
  }
  if (verifyPassword(newPassword, user.password_hash)) {
    throw ApiError.badRequest('Password baru harus berbeda dari password lama.')
  }

  await prisma.adminUser.update({
    where: { id: userId },
    data: { password_hash: hashPassword(newPassword) },
  })

  const result = await prisma.adminSession.deleteMany({
    where: { user_id: userId, NOT: { token_hash: currentTokenHash } },
  })

  return { revoked: result.count }
}

/** Ganti email admin (wajib menyertakan password saat ini). */
export async function changeEmail(userId, currentPassword, email) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.unauthorized('Akun admin tidak ditemukan.')

  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw ApiError.unauthorized('Password saat ini salah.')
  }

  const nextEmail = email.toLowerCase()
  const existing = await prisma.adminUser.findUnique({ where: { email: nextEmail } })
  if (existing && existing.id !== userId) {
    throw ApiError.conflict('Email tersebut sudah dipakai akun admin lain.')
  }

  const updated = await prisma.adminUser.update({
    where: { id: userId },
    data: { email: nextEmail },
  })

  return { email: updated.email }
}

/** Jumlah sesi aktif milik satu akun. */
export function countSessions(userId) {
  return prisma.adminSession.count({ where: { user_id: userId } })
}
