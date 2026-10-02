/**
 * Titik masuk server.
 *
 * Sengaja tetap tipis: validasi environment, rakit app, lalu dengarkan port.
 * Seluruh perilaku aplikasi ada di `src/`, jadi tidak ada logika bisnis di sini.
 *
 *   npm run dev   → nodemon, memuat ulang saat berkas berubah
 *   npm start     → produksi
 */

import { assertEnv, env } from './src/config/env.js'

async function main() {
  // Diperiksa lebih dulu supaya pesan galatnya jelas, bukan error Prisma yang
  // membingungkan saat koneksi pertama dibuat.
  assertEnv()

  // Import dinamis: modul aplikasi membuat PrismaClient saat di-import, jadi
  // pastikan env sudah tervalidasi sebelum itu.
  const { createApp } = await import('./src/app.js')

  const app = createApp()

  const server = app.listen(env.port, env.host, () => {
    console.log(`[api] server siap di http://${env.host}:${env.port}`)
    console.log(`[api] mode: ${env.nodeEnv}`)
    console.log(`[api] origin frontend: ${env.frontendUrls.join(', ')}`)
    console.log(`[api] folder upload: ${env.uploadDir}`)
  })

  /**
   * Shutdown rapi: platform deploy mengirim SIGTERM sebelum mengganti instance.
   * Request yang sedang berjalan diberi waktu sampai 10 detik untuk selesai.
   */
  function shutdown(signal) {
    console.log(`[api] menerima ${signal}, menutup server…`)

    server.close(() => process.exit(0))

    setTimeout(() => {
      console.warn('[api] shutdown melewati batas waktu, keluar paksa.')
      process.exit(1)
    }, 10_000).unref()
  }

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => shutdown(signal))
  }
}

main().catch((error) => {
  console.error(`[api] gagal dijalankan: ${error.message}`)
  process.exit(1)
})
