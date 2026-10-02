/**
 * Validasi request dengan skema Zod.
 *
 * Hasil yang sudah tervalidasi (dan sudah dikonversi tipenya) disimpan di
 * `req.validated[source]`, bukan ditimpa ke `req.query` — di Express 5
 * `req.query` adalah getter sehingga tidak bisa di-assign.
 */

import { ApiError } from '../utils/response.js'

/** Ubah ZodError menjadi daftar { field, message } yang enak dibaca klien. */
export function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }))
}

export function validate(schema, source = 'body') {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      next(
        ApiError.badRequest('Data yang dikirim belum valid.', formatIssues(result.error)),
      )
      return
    }

    req.validated = req.validated ?? {}
    req.validated[source] = result.data
    next()
  }
}
