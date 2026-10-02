/**
 * PostgreSQL lokal untuk pengembangan — tanpa Docker, tanpa install sistem.
 *
 * Skrip ini menjalankan cluster PostgreSQL milik sendiri di dalam folder
 * `backend/.pgdata` (paket `embedded-postgres` mengunduh binari resmi saat
 * `npm install`). Dipakai supaya `npm run db:dev` cukup untuk mendapatkan
 * database yang bisa dimigrasi dan diuji.
 *
 * Jalankan di terminal terpisah, biarkan hidup selama mengembangkan:
 *   npm run db:dev
 *
 * Lalu di terminal lain:
 *   npm run db:deploy   # buat/rapikan tabel
 *   npm run db:seed     # isi data awal
 *   npm run dev
 *
 * Tidak dipakai di produksi — di Render database datang dari service Postgres
 * (lihat `DATABASE_URL` di render.yaml).
 */

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import EmbeddedPostgres from 'embedded-postgres'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(here, '..', '.pgdata')

const port = Number(process.env.DEV_DB_PORT ?? 55432)
const user = process.env.DEV_DB_USER ?? 'postgres'
const password = process.env.DEV_DB_PASSWORD ?? 'postgres'
const database = process.env.DEV_DB_NAME ?? 'portofolio'

const url = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`

mkdirSync(dataDir, { recursive: true })

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
})

// `initialise()` hanya perlu sekali; setelah folder data ada, cluster-nya
// dikenali dan aman dipanggil lagi.
await pg.initialise()
await pg.start()

try {
  await pg.createDatabase(database)
} catch {
  // Database sudah ada dari run sebelumnya — bukan masalah.
}

console.log(`
  PostgreSQL dev siap.

  DATABASE_URL=${url}

  Tempel baris di atas ke backend/.env, lalu (terminal lain):
    npm run db:deploy && npm run db:seed
    npm run dev

  Tekan Ctrl+C untuk mematikan database.
`)

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  console.log('\n  Menghentikan PostgreSQL...')
  try {
    await pg.stop()
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
