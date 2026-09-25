import { DatabaseZap } from 'lucide-react'
import Button from './ui/Button'
import Container from './ui/Container'

interface ProfileNotConfiguredProps {
  onReload: () => Promise<void> | void
}

/**
 * Ditampilkan bila API berjalan tetapi tabel `profile` masih kosong, sehingga
 * pemilik portfolio tahu langkah berikutnya (bukan halaman blank).
 */
export default function ProfileNotConfigured({
  onReload,
}: ProfileNotConfiguredProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-24">
      <Container className="max-w-lg">
        <div className="rounded-card border border-line bg-white p-8 text-center shadow-soft">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <DatabaseZap aria-hidden="true" className="h-6 w-6" />
          </span>

          <h1 className="mt-5 text-xl font-bold text-navy">
            Database portfolio masih kosong
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            API berjalan, tetapi belum ada data profil. Jalankan ulang server
            untuk mengisi konten awal, atau kirim data lewat
            <span className="font-semibold text-slate-600">
              {' '}
              PUT /api/profile
            </span>
            .
          </p>

          <Button onClick={() => void onReload()} className="mt-6">
            Muat ulang data
          </Button>
        </div>
      </Container>
    </div>
  )
}
