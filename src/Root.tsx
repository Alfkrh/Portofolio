import { useEffect } from 'react'
import App from './App.tsx'
import AdminApp from './admin/AdminApp.tsx'
import { useLocation } from './lib/useLocation.ts'
import { syncTheme } from './services/themeStore.ts'

/**
 * Pemisah rute: `/admin` (dashboard, tidak publik) dan sisanya halaman publik.
 * Dipisah di sini supaya halaman publik tidak perlu tahu soal admin.
 */
export default function Root() {
  const { pathname } = useLocation()

  // Dark mode hanya untuk halaman publik: lepaskan `.dark` saat masuk /admin.
  useEffect(() => {
    syncTheme()
  }, [pathname])

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminApp />
  }

  return <App />
}
