/**
 * Controller upload.
 *
 * Validasi tipe & ukuran ditangani middleware multer sebelum sampai ke sini.
 * Yang disimpan ke database hanyalah URL relatifnya (`/uploads/nama-file`),
 * bukan isi binernya.
 */

import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError, sendCreated } from '../utils/response.js'

export const uploadController = {
  create: asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.badRequest('Tidak ada file yang dikirim.')
    }

    sendCreated(
      res,
      {
        url: `/uploads/${req.file.filename}`,
        file_name: req.file.filename,
        mime_type: req.file.mimetype,
        size: req.file.size,
      },
      'File berhasil diunggah.',
    )
  }),
}
