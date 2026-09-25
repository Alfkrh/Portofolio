/**
 * Server produksi: menyajikan API, file upload, dan hasil build frontend.
 *
 *   npm run build && npm run start
 *
 * Env opsional:
 *   PORT                     port server (default 3000)
 *   HOST                     host bind (default 127.0.0.1)
 *   PORTFOLIO_DATA_DIR       folder data (database + uploads)
 *   PORTFOLIO_DB_PATH        path file SQLite
 *   PORTFOLIO_ADMIN_TOKEN    token untuk endpoint tulis (Bearer)
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { handleApiRequest } from './api.ts'
import { DATA_DIR, DIST_DIR } from './db.ts'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '127.0.0.1'

const STATIC_CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

function sendFile(res: ServerResponse, filePath: string, status = 200) {
  const stats = statSync(filePath)
  res.statusCode = status
  res.setHeader(
    'content-type',
    STATIC_CONTENT_TYPES[extname(filePath).toLowerCase()] ??
      'application/octet-stream',
  )
  res.setHeader('content-length', stats.size)

  const isHashedAsset = filePath.includes(`${join('dist', 'assets')}`)
  res.setHeader(
    'cache-control',
    isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  )

  createReadStream(filePath).pipe(res)
}

/** Sajikan file dari `dist/`, dengan fallback SPA ke index.html. */
function serveStatic(pathname: string, res: ServerResponse): boolean {
  if (!existsSync(DIST_DIR)) return false

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let filePath = resolve(DIST_DIR, relative)

  const isInsideDist = filePath.startsWith(DIST_DIR)
  if (!isInsideDist || !existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(DIST_DIR, 'index.html')
    if (!existsSync(filePath)) return false
  }

  sendFile(res, filePath)
  return true
}

const server = createServer((req, res) => {
  void (async () => {
    try {
      if (await handleApiRequest(req, res)) return

      const url = new URL(req.url ?? '/', 'http://localhost')
      if (serveStatic(url.pathname, res)) return

      res.statusCode = 503
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(
        'Build frontend belum tersedia. Jalankan `npm run build` lalu ulangi `npm run start`, atau pakai `npm run dev` untuk mode pengembangan.',
      )
    } catch (cause) {
      console.error('[portfolio] request gagal:', cause)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Terjadi kesalahan pada server.' }))
      }
    }
  })()
})

server.listen(PORT, HOST, () => {
  console.log(`[portfolio] server siap di http://${HOST}:${PORT}`)
  console.log(`[portfolio] data disimpan di ${DATA_DIR}`)
  if (!existsSync(DIST_DIR)) {
    console.log('[portfolio] catatan: folder dist/ belum ada — jalankan `npm run build`.')
  }
})
