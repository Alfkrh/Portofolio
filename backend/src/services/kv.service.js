/**
 * Service tabel key-value.
 *
 * Dua tabel memakai pola yang sama: `sections` (teks UI yang bisa diedit dari
 * dashboard) dan `settings` (nama situs, judul tab, deskripsi, favicon).
 * Keduanya cukup dibaca sebagai satu objek dan ditulis sebagian-sebagian.
 */

import { prisma } from '../lib/prisma.js'

function makeKvService(model) {
  const delegate = () => prisma[model]

  return {
    /** Baca semua baris sebagai satu objek { key: value }. */
    async read() {
      const rows = await delegate().findMany()
      return Object.fromEntries(rows.map((row) => [row.key, row.value ?? '']))
    },

    /**
     * Simpan patch: hanya key yang dikirim yang diubah, sisanya dibiarkan.
     * Memakai upsert per key supaya key baru bisa ditambahkan kapan saja.
     */
    async write(patch) {
      const entries = Object.entries(patch).filter(([, value]) => value !== undefined)

      await prisma.$transaction(
        entries.map(([key, value]) =>
          delegate().upsert({
            where: { key },
            update: { value: String(value ?? '') },
            create: { key, value: String(value ?? '') },
          }),
        ),
      )

      return this.read()
    },
  }
}

export const sectionsService = makeKvService('section')
export const settingsService = makeKvService('setting')
