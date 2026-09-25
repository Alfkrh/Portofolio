/**
 * Admin dashboard (`/admin`).
 *
 * Bukan halaman publik: dashboard ini memakai endpoint tulis API portfolio
 * (POST/PUT/DELETE) yang — bila `PORTFOLIO_ADMIN_TOKEN` di-set — hanya bisa
 * diakses setelah token diverifikasi.
 */

import { useEffect, useState } from 'react'
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { siteSetting } from '../config/siteSettings'
import Button from '../components/ui/Button'
import { usePortfolio } from '../hooks/usePortfolio'
import { navigate, useLocation } from '../lib/useLocation'
import AdminHeader from './AdminHeader'
import AdminLogin from './AdminLogin'
import AdminSidebar from './AdminSidebar'
import {
  ADMIN_BASE,
  ADMIN_LOGIN_PATH,
  adminNav,
  collectionConfigs,
  findNavItem,
} from './adminConfig'
import { useAdminSession } from './hooks/useAdminSession'
import { adminDisplayName, initialsOf } from './itemView'
import AdminAbout from './pages/AdminAbout'
import AdminCollectionPage from './pages/AdminCollectionPage'
import AdminEducation from './pages/AdminEducation'
import AdminExperience from './pages/AdminExperience'
import AdminOverview from './pages/AdminOverview'
import AdminProfile from './pages/AdminProfile'
import AdminProjects from './pages/AdminProjects'
import AdminSettings from './pages/AdminSettings'
import AdminSkills from './pages/AdminSkills'
import { AdminAlert, AdminPanel, AdminSkeletonRows } from './ui/AdminPanels'

/** Layar status tingkat halaman (sesi admin / data portfolio belum siap). */
function AdminStatusScreen({
  title,
  message,
  onRetry,
  isRetrying = false,
}: {
  title: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-16">
      <div className="w-full max-w-lg rounded-card border border-line bg-white p-6 text-center shadow-soft sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {onRetry ? (
            <TriangleAlert aria-hidden="true" className="h-6 w-6" />
          ) : (
            <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
          )}
        </span>

        <h1 className="mt-5 font-display text-xl font-bold text-navy">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{message}</p>

        {onRetry ? (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            icon={RefreshCw}
            iconPosition="left"
            className="mt-6"
          >
            {isRetrying ? 'Memuat ulang…' : 'Coba lagi'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Rute admin yang tidak dikenal. */
function AdminNotFound() {
  return (
    <AdminPanel title="Halaman tidak ditemukan">
      <p className="text-sm text-slate-500">
        Menu yang Anda buka tidak tersedia pada dashboard ini.
      </p>
      <Button onClick={() => navigate('/admin')} className="mt-5">
        Kembali ke Dashboard
      </Button>
    </AdminPanel>
  )
}

export default function AdminApp() {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const {
    status: sessionStatus,
    session,
    error: sessionError,
    isRetrying,
    reload: reloadSession,
    login,
    setup,
    logout,
    logoutAll,
  } = useAdminSession()

  const {
    status: dataStatus,
    data,
    error: dataError,
    reload,
  } = usePortfolio()

  const navItem = findNavItem(location.pathname)
  const isAuthenticated = session?.authenticated === true
  const isLoginRoute = location.pathname === ADMIN_LOGIN_PATH

  useEffect(() => {
    const siteName = siteSetting(data?.settings, 'site.name')
    document.title = navItem
      ? `${navItem.title} — Admin ${siteName}`
      : `Admin ${siteName}`
  }, [data?.settings, navItem])

  /**
   * Setiap halaman /admin/* hanya boleh dibuka oleh admin yang sudah login.
   * Pengunjung tanpa sesi diarahkan ke layar login (URL ikut dirapikan) sambil
   * menyimpan tujuan awal agar bisa dilanjutkan setelah berhasil masuk.
   */
  useEffect(() => {
    if (sessionStatus !== 'ready' || !session || isAuthenticated) return

    if (!isLoginRoute) {
      const next = `${location.pathname}${location.search}`
      navigate(`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(next)}`, {
        replace: true,
      })
    }
  }, [isAuthenticated, isLoginRoute, location.pathname, location.search, session, sessionStatus])

  /** Setelah login dari /admin/login, lanjutkan ke halaman yang tadi diminta. */
  useEffect(() => {
    if (!isAuthenticated || !isLoginRoute) return

    const next = new URLSearchParams(location.search).get('next')
    const target = next && next.startsWith('/admin') ? next : ADMIN_BASE
    navigate(target, { replace: true })
  }, [isAuthenticated, isLoginRoute, location.search])

  if (sessionStatus === 'loading') {
    return (
      <AdminStatusScreen
        title="Memeriksa status admin"
        message="Menghubungi server portfolio untuk memastikan akses tulis."
      />
    )
  }

  if (sessionStatus === 'error' || !session) {
    return (
      <AdminStatusScreen
        title="Dashboard tidak bisa dibuka"
        message={
          sessionError ??
          'Server portfolio tidak bisa dihubungi. Pastikan backend berjalan.'
        }
        onRetry={() => void reloadSession()}
        isRetrying={isRetrying}
      />
    )
  }

  // Tanpa sesi login: dashboard tidak pernah dirender, hanya layar login.
  if (!isAuthenticated) {
    return (
      <AdminLogin
        setupRequired={session.setupRequired}
        onLogin={login}
        onSetup={setup}
      />
    )
  }

  const adminName = adminDisplayName(data?.profile ?? null)

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar
        items={adminNav}
        activePath={navItem?.path ?? location.pathname}
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-72">
        <AdminHeader
          title={navItem?.title ?? 'Admin'}
          description={navItem?.description ?? 'Kelola konten website portfolio.'}
          adminName={adminName}
          initials={initialsOf(adminName)}
          email={session.email}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onLogout={logout}
        />

        <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* `key` memastikan form tiap halaman dimulai dari data terbaru. */}
          <div key={location.pathname} className="space-y-6">
            {!data ? (
              dataStatus === 'error' ? (
                <AdminPanel title="Konten portfolio gagal dimuat">
                  <AdminAlert tone="error">
                    {dataError ??
                      'Tidak bisa terhubung ke server portfolio. Pastikan backend berjalan.'}
                  </AdminAlert>
                  <Button
                    onClick={() => void reload()}
                    icon={RefreshCw}
                    iconPosition="left"
                    className="mt-5"
                  >
                    Coba lagi
                  </Button>
                </AdminPanel>
              ) : (
                <>
                  <AdminAlert>
                    Memuat konten portfolio dari server…
                  </AdminAlert>
                  <AdminSkeletonRows rows={4} />
                </>
              )
            ) : !navItem ? (
              <AdminNotFound />
            ) : navItem.id === 'dashboard' ? (
              <AdminOverview data={data} onNavigate={navigate} />
            ) : navItem.id === 'profile' ? (
              <AdminProfile
                profile={data.profile}
                contacts={data.contacts}
                onSaved={reload}
              />
            ) : navItem.id === 'about' ? (
              <AdminAbout
                profile={data.profile}
                sections={data.sections}
                onSaved={reload}
              />
            ) : navItem.id === 'experience' ? (
              <AdminExperience data={data} reload={reload} />
            ) : navItem.id === 'skills' ? (
              <AdminSkills data={data} reload={reload} />
            ) : navItem.id === 'projects' ? (
              <AdminProjects data={data} reload={reload} />
            ) : navItem.id === 'education' ? (
              <AdminEducation data={data} reload={reload} />
            ) : navItem.id === 'contact' ? (
              <AdminCollectionPage
                config={collectionConfigs.contacts}
                data={data}
                reload={reload}
              />
            ) : (
              <AdminSettings
                data={data}
                reload={reload}
                session={session}
                onLogout={logout}
                onLogoutAll={logoutAll}
                onSessionChanged={reloadSession}
              />
            )}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-7xl px-5 pb-10 text-xs text-slate-400 sm:px-6 lg:px-8">
          Admin dashboard • data tersimpan di SQLite dan disajikan lewat API
          portfolio.
        </footer>
      </div>
    </div>
  )
}
