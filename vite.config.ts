import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { portfolioApiPlugin } from './server/vitePlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), portfolioApiPlugin()],
  server: {
    watch: {
      /**
       * Data runtime (SQLite WAL + file upload) berubah pada hampir setiap
       * request API. Tanpa diabaikan, Vite menganggapnya perubahan kode dan
       * memuat ulang halaman terus-menerus selama dashboard dipakai.
       */
      ignored: [
        '**/server/data/**',
        '**/uploads/**',
        '**/*.db',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/*.sqlite',
        '**/*.sqlite3',
      ],
    },
  },
})
