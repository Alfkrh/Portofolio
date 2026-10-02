/**
 * Service profil.
 *
 * Profil adalah tabel singleton: selalu satu baris dengan id = 1. Karena itu
 * operasi tulisnya memakai `upsert` — kalau barisnya belum ada (database baru)
 * baris itu dibuat otomatis, jadi dashboard tidak pernah gagal hanya karena
 * profilnya masih kosong.
 */

import { prisma } from '../lib/prisma.js'

const PROFILE_ID = 1

export const profileService = {
  get() {
    return prisma.profile.findUnique({ where: { id: PROFILE_ID } })
  },

  upsert(data) {
    return prisma.profile.upsert({
      where: { id: PROFILE_ID },
      update: data,
      create: { id: PROFILE_ID, name: data.name ?? 'Nama Anda', ...data },
    })
  },
}
