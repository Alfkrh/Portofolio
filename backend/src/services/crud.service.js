/**
 * Service CRUD generik.
 *
 * Semua resource koleksi punya perilaku yang sama (daftar, detail, buat, ubah,
 * hapus), jadi logikanya ditulis sekali di sini dan dikonfigurasi lewat
 * registry resource. Controller tinggal memanggil methodnya.
 */

import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/response.js'

/** Ubah parameter URL menjadi id angka yang valid. */
export function parseId(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('ID harus berupa angka bulat positif.')
  }
  return id
}

export function createCrudService(resource) {
  const delegate = () => prisma[resource.model]

  return {
    /** Daftar untuk halaman publik — hanya data yang boleh ditampilkan. */
    listPublic() {
      return delegate().findMany({
        where: resource.publicWhere ?? undefined,
        orderBy: resource.orderBy,
      })
    },

    /** Daftar lengkap untuk dashboard admin. */
    listAll() {
      return delegate().findMany({ orderBy: resource.orderBy })
    },

    async findById(id) {
      const item = await delegate().findUnique({ where: { id } })
      if (!item) throw ApiError.notFound(`${resource.label} tidak ditemukan.`)
      return item
    },

    create(data) {
      return delegate().create({ data })
    },

    async update(id, data) {
      // Pastikan id-nya ada dulu supaya pesan galatnya jelas, bukan P2025 mentah.
      await this.findById(id)
      return delegate().update({ where: { id }, data })
    },

    async remove(id) {
      await this.findById(id)
      await delegate().delete({ where: { id } })
      return { id }
    },
  }
}
