/**
 * Konfigurasi Prisma CLI (Prisma 7).
 *
 * Di Prisma 7 koneksi database tidak lagi ditulis di `schema.prisma`, tapi di
 * sini. Berkas ini dibaca oleh perintah `prisma migrate`, `prisma db seed`,
 * `prisma studio`, dan `prisma validate`.
 *
 * Prisma 7 tidak memuat `.env` secara otomatis, jadi dotenv harus di-import
 * sendiri seperti di bawah.
 *
 * Catatan: nilai `url` sengaja boleh kosong supaya perintah yang tidak butuh
 * koneksi (mis. `prisma generate` saat `npm install` di platform deploy) tidak
 * gagal hanya karena DATABASE_URL belum ada.
 */

import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Seed dijalankan eksplisit lewat `npx prisma db seed` (Prisma 7 tidak lagi
    // otomatis menyeed setelah `migrate dev`).
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
