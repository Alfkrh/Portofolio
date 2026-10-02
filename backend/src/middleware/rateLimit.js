/**
 * Pembatas laju (rate limit) untuk endpoint yang rawan disalahgunakan:
 * form login dan form Contact di halaman publik.
 *
 * Responsnya memakai envelope yang sama dengan API lain supaya klien tidak
 * perlu menangani bentuk khusus.
 */

import rateLimit from 'express-rate-limit'

/** Batasi percobaan login per IP untuk meredam serangan tebak password. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.',
  },
})

/** Batasi pengiriman form Contact agar tidak dipakai untuk spam. */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak pesan dikirim. Coba lagi beberapa saat lagi.',
  },
})
