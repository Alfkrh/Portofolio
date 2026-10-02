/**
 * Seed database.
 *
 * Dijalankan eksplisit dengan `npx prisma db seed` (Prisma 7 tidak lagi
 * menyeed otomatis setelah `migrate dev`).
 *
 * Yang diisi di sini hanya *kerangka*, bukan konten portfolio:
 *  - pengaturan dasar situs, bila tabel `settings` masih kosong;
 *  - akun admin pertama, bila `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` di-set.
 *
 * Isi portfolio TIDAK diisi dari sini — data lama dipindahkan dari database
 * SQLite lewat skrip migrasi terpisah, supaya konten asli yang sudah ada tidak
 * tertimpa data contoh.
 */

import { hashPassword, validatePasswordStrength } from '../src/utils/password.js'
import { prisma } from '../src/lib/prisma.js'

const DEFAULT_SETTINGS = {
  'site.name': 'Alif Fikri',
  'site.title': 'Alif Fikri — Information Systems Student & Digital Creative',
  'site.description':
    'Portfolio pribadi Alif Fikri — mahasiswa Sistem Informasi yang berfokus pada UI/UX Design, Web Development, dan teknologi digital.',
  'site.favicon_url': '/favicon.svg',
}

async function seedSettings() {
  const existing = await prisma.setting.count()
  if (existing > 0) {
    console.log('[seed] settings sudah terisi, dilewati.')
    return
  }

  await prisma.setting.createMany({
    data: Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })),
  })

  console.log(`[seed] ${Object.keys(DEFAULT_SETTINGS).length} pengaturan situs dibuat.`)
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim()
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    console.log('[seed] SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD kosong, akun admin dilewati.')
    return
  }

  const existing = await prisma.adminUser.count()
  if (existing > 0) {
    console.log('[seed] akun admin sudah ada, dilewati.')
    return
  }

  const problem = validatePasswordStrength(password, email)
  if (problem) {
    throw new Error(`SEED_ADMIN_PASSWORD lemah: ${problem}`)
  }

  await prisma.adminUser.create({
    data: { email: email.toLowerCase(), password_hash: hashPassword(password) },
  })

  console.log(`[seed] akun admin ${email.toLowerCase()} dibuat.`)
}

async function main() {
  await seedSettings()
  await seedAdmin()
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('[seed] gagal:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  })
