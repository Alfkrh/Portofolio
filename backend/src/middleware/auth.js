/**
 * Autentikasi admin.
 *
 * Token yang dikirim klien adalah string acak 32 byte; yang tersimpan di
 * database hanya hash SHA-256-nya. Jadi isi database yang bocor tidak langsung
 * memberi token yang bisa dipakai login.
 *
 * Sesi diperpanjang otomatis (sliding expiration), tapi hanya ketika sisanya
 * sudah kurang dari separuh masa berlaku — supaya tidak ada satu UPDATE
 * database di setiap request.
 */

import { createHash } from 'node:crypto'
import { ADMIN_ROLE } from '../config/constants.js'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/response.js'

const SESSION_TTL_MS = env.sessionTtlDays * 24 * 60 * 60 * 1000

/** Hash token sesi untuk dicocokkan dengan kolom `token_hash`. */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

/** Ambil token dari header `Authorization: Bearer <token>`. */
function readBearerToken(req) {
  const header = req.headers.authorization
  const raw = Array.isArray(header) ? header[0] : header
  if (typeof raw !== 'string') return null

  const match = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return match ? match[1].trim() : null
}

/**
 * Baca sesi dari header. Mengembalikan data admin, atau `null` bila tidak ada
 * sesi yang valid — tidak melempar galat, karena dipakai juga oleh endpoint
 * yang boleh diakses tanpa login.
 */
async function loadAdmin(req) {
  const token = readBearerToken(req)
  if (!token) return null

  const session = await prisma.adminSession.findUnique({
    where: { token_hash: hashToken(token) },
    include: { user: true },
  })

  if (!session) return null

  if (session.expires_at.getTime() <= Date.now()) {
    // Sesi kedaluwarsa: bersihkan supaya tabel tidak menumpuk baris mati.
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  const remaining = session.expires_at.getTime() - Date.now()
  if (remaining < SESSION_TTL_MS / 2) {
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { expires_at: new Date(Date.now() + SESSION_TTL_MS) },
    })
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    sessionId: session.id,
    tokenHash: session.token_hash,
  }
}

/** Isi `req.admin` bila ada sesi valid, tapi jangan menolak request tamu. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.admin = await loadAdmin(req)
  next()
})

/** Wajib login. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const admin = await loadAdmin(req)
  if (!admin) throw ApiError.unauthorized()
  req.admin = admin
  next()
})

/**
 * Wajib ber-role admin. Login yang sah tapi ber-role lain ditolak dengan 403,
 * bukan 401 — supaya jelas kredensialnya benar tapi aksesnya tidak ada.
 */
export function requireAdminRole(req, _res, next) {
  if (req.admin?.role !== ADMIN_ROLE) {
    next(ApiError.forbidden('Akses ditolak. Akun ini tidak memiliki role admin.'))
    return
  }
  next()
}
