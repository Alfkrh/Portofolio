/**
 * Controller resource.
 *
 * `createResourceController` membangun handler CRUD untuk satu resource koleksi
 * dari registry, jadi menambah jenis konten baru tidak perlu menulis controller
 * baru. Profil (singleton) punya controller sendiri di bagian bawah.
 */

import { createCrudService, parseId } from '../services/crud.service.js'
import { profileService } from '../services/profile.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendCreated, sendSuccess } from '../utils/response.js'

export function createResourceController(resource) {
  const service = createCrudService(resource)
  const label = resource.label

  return {
    /** GET (publik) — hanya data yang boleh dilihat pengunjung. */
    listPublic: asyncHandler(async (_req, res) => {
      const data = await service.listPublic()
      sendSuccess(res, data, `Daftar ${label} berhasil diambil.`)
    }),

    /** GET (admin) — termasuk yang belum dipublikasikan. */
    listAll: asyncHandler(async (_req, res) => {
      const data = await service.listAll()
      sendSuccess(res, data, `Daftar ${label} berhasil diambil.`)
    }),

    /** GET /:id */
    getById: asyncHandler(async (req, res) => {
      const data = await service.findById(parseId(req.params.id))
      sendSuccess(res, data, `${label} berhasil diambil.`)
    }),

    /** POST */
    create: asyncHandler(async (req, res) => {
      const data = await service.create(req.validated.body)
      sendCreated(res, data, `${label} berhasil ditambahkan.`)
    }),

    /** PUT /:id — patch parsial, field yang tidak dikirim tidak diubah. */
    update: asyncHandler(async (req, res) => {
      const data = await service.update(parseId(req.params.id), req.validated.body)
      sendSuccess(res, data, `${label} berhasil diperbarui.`)
    }),

    /** DELETE /:id */
    remove: asyncHandler(async (req, res) => {
      const data = await service.remove(parseId(req.params.id))
      sendSuccess(res, data, `${label} berhasil dihapus.`)
    }),
  }
}

export const profileController = {
  get: asyncHandler(async (_req, res) => {
    const data = await profileService.get()
    sendSuccess(res, data, 'Profil berhasil diambil.')
  }),

  /** PUT — upsert, jadi dashboard tetap bisa menyimpan walau profil masih kosong. */
  update: asyncHandler(async (req, res) => {
    const data = await profileService.upsert(req.validated.body)
    sendSuccess(res, data, 'Profil berhasil disimpan.')
  }),
}
