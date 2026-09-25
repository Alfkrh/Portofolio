import type { Plugin } from 'vite'
import { handleApiRequest } from './api.ts'

/**
 * Menjalankan API portfolio langsung di dalam dev server Vite, sehingga
 * `npm run dev` tetap satu perintah untuk frontend + backend + database.
 *
 * Untuk produksi, `npm run start` memakai `server/index.ts`.
 */
export function portfolioApiPlugin(): Plugin {
  return {
    name: 'portfolio-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/') && !url.startsWith('/uploads/')) {
          next()
          return
        }

        handleApiRequest(req, res).catch((cause: unknown) => {
          console.error('[portfolio-api]', cause)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Terjadi kesalahan pada server.' }))
          }
        })
      })
    },
  }
}
