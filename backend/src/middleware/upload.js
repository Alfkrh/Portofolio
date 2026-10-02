/**
 * Upload file (foto profil, thumbnail project, logo, sertifikat).
 *
 * Keamanan yang dijaga di sini:
 *  - hanya tipe gambar/PDF dari daftar putih yang diterima, ditentukan dari
 *    MIME type yang dikirim klien;
 *  - ukuran dibatasi `MAX_UPLOAD_BYTES`;
 *  - nama file TIDAK diambil dari klien — selalu dibuat acak, sehingga tidak
 *    ada nama seperti `../../server.js` yang bisa keluar dari folder upload;
 *  - jumlah file dibatasi satu per request.
 */

import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import multer from 'multer'
import {
  ALLOWED_UPLOAD_TYPES,
  UPLOAD_FIELD_NAME,
} from '../config/constants.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/response.js'

/** Folder upload absolut (relatif terhadap cwd saat server dijalankan). */
export const UPLOAD_DIR = resolve(env.uploadDir)

mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, UPLOAD_DIR)
  },
  filename(_req, file, callback) {
    const extension = ALLOWED_UPLOAD_TYPES.get(file.mimetype) ?? extname(file.originalname)
    const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${extension}`
    callback(null, name)
  },
})

export const uploadSingleFile = multer({
  storage,
  limits: {
    fileSize: env.maxUploadBytes,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      callback(
        ApiError.badRequest(
          'Tipe file tidak didukung. Gunakan PNG, JPG, WebP, AVIF, GIF, atau PDF.',
        ),
      )
      return
    }
    callback(null, true)
  },
}).single(UPLOAD_FIELD_NAME)
