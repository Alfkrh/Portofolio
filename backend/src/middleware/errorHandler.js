/**
 * Penanganan galat terpusat.
 *
 * Semua galat — dari validasi, autentikasi, multer, maupun Prisma — berakhir di
 * sini dan keluar dengan bentuk yang sama:
 *
 *   { success: false, message: "...", errors?: [{ field, message }] }
 *
 * Detail teknis hanya dicatat di log server, tidak pernah dikirim ke klien saat
 * produksi.
 */

import { env } from '../config/env.js'
import { ApiError, sendError } from '../utils/response.js'

/** Endpoint yang tidak dikenal. */
export function notFoundHandler(req, res) {
  sendError(res, 404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`)
}

/**
 * Kode galat Prisma yang bisa diterjemahkan menjadi status HTTP yang tepat.
 * Lihat https://www.prisma.io/docs/orm/reference/error-reference
 */
function fromPrismaError(error) {
  switch (error.code) {
    case 'P2002': {
      const target = error.meta?.target
      const field = Array.isArray(target) ? target.join(', ') : 'field unik'
      return ApiError.conflict(`Nilai untuk ${field} sudah dipakai data lain.`)
    }
    case 'P2003':
      return ApiError.badRequest('Data terkait yang dirujuk tidak ditemukan.')
    case 'P2025':
      return ApiError.notFound('Data tidak ditemukan.')
    // Tidak bisa menjangkau database sama sekali.
    case 'P1000':
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1017':
      return new ApiError(
        503,
        'Server tidak bisa terhubung ke database. Coba beberapa saat lagi.',
      )
    default:
      return null
  }
}

export function errorHandler(error, req, res, next) {
  // Kalau respons sudah dikirim sebagian, serahkan ke Express.
  if (res.headersSent) {
    next(error)
    return
  }

  /** @type {ApiError | null} */
  let mapped = null

  if (error instanceof ApiError) {
    mapped = error
  } else if (error?.name === 'ZodError') {
    mapped = ApiError.badRequest(
      'Data yang dikirim belum valid.',
      error.issues?.map((issue) => ({
        field: issue.path?.join('.') || '(root)',
        message: issue.message,
      })),
    )
  } else if (error?.code === 'LIMIT_FILE_SIZE') {
    mapped = new ApiError(413, 'Ukuran file terlalu besar.')
  } else if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    mapped = ApiError.badRequest('Field upload tidak sesuai. Gunakan field "file".')
  } else if (typeof error?.code === 'string' && error.code.startsWith('P')) {
    mapped = fromPrismaError(error)
  } else if (error instanceof SyntaxError && 'body' in error) {
    // Body JSON yang tidak bisa di-parse — kesalahan klien, bukan server.
    mapped = ApiError.badRequest('Body request bukan JSON yang valid.')
  }

  if (mapped) {
    // Galat 5xx tetap dicatat supaya bisa ditelusuri.
    if (mapped.status >= 500) {
      console.error(`[api] ${req.method} ${req.originalUrl} →`, error)
    }
    sendError(res, mapped.status, mapped.message, mapped.errors)
    return
  }

  console.error(`[api] ${req.method} ${req.originalUrl} gagal:`, error)

  sendError(
    res,
    500,
    env.isProduction
      ? 'Terjadi kesalahan pada server.'
      : `Terjadi kesalahan pada server: ${error?.message ?? 'penyebab tidak diketahui'}`,
  )
}
