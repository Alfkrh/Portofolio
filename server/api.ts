/**
 * REST API portfolio.
 *
 * Dipakai oleh halaman publik (read-only) dan nanti oleh admin dashboard
 * (write). Semua handler memakai tipe `IncomingMessage` / `ServerResponse`
 * sehingga bisa dipasang di server Node maupun sebagai middleware Vite.
 *
 * Endpoint:
 *   GET    /api/portfolio              → seluruh konten
 *   GET    /api/session                → status login admin
 *   POST   /api/auth/setup             → buat akun admin pertama
 *   POST   /api/auth/login             → login (email + password)
 *   POST   /api/auth/logout            → cabut sesi ini
 *   POST   /api/auth/logout-all        → cabut semua sesi akun
 *   POST   /api/auth/password          → ganti password
 *   POST   /api/auth/email             → ganti email admin
 *   GET/PUT /api/settings              → pengaturan situs (nama, judul, favicon)
 *   GET    /api/profile                → profil
 *   PUT    /api/profile                → ubah profil (partial)
 *   POST   /api/profile/photo          → upload foto profil (raw image body)
 *   DELETE /api/profile/photo          → hapus foto profil
 *   GET    /api/sections               → teks section
 *   PUT    /api/sections               → ubah teks section
 *   GET    /api/uploads                → { url } hasil upload file gambar
 *   POST   /api/uploads                → upload file gambar (raw body)
 *   GET/POST           /api/:collection
 *   GET/PUT/DELETE     /api/:collection/:id
 *   GET    /uploads/:file              → file hasil upload
 *
 * Proteksi tulis: SETIAP request POST/PUT/PATCH/DELETE wajib menyertakan sesi
 * admin yang valid lewat header `Authorization: Bearer <token>`. Token didapat
 * dari `/api/auth/setup` atau `/api/auth/login` (password di-hash scrypt).
 * `PORTFOLIO_ADMIN_TOKEN` (bila di-set) tetap diterima sebagai kredensial
 * cadangan untuk skrip/otomasi.
 */

import { randomBytes } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { basename, extname, join, resolve } from 'node:path'
import { isSiteSettingKey } from '../src/config/siteSettings.ts'
import type { CollectionName } from '../src/types/portfolio.ts'
import {
  clearLoginAttempts,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  isLoginBlocked,
  isValidEmail,
  readBearerToken,
  registerFailedLogin,
  attemptKey,
  SESSION_TTL_MS,
  validatePassword,
  verifyPassword,
} from './auth.ts'
import {
  countAdminSessionsForUser,
  countAdminUsers,
  createAdminSession,
  createAdminUser,
  createCollectionItem,
  deleteAdminSession,
  deleteAdminSessionsForUser,
  deleteCollectionItem,
  findAdminSession,
  findAdminUserByEmail,
  findAdminUserById,
  getCollectionItem,
  getPortfolio,
  getProfile,
  listCollection,
  listSections,
  listSettings,
  touchAdminSession,
  UPLOADS_DIR,
  updateAdminUserEmail,
  updateAdminUserPassword,
  updateCollectionItem,
  updateProfile,
  updateSections,
  updateSettings,
} from './db.ts'

const MAX_JSON_BYTES = 1 * 1024 * 1024
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

const STATIC_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

const COLLECTION_NAMES: readonly CollectionName[] = [
  'experience',
  'skills',
  'projects',
  'project_filters',
  'education',
  'contacts',
]

/* --------------------------------- helpers -------------------------------- */

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

function sendError(res: ServerResponse, status: number, message: string) {
  sendJson(res, status, { error: message })
}

async function readBody(
  req: IncomingMessage,
  limit: number,
): Promise<Buffer> {
  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > limit) {
      throw new Error('PAYLOAD_TOO_LARGE')
    }
    chunks.push(buffer)
  }

  return Buffer.concat(chunks)
}

async function readJsonBody(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  const raw = await readBody(req, MAX_JSON_BYTES)
  if (raw.length === 0) return {}

  const parsed: unknown = JSON.parse(raw.toString('utf8'))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('INVALID_JSON')
  }
  return parsed as Record<string, unknown>
}

function isCollectionName(value: string): value is CollectionName {
  return (COLLECTION_NAMES as readonly string[]).includes(value)
}

/* ---------------------------------- auth ---------------------------------- */

type AuthMode = 'session' | 'env-token' | 'none'

interface AuthContext {
  authenticated: boolean
  mode: AuthMode
  userId: number | null
  email: string | null
  expiresAt: string | null
  tokenHash: string | null
}

const anonymousAuth: AuthContext = {
  authenticated: false,
  mode: 'none',
  userId: null,
  email: null,
  expiresAt: null,
  tokenHash: null,
}

/**
 * Baca kredensial dari header Authorization:
 * 1. token sesi login (tabel `admin_sessions`), atau
 * 2. `PORTFOLIO_ADMIN_TOKEN` bila di-set (kredensial cadangan untuk otomasi).
 * Sesi yang valid otomatis diperpanjang (sliding expiration).
 */
function authenticate(req: IncomingMessage): AuthContext {
  const token = readBearerToken(req)
  if (!token) return anonymousAuth

  const envToken = process.env.PORTFOLIO_ADMIN_TOKEN
  if (envToken && token === envToken) {
    return { ...anonymousAuth, authenticated: true, mode: 'env-token' }
  }

  const tokenHash = hashSessionToken(token)
  const session = findAdminSession(tokenHash)
  if (!session) return anonymousAuth

  const user = findAdminUserById(session.user_id)
  if (!user) {
    deleteAdminSession(tokenHash)
    return anonymousAuth
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  touchAdminSession(tokenHash, expiresAt)

  return {
    authenticated: true,
    mode: 'session',
    userId: user.id,
    email: user.email,
    expiresAt,
    tokenHash,
  }
}

/** Alamat klien untuk pembatasan percobaan login. */
function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? 'unknown'
}

/** Terbitkan sesi baru untuk sebuah akun lalu kembalikan token aslinya. */
function issueSession(
  userId: number,
  email: string,
): { token: string; expiresAt: string; email: string } {
  const { token, tokenHash, expiresAt } = createSessionToken()
  createAdminSession(userId, tokenHash, expiresAt)
  return { token, expiresAt, email }
}

async function handleUpload(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const contentType = (req.headers['content-type'] ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const extension = IMAGE_EXTENSIONS[contentType]

  if (!extension) {
    sendError(res, 415, 'Tipe file tidak didukung. Gunakan gambar PNG/JPG/WebP.')
    return
  }

  let buffer: Buffer
  try {
    buffer = await readBody(req, MAX_UPLOAD_BYTES)
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'PAYLOAD_TOO_LARGE') {
      sendError(res, 413, 'Ukuran file terlalu besar (maks 10 MB).')
      return
    }
    throw cause
  }

  if (buffer.length === 0) {
    sendError(res, 400, 'File kosong tidak bisa diunggah.')
    return
  }

  const fileName = `${Date.now().toString(36)}-${randomBytes(5).toString('hex')}.${extension}`
  await writeFile(join(UPLOADS_DIR, fileName), buffer)

  sendJson(res, 201, { url: `/uploads/${fileName}` })
}

async function handleProfilePhoto(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const contentType = (req.headers['content-type'] ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const extension = IMAGE_EXTENSIONS[contentType]

  if (!extension) {
    sendError(res, 415, 'Tipe file tidak didukung. Gunakan gambar PNG/JPG/WebP.')
    return
  }

  let buffer: Buffer
  try {
    buffer = await readBody(req, MAX_UPLOAD_BYTES)
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'PAYLOAD_TOO_LARGE') {
      sendError(res, 413, 'Ukuran foto terlalu besar (maks 10 MB).')
      return
    }
    throw cause
  }

  const previous = getProfile()?.photo_url ?? null
  const fileName = `profile-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${extension}`
  await writeFile(join(UPLOADS_DIR, fileName), buffer)

  const updated = updateProfile({ photo_url: `/uploads/${fileName}` })
  await removeUploadedFile(previous)

  sendJson(res, 200, { profile: updated })
}

async function removeUploadedFile(url: string | null) {
  if (!url || !url.startsWith('/uploads/')) return

  const filePath = join(UPLOADS_DIR, basename(url))
  if (!existsSync(filePath)) return

  try {
    await unlink(filePath)
  } catch {
    // File mungkin sudah dihapus — abaikan.
  }
}

function serveUpload(req: IncomingMessage, res: ServerResponse, pathname: string) {
  const relative = decodeURIComponent(pathname.replace('/uploads/', ''))
  const filePath = resolve(UPLOADS_DIR, relative)

  // Cegah path traversal keluar dari folder upload.
  if (!filePath.startsWith(UPLOADS_DIR) || !existsSync(filePath)) {
    sendError(res, 404, 'File tidak ditemukan.')
    return
  }

  const stats = statSync(filePath)
  if (!stats.isFile()) {
    sendError(res, 404, 'File tidak ditemukan.')
    return
  }

  res.statusCode = 200
  res.setHeader(
    'content-type',
    STATIC_CONTENT_TYPES[extname(filePath).toLowerCase()] ??
      'application/octet-stream',
  )
  res.setHeader('content-length', stats.size)
  res.setHeader('cache-control', 'public, max-age=31536000, immutable')

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  createReadStream(filePath).pipe(res)
}

/* --------------------------------- routing -------------------------------- */

/**
 * Menangani request `/api/*` dan `/uploads/*`.
 * Mengembalikan `false` bila request bukan milik API (biar Vite/static handler
 * yang meneruskan).
 */
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const { pathname } = url
  const method = (req.method ?? 'GET').toUpperCase()

  if (pathname.startsWith('/uploads/')) {
    serveUpload(req, res, pathname)
    return true
  }

  if (!pathname.startsWith('/api/')) return false

  const segments = pathname.replace('/api/', '').split('/').filter(Boolean)
  const [resource, param] = segments
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  // Kredensial dibaca sekali per request (sesi yang valid ikut diperpanjang).
  const auth = authenticate(req)
  /** Endpoint auth memakai aturan sendiri di dalam handler-nya. */
  const isAuthEndpoint = resource === 'auth'

  if (isWrite && !isAuthEndpoint && !auth.authenticated) {
    sendError(
      res,
      401,
      'Sesi admin tidak valid atau sudah berakhir. Silakan login kembali.',
    )
    return true
  }

  try {
    /* ------------------------------ auth ------------------------------ */

    // POST /api/auth/setup — buat akun admin pertama (hanya bila belum ada).
    if (resource === 'auth' && param === 'setup' && method === 'POST') {
      if (countAdminUsers() > 0) {
        sendError(res, 409, 'Akun admin sudah ada. Silakan login.')
        return true
      }

      const body = await readJsonBody(req)
      const email = typeof body.email === 'string' ? body.email.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''

      if (!isValidEmail(email)) {
        sendError(res, 400, 'Format email admin belum benar.')
        return true
      }

      const passwordError = validatePassword(password, email)
      if (passwordError) {
        sendError(res, 400, passwordError)
        return true
      }

      const user = createAdminUser(email, hashPassword(password))
      sendJson(res, 201, issueSession(user.id, user.email))
      return true
    }

    // POST /api/auth/login
    if (resource === 'auth' && param === 'login' && method === 'POST') {
      const body = await readJsonBody(req)
      const email = typeof body.email === 'string' ? body.email.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      const key = attemptKey(clientIp(req), email)

      if (isLoginBlocked(key)) {
        sendError(
          res,
          429,
          'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.',
        )
        return true
      }

      const user = email ? findAdminUserByEmail(email) : null
      const valid = user
        ? verifyPassword(password, user.password_hash)
        : false

      if (!user || !valid) {
        registerFailedLogin(key)
        sendError(res, 401, 'Email atau password admin salah.')
        return true
      }

      clearLoginAttempts(key)
      sendJson(res, 200, issueSession(user.id, user.email))
      return true
    }

    // POST /api/auth/logout — cabut sesi yang sedang dipakai.
    if (resource === 'auth' && param === 'logout' && method === 'POST') {
      if (auth.tokenHash) deleteAdminSession(auth.tokenHash)
      sendJson(res, 200, { success: true })
      return true
    }

    // POST /api/auth/logout-all — cabut semua sesi akun ini.
    if (resource === 'auth' && param === 'logout-all' && method === 'POST') {
      if (auth.mode !== 'session' || auth.userId === null) {
        sendError(res, 401, 'Perlu login akun admin untuk mengakhiri semua sesi.')
        return true
      }

      const revoked = deleteAdminSessionsForUser(auth.userId)
      sendJson(res, 200, { success: true, revoked })
      return true
    }

    // POST /api/auth/password — ganti password (wajib password lama).
    if (resource === 'auth' && param === 'password' && method === 'POST') {
      if (auth.mode !== 'session' || auth.userId === null) {
        sendError(res, 401, 'Perlu login akun admin untuk mengganti password.')
        return true
      }

      const body = await readJsonBody(req)
      const currentPassword =
        typeof body.currentPassword === 'string' ? body.currentPassword : ''
      const newPassword =
        typeof body.newPassword === 'string' ? body.newPassword : ''

      const user = findAdminUserById(auth.userId)
      const stored = user ? findAdminUserByEmail(user.email) : null

      if (!user || !stored || stored.id !== user.id) {
        sendError(res, 401, 'Akun admin tidak ditemukan.')
        return true
      }

      if (!verifyPassword(currentPassword, stored.password_hash)) {
        sendError(res, 401, 'Password saat ini salah.')
        return true
      }

      const passwordError = validatePassword(newPassword, user.email)
      if (passwordError) {
        sendError(res, 400, passwordError)
        return true
      }

      if (verifyPassword(newPassword, stored.password_hash)) {
        sendError(res, 400, 'Password baru harus berbeda dari password lama.')
        return true
      }

      updateAdminUserPassword(user.id, hashPassword(newPassword))
      // Perangkat lain dipaksa login ulang; sesi ini tetap aktif.
      const revoked = deleteAdminSessionsForUser(user.id, auth.tokenHash ?? undefined)

      sendJson(res, 200, { success: true, revoked })
      return true
    }

    // POST /api/auth/email — ganti email admin (wajib password).
    if (resource === 'auth' && param === 'email' && method === 'POST') {
      if (auth.mode !== 'session' || auth.userId === null) {
        sendError(res, 401, 'Perlu login akun admin untuk mengganti email.')
        return true
      }

      const body = await readJsonBody(req)
      const currentPassword =
        typeof body.currentPassword === 'string' ? body.currentPassword : ''
      const email = typeof body.email === 'string' ? body.email.trim() : ''

      const user = findAdminUserById(auth.userId)
      const stored = user ? findAdminUserByEmail(user.email) : null

      if (!user || !stored || !verifyPassword(currentPassword, stored.password_hash)) {
        sendError(res, 401, 'Password saat ini salah.')
        return true
      }

      if (!isValidEmail(email)) {
        sendError(res, 400, 'Format email admin belum benar.')
        return true
      }

      const existing = findAdminUserByEmail(email)
      if (existing && existing.id !== user.id) {
        sendError(res, 409, 'Email tersebut sudah dipakai akun admin lain.')
        return true
      }

      updateAdminUserEmail(user.id, email)
      sendJson(res, 200, { success: true, email: email.toLowerCase() })
      return true
    }

    // GET /api/session — status login untuk gerbang dashboard.
    if (resource === 'session' && method === 'GET') {
      sendJson(res, 200, {
        setupRequired: countAdminUsers() === 0,
        authenticated: auth.authenticated,
        email: auth.email,
        expiresAt: auth.expiresAt,
        authMode: auth.mode,
        activeSessions:
          auth.mode === 'session' && auth.userId !== null
            ? countAdminSessionsForUser(auth.userId)
            : 0,
      })
      return true
    }

    // GET /api/portfolio
    if (resource === 'portfolio' && method === 'GET') {
      sendJson(res, 200, getPortfolio())
      return true
    }

    // GET/PUT /api/settings — pengaturan situs (nama, judul, favicon).
    if (resource === 'settings') {
      if (method === 'GET') {
        sendJson(res, 200, listSettings())
        return true
      }

      if (method === 'PUT') {
        const body = await readJsonBody(req)
        const entries = Object.keys(body).filter(isSiteSettingKey)

        if (entries.length === 0) {
          sendError(res, 400, 'Tidak ada pengaturan yang bisa disimpan.')
          return true
        }

        sendJson(res, 200, updateSettings(body))
        return true
      }
    }

    if (resource === 'profile') {
      if (!param && method === 'GET') {
        sendJson(res, 200, getProfile())
        return true
      }

      if (!param && method === 'PUT') {
        const patch = await readJsonBody(req)
        sendJson(res, 200, { profile: updateProfile(patch) })
        return true
      }

      if (param === 'photo' && method === 'POST') {
        await handleProfilePhoto(req, res)
        return true
      }

      if (param === 'photo' && method === 'DELETE') {
        const previous = getProfile()?.photo_url ?? null
        const updated = updateProfile({ photo_url: null })
        await removeUploadedFile(previous)
        sendJson(res, 200, { profile: updated })
        return true
      }
    }

    if (resource === 'sections') {
      if (method === 'GET') {
        sendJson(res, 200, listSections())
        return true
      }
      if (method === 'PUT') {
        const body = await readJsonBody(req)
        updateSections(body)
        sendJson(res, 200, listSections())
        return true
      }
    }

    if (resource === 'uploads' && method === 'POST') {
      await handleUpload(req, res)
      return true
    }

    if (resource && isCollectionName(resource)) {
      const collection = resource

      if (!param && method === 'GET') {
        sendJson(res, 200, listCollection(collection))
        return true
      }

      if (!param && method === 'POST') {
        const payload = await readJsonBody(req)
        sendJson(res, 201, createCollectionItem(collection, payload))
        return true
      }

      const id = Number(param)
      if (param && Number.isFinite(id)) {
        if (method === 'GET') {
          const item = getCollectionItem(collection, id)
          if (!item) {
            sendError(res, 404, 'Data tidak ditemukan.')
            return true
          }
          sendJson(res, 200, item)
          return true
        }

        if (method === 'PUT' || method === 'PATCH') {
          const patch = await readJsonBody(req)
          const item = updateCollectionItem(collection, id, patch)
          if (!item) {
            sendError(res, 404, 'Data tidak ditemukan.')
            return true
          }
          sendJson(res, 200, item)
          return true
        }

        if (method === 'DELETE') {
          const deleted = deleteCollectionItem(collection, id)
          if (!deleted) {
            sendError(res, 404, 'Data tidak ditemukan.')
            return true
          }
          sendJson(res, 200, { success: true, id })
          return true
        }
      }
    }

    sendError(res, 404, `Endpoint ${method} ${pathname} tidak ditemukan.`)
    return true
  } catch (cause) {
    if (cause instanceof Error) {
      if (cause.message === 'PAYLOAD_TOO_LARGE') {
        sendError(res, 413, 'Ukuran payload terlalu besar.')
        return true
      }
      if (cause.message === 'INVALID_JSON') {
        sendError(res, 400, 'Body harus berupa JSON object.')
        return true
      }
      // Kesalahan database yang bisa dijelaskan (mis. kolom wajib kosong).
      sendError(res, 400, cause.message)
      return true
    }

    sendError(res, 500, 'Terjadi kesalahan pada server.')
    return true
  }
}
