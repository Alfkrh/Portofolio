/**
 * Satu instance PrismaClient untuk seluruh proses.
 *
 * Dua hal yang khas Prisma 7 dan penting di sini:
 *  1. Client-nya tidak lagi berada di `node_modules` — ia dibuat ke
 *     `src/generated/prisma` oleh `prisma generate` (dijalankan otomatis oleh
 *     `postinstall`), jadi import-nya menunjuk ke folder itu.
 *  2. PrismaClient WAJIB diberi driver adapter. Kita memakai `@prisma/adapter-pg`
 *     yang meneruskan koneksi ke driver `pg`, sehingga pengaturan pool dan SSL
 *     mengikuti perilaku driver tersebut.
 *
 * `nodemon` memuat ulang modul setiap kali berkas berubah; tanpa penjagaan di
 * bawah, setiap reload membuka connection pool baru sampai database menolak
 * koneksi.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../config/env.js'
import { PrismaClient } from '../generated/prisma/index.js'

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  // Driver `pg` tidak punya batas waktu koneksi secara default (0 = menunggu
  // selamanya), sedangkan Prisma 6 memakai 5 detik. Tanpa batas ini, request
  // akan menggantung lama ketika database sedang tidak bisa dihubungi.
  connectionTimeoutMillis: 5000,
  // Secara default sertifikat SSL divalidasi seperti seharusnya. Sebagian host
  // database memakai sertifikat yang tidak dipercaya Node; untuk kasus itu
  // set DATABASE_SSL_REJECT_UNAUTHORIZED=false (lihat .env.example).
  ...(env.databaseSslRejectUnauthorized ? {} : { ssl: { rejectUnauthorized: false } }),
})

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.__portofolioPrisma ??
  new PrismaClient({
    adapter,
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  })

if (!env.isProduction) {
  globalForPrisma.__portofolioPrisma = prisma
}
