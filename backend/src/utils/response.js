/**
 * Format respons API yang seragam.
 *
 *   sukses : { success: true,  message, data }
 *   gagal  : { success: false, message, errors? }
 *
 * Semua controller memakai helper ini supaya bentuk respons tidak pernah
 * berbeda antar endpoint, dan frontend hanya perlu memahami satu kontrak.
 */

/** Galat yang membawa status HTTP — ditangkap oleh global error handler. */
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (errors) this.errors = errors
  }

  static badRequest(message, errors) {
    return new ApiError(400, message, errors)
  }

  static unauthorized(message = 'Sesi tidak valid atau sudah berakhir.') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Akses ditolak.') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Data tidak ditemukan.') {
    return new ApiError(404, message)
  }

  static conflict(message) {
    return new ApiError(409, message)
  }
}

export function sendSuccess(res, data, message = 'Data berhasil diambil', status = 200) {
  res.status(status).json({ success: true, message, data })
}

export function sendCreated(res, data, message = 'Data berhasil disimpan') {
  sendSuccess(res, data, message, 201)
}

export function sendError(res, status, message, errors) {
  const body = { success: false, message }
  if (errors) body.errors = errors
  res.status(status).json(body)
}
