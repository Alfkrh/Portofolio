/**
 * Pembacaan & validasi environment.
 *
 * Semua nilai yang dibutuhkan aplikasi dibaca di satu tempat, dan kalau ada
 * yang belum diisi prosesnya berhenti langsung dengan pesan yang jelas —
 * jauh lebih enak daripada error samar di tengah request.
 */

import { config } from 'dotenv'

// `quiet` mematikan banner bawaan dotenv yang hanya menambah bising di log
// produksi.
config({ quiet: true })

/** Nilai default dipakai hanya saat pengembangan lokal. */
const DEFAULTS = {
  PORT: '5000',
  HOST: '0.0.0.0',
  FRONTEND_URL: 'http://localhost:5173',
  SESSION_TTL_DAYS: '7',
  UPLOAD_DIR: './uploads',
  MAX_UPLOAD_BYTES: String(5 * 1024 * 1024),
}

function read(key) {
  const value = process.env[key]?.trim()
  return value && value.length > 0 ? value : undefined
}

function readBoolean(key, fallback) {
  const raw = read(key)
  if (raw === undefined) return fallback
  return !['0', 'false', 'no', 'off'].includes(raw.toLowerCase())
}

function readNumber(key, { min, max, allowZero = false } = {}) {
  const raw = read(key) ?? DEFAULTS[key]
  const value = Number(raw)

  if (!Number.isFinite(value) || value < 0 || (value === 0 && !allowZero)) {
    throw new Error(
      `Environment "${key}" harus berupa angka positif, tapi bernilai "${raw}".`,
    )
  }
  if (min !== undefined && value < min) {
    throw new Error(`Environment "${key}" minimal ${min}.`)
  }
  if (max !== undefined && value > max) {
    throw new Error(`Environment "${key}" maksimal ${max}.`)
  }

  return value
}

/** Origin frontend yang diizinkan mengakses API (CORS). */
const frontendUrls = (read('FRONTEND_URL') ?? DEFAULTS.FRONTEND_URL)
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter((value) => value.length > 0)

export const env = {
  nodeEnv: read('NODE_ENV') ?? 'development',
  isProduction: read('NODE_ENV') === 'production',
  // `PORT=0` berarti "pilih port kosong" (perilaku `server.listen(0)` di Node),
  // jadi nilai ini sah — penting karena sebagian lingkungan (termasuk skrip
  // tooling) mengisi `PORT=0` secara otomatis.
  port: readNumber('PORT', { max: 65535, allowZero: true }),
  host: read('HOST') ?? DEFAULTS.HOST,
  databaseUrl: read('DATABASE_URL'),
  databaseSslRejectUnauthorized: readBoolean(
    'DATABASE_SSL_REJECT_UNAUTHORIZED',
    true,
  ),
  sessionSecret: read('SESSION_SECRET'),
  sessionTtlDays: readNumber('SESSION_TTL_DAYS', { max: 365 }),
  frontendUrls,
  uploadDir: read('UPLOAD_DIR') ?? DEFAULTS.UPLOAD_DIR,
  maxUploadBytes: readNumber('MAX_UPLOAD_BYTES', { min: 1024 }),
}

/**
 * Pastikan variabel wajib sudah ada sebelum server mulai menerima request.
 * Dipanggil dari `server.js`, bukan saat modul ini di-import, supaya skrip
 * seperti `prisma generate` tidak ikut gagal.
 */
export function assertEnv() {
  const missing = []

  if (!env.databaseUrl) missing.push('DATABASE_URL')
  if (!env.sessionSecret) missing.push('SESSION_SECRET')

  if (missing.length > 0) {
    throw new Error(
      `Environment berikut belum diisi: ${missing.join(', ')}.\n` +
        'Salin backend/.env.example menjadi backend/.env lalu isi nilainya.',
    )
  }

  if (env.isProduction && env.sessionSecret.length < 32) {
    throw new Error(
      'SESSION_SECRET terlalu pendek untuk produksi (minimal 32 karakter). ' +
        'Buat nilai acak, mis. `openssl rand -base64 48`.',
    )
  }
}
