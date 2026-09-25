import { RefreshCw, TriangleAlert } from 'lucide-react'
import Button from './ui/Button'
import Container from './ui/Container'
import { cn } from '../lib/cn'

/** Blok skeleton dengan radius yang sama seperti elemen aslinya. */
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-line/70 motion-safe:animate-pulse', className)}
    />
  )
}

/**
 * Skeleton halaman saat konten sedang diambil dari API.
 * Strukturnya dibuat menyerupai layout asli supaya transisinya tidak melompat,
 * dan animasinya dinonaktifkan bila pengguna memilih reduced motion.
 */
export function PortfolioLoading() {
  return (
    <div className="min-h-screen bg-surface" role="status" aria-live="polite">
      <span className="sr-only">Memuat konten portfolio…</span>

      {/* Navbar */}
      <div className="border-b border-line bg-white/70">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <SkeletonBlock className="h-6 w-20 rounded-lg" />
            <div className="hidden items-center gap-3 lg:flex">
              {['w-14', 'w-12', 'w-20', 'w-11', 'w-16', 'w-16', 'w-14'].map(
                (width, index) => (
                  <SkeletonBlock
                    key={index}
                    className={cn('h-4 rounded-pill', width)}
                  />
                ),
              )}
            </div>
            <SkeletonBlock className="h-9 w-24 rounded-pill" />
          </div>
        </Container>
      </div>

      {/* Hero */}
      <div className="pt-20 pb-16 sm:pt-28 lg:pt-32">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-5">
              <SkeletonBlock className="h-8 w-36 rounded-pill" />
              <SkeletonBlock className="h-12 w-3/4 rounded-2xl sm:h-14" />
              <SkeletonBlock className="h-6 w-1/2 rounded-lg" />
              <div className="space-y-3 pt-1">
                <SkeletonBlock className="h-4 w-full rounded" />
                <SkeletonBlock className="h-4 w-11/12 rounded" />
                <SkeletonBlock className="h-4 w-9/12 rounded" />
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <SkeletonBlock className="h-12 w-full rounded-pill sm:w-44" />
                <SkeletonBlock className="h-12 w-full rounded-pill sm:w-36" />
              </div>
            </div>

            <SkeletonBlock className="mx-auto aspect-square w-full max-w-sm rounded-[2rem]" />
          </div>
        </Container>
      </div>

      {/* Section dengan band (mirip section Projects) */}
      <div className="border-y border-brand-100/70 bg-brand-50/50 py-20 lg:py-32">
        <Container>
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-28 rounded" />
            <SkeletonBlock className="h-9 w-64 rounded-2xl" />
            <SkeletonBlock className="h-4 w-72 rounded" />
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="overflow-hidden rounded-card border border-line bg-white"
              >
                <SkeletonBlock className="aspect-[4/3] w-full" />
                <div className="space-y-3 p-5 sm:p-7">
                  <SkeletonBlock className="h-5 w-2/3 rounded" />
                  <SkeletonBlock className="h-4 w-full rounded" />
                  <SkeletonBlock className="h-4 w-5/6 rounded" />
                  <SkeletonBlock className="h-7 w-20 rounded-pill" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  )
}

interface PortfolioErrorProps {
  message: string
  onRetry: () => void
  isRetrying?: boolean
}

/** Keadaan error: server/API tidak bisa dihubungi. */
export function PortfolioError({
  message,
  onRetry,
  isRetrying = false,
}: PortfolioErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-24">
      <Container className="max-w-lg">
        <div className="rounded-card border border-line bg-white p-6 text-center shadow-soft sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <TriangleAlert aria-hidden="true" className="h-6 w-6" />
          </span>

          <h1 className="mt-5 text-xl font-bold text-navy">
            Konten portfolio gagal dimuat
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {message}
          </p>

          <p className="mt-4 rounded-xl bg-surface p-3 text-left text-xs leading-relaxed text-slate-400">
            Pastikan backend berjalan. Di mode pengembangan cukup jalankan
            <span className="font-semibold text-slate-500"> npm run dev</span>
            ; di produksi jalankan
            <span className="font-semibold text-slate-500"> npm run start</span>{' '}
            setelah
            <span className="font-semibold text-slate-500"> npm run build</span>.
          </p>

          <Button
            onClick={onRetry}
            disabled={isRetrying}
            icon={RefreshCw}
            iconPosition="left"
            className="mt-6"
          >
            {isRetrying ? 'Memuat ulang…' : 'Coba lagi'}
          </Button>
        </div>
      </Container>
    </div>
  )
}
