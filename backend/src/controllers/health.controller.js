/**
 * Health check.
 *
 * Dipakai platform deploy (Render/Railway) untuk menentukan apakah instance
 * siap menerima trafik. Koneksi database ikut diuji: kalau database tidak bisa
 * dihubungi, status yang dikembalikan 503 supaya instance tidak dianggap sehat.
 */

import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const healthController = {
  check: asyncHandler(async (_req, res) => {
    let database = 'ok'

    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      database = 'unreachable'
    }

    const data = {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    }

    if (database !== 'ok') {
      res.status(503).json({
        success: false,
        message: 'API berjalan tetapi database tidak bisa dihubungi.',
        data,
      })
      return
    }

    sendSuccess(res, data, 'API is running')
  }),
}
