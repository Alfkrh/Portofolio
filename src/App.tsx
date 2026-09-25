import { useCallback, useState } from 'react'
import About from './components/About'
import Contact from './components/Contact'
import Education from './components/Education'
import Experience from './components/Experience'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Navbar from './components/Navbar'
import { PortfolioError, PortfolioLoading } from './components/PortfolioStates'
import ProfileNotConfigured from './components/ProfileNotConfigured'
import Projects from './components/Projects'
import Skills from './components/Skills'
import { navItems, sectionText } from './config/siteCopy'
import { usePortfolio } from './hooks/usePortfolio'
import { useSiteMeta } from './hooks/useSiteMeta'

/**
 * Halaman publik portfolio.
 *
 * Tidak ada konten yang di-hardcode di sini: seluruh data diambil dari
 * `GET /api/portfolio` (SQLite di backend). Halaman akan memuat ulang konten
 * saat tab kembali aktif, sehingga perubahan dari admin langsung terlihat.
 */
export default function App() {
  const { status, data, error, reload } = usePortfolio()

  // Judul tab, meta description, dan favicon mengikuti tabel `settings`
  // (diubah dari dashboard → Settings → Portfolio).
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    try {
      await reload()
    } finally {
      setIsRetrying(false)
    }
  }, [reload])

  const profile = data?.profile ?? null

  // Judul tab dari pengaturan situs; bila belum diisi, pakai data profil.
  useSiteMeta(
    data?.settings,
    profile
      ? profile.headline
        ? `${profile.name} — ${profile.headline}`
        : profile.name
      : undefined,
  )

  if (status === 'loading') {
    return <PortfolioLoading />
  }

  if (status === 'error' || !data) {
    return (
      <PortfolioError
        message={error ?? 'Terjadi kesalahan yang tidak diketahui.'}
        onRetry={() => void handleRetry()}
        isRetrying={isRetrying}
      />
    )
  }

  if (!profile) {
    return <ProfileNotConfigured onReload={reload} />
  }

  const sections = data.sections

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:inline-flex focus:h-10 focus:items-center focus:rounded-pill focus:bg-brand-600 focus:px-4 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten utama
      </a>

      <Navbar
        items={navItems}
        logo={profile.logo}
        name={profile.name}
        ctaLabel={sectionText(sections, 'nav.cta_label')}
      />

      <main>
        <Hero
          profile={profile}
          contacts={data.contacts}
          sections={sections}
          onPhotoChanged={reload}
        />
        <About profile={profile} sections={sections} />
        <Experience items={data.experience} sections={sections} />
        <Skills skills={data.skills} sections={sections} />
        <Projects
          projects={data.projects}
          filters={data.project_filters}
          sections={sections}
        />
        <Education items={data.education} sections={sections} />
        <Contact contacts={data.contacts} sections={sections} />
      </main>

      <Footer
        name={profile.name}
        logo={profile.logo}
        tagline={sectionText(sections, 'footer.tagline')}
        contacts={data.contacts}
      />
    </div>
  )
}
