/**
 * Alamat API portfolio — satu tempat untuk seluruh frontend.
 *
 * Default `/api` (API berada di origin yang sama, dipakai `npm run dev` dan
 * `npm start`). Bila backend di-host terpisah dari frontend — mis. frontend di
 * Vercel dan API Node di Render/Railway — isi `VITE_API_BASE` saat build
 * (di Vercel: Project Settings → Environment Variables).
 */

const configured = import.meta.env.VITE_API_BASE?.trim()

/** Base URL API tanpa garis miring di akhir, mis. `/api`. */
export const API_BASE = (
  configured && configured.length > 0 ? configured : '/api'
).replace(/\/+$/, '')

/**
 * Origin server API, mis. `https://portfolio-api.onrender.com`.
 *
 * Dipakai untuk menyusun URL berkas yang disimpan server sebagai path relatif
 * (`/uploads/...`); lihat `src/lib/assetUrl.ts`.
 */
export const API_ORIGIN = new URL(API_BASE, window.location.origin).origin
