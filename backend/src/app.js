/**
 * Perakitan aplikasi Express.
 *
 * `app` dibangun terpisah dari `listen()` supaya bisa diuji tanpa membuka port,
 * dan supaya urutan middleware terlihat jelas di satu tempat:
 *
 *   CORS → parser JSON → file upload → route API → 404 → error handler
 *
 * Error handler SELALU paling akhir: Express baru meneruskan galat ke sana
 * kalau tidak ada middleware lain setelahnya.
 */

import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { UPLOAD_DIR } from './middleware/upload.js'
import routes from './routes/index.js'

export function createApp() {
  const app = express()

  // Jangan bocorkan bahwa ini Express.
  app.disable('x-powered-by')

  // Di belakang proxy platform (Render/Railway), IP asli pengunjung ada di
  // header X-Forwarded-For. Tanpa ini, rate limit akan menghitung semua
  // pengunjung sebagai satu alamat.
  if (env.isProduction) app.set('trust proxy', 1)

  app.use(
    cors({
      origin(origin, callback) {
        // Tanpa header Origin (curl, health check platform) selalu boleh.
        if (!origin) return callback(null, true)
        if (env.frontendUrls.includes('*')) return callback(null, true)
        if (env.frontendUrls.includes(origin)) return callback(null, true)

        // Origin yang tidak terdaftar: jangan kirim header CORS sama sekali,
        // biarkan browser yang menolak — bukan dianggap galat server.
        callback(null, false)
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  )

  app.use(express.json({ limit: '1mb' }))

  // File upload disajikan apa adanya. `nosniff` penting: tanpa itu browser bisa
  // menebak tipe konten dan menjalankan berkas yang seharusnya hanya gambar.
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      },
    }),
  )

  app.use('/api', routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
