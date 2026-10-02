/**
 * Pesan dari form Contact.
 *
 * Pengunjung hanya boleh MENGIRIM (POST, dibatasi rate limit per IP). Membaca,
 * menandai, dan menghapus pesan hanya bisa lewat endpoint admin.
 */

import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError, sendCreated, sendSuccess } from '../utils/response.js'
import { parseId } from '../services/crud.service.js'

export const contactController = {
  /** POST /api/contact — publik. */
  submit: asyncHandler(async (req, res) => {
    const created = await prisma.contactMessage.create({
      data: req.validated.body,
      select: { id: true, created_at: true },
    })

    sendCreated(res, created, 'Pesan berhasil dikirim. Terima kasih!')
  }),

  /** GET /api/admin/contact-messages */
  list: asyncHandler(async (_req, res) => {
    const [messages, unread] = await Promise.all([
      prisma.contactMessage.findMany({ orderBy: { created_at: 'desc' } }),
      prisma.contactMessage.count({ where: { is_read: false } }),
    ])

    sendSuccess(res, { messages, unread }, 'Daftar pesan berhasil diambil.')
  }),

  /** PATCH /api/admin/contact-messages/:id */
  markRead: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const { is_read: isRead } = req.body ?? {}

    if (typeof isRead !== 'boolean') {
      throw ApiError.badRequest('Field "is_read" harus berupa boolean.')
    }

    const existing = await prisma.contactMessage.findUnique({ where: { id } })
    if (!existing) throw ApiError.notFound('Pesan tidak ditemukan.')

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { is_read: isRead },
    })

    sendSuccess(res, updated, 'Status pesan berhasil diperbarui.')
  }),

  /** DELETE /api/admin/contact-messages/:id */
  remove: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)

    const existing = await prisma.contactMessage.findUnique({ where: { id } })
    if (!existing) throw ApiError.notFound('Pesan tidak ditemukan.')

    await prisma.contactMessage.delete({ where: { id } })
    sendSuccess(res, { id }, 'Pesan berhasil dihapus.')
  }),
}
