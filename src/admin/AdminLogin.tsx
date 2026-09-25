/**
 * Gerbang login admin.
 *
 * Dua mode:
 * - `setup`  : belum ada akun admin di database → buat email + password pertama.
 * - `login`  : akun sudah ada → masuk dengan email + password.
 *
 * Password hanya dikirim ke API (di-hash scrypt di server); yang disimpan di
 * browser hanyalah token sesi, dan itu pun hanya hash-nya yang ada di server.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import IconTile from '../components/ui/IconTile'
import { MIN_PASSWORD_LENGTH, SESSION_TTL_DAYS } from '../config/authPolicy'
import { AdminAlert } from './ui/AdminPanels'

interface AdminLoginProps {
  /** `true` bila belum ada akun admin (tampilkan form pembuatan akun). */
  setupRequired: boolean
  onLogin: (email: string, password: string) => Promise<string | null>
  onSetup: (email: string, password: string) => Promise<string | null>
}

export default function AdminLogin({
  setupRequired,
  onLogin,
  onSetup,
}: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (email.trim().length === 0) {
      setError('Email admin belum diisi.')
      return
    }
    if (password.length === 0) {
      setError('Password belum diisi.')
      return
    }
    if (setupRequired) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`)
        return
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password belum sama.')
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    const message = setupRequired
      ? await onSetup(email.trim(), password)
      : await onLogin(email.trim(), password)

    if (message) setError(message)
    setIsSubmitting(false)
  }

  const Icon = setupRequired ? UserPlus : LockKeyhole

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-5 py-16">
      <div className="w-full max-w-md rounded-card border border-line bg-white p-6 shadow-lift sm:p-8">
        <IconTile icon={Icon} size="lg" tone="solid" />

        <h1 className="mt-5 font-display text-xl font-extrabold tracking-tight text-navy">
          {setupRequired ? 'Buat akun admin' : 'Masuk ke Admin Dashboard'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {setupRequired
            ? 'Belum ada akun admin di database ini. Buat akun pertama untuk mengamankan dashboard — semua endpoint tulis hanya bisa dipakai setelah login.'
            : 'Dashboard ini diproteksi. Masuk dengan akun admin untuk mengelola konten portfolio.'}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6">
          <label
            htmlFor="admin-email"
            className="block text-xs font-semibold tracking-wide text-navy"
          >
            Email admin
          </label>

          <input
            id="admin-email"
            type="email"
            value={email}
            autoComplete="username"
            autoFocus
            placeholder="nama@email.com"
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-navy transition duration-200 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />

          <label
            htmlFor="admin-password"
            className="mt-4 block text-xs font-semibold tracking-wide text-navy"
          >
            Password
          </label>

          <div className="relative mt-2">
            <input
              id="admin-password"
              type={isVisible ? 'text' : 'password'}
              value={password}
              autoComplete={setupRequired ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-line bg-white py-2.5 pr-11 pl-3.5 text-sm text-navy transition duration-200 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />

            <button
              type="button"
              onClick={() => setIsVisible((current) => !current)}
              aria-label={isVisible ? 'Sembunyikan password' : 'Tampilkan password'}
              className="absolute inset-y-0 right-1.5 my-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition duration-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {isVisible ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>

          {setupRequired ? (
            <>
              <label
                htmlFor="admin-password-confirm"
                className="mt-4 block text-xs font-semibold tracking-wide text-navy"
              >
                Ulangi password
              </label>
              <input
                id="admin-password-confirm"
                type={isVisible ? 'text' : 'password'}
                value={confirmPassword}
                autoComplete="new-password"
                placeholder="••••••••"
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-navy transition duration-200 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Minimal {MIN_PASSWORD_LENGTH} karakter, memuat huruf dan angka.
                Password disimpan sebagai hash scrypt — tidak pernah dikirim
                balik oleh server.
              </p>
            </>
          ) : null}

          {error ? (
            <AdminAlert tone="error" className="mt-4">
              {error}
            </AdminAlert>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-brand-600 px-5 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-700 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-safe:hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Icon aria-hidden="true" className="h-4 w-4" />
            )}
            {isSubmitting
              ? setupRequired
                ? 'Membuat akun…'
                : 'Memeriksa…'
              : setupRequired
                ? 'Buat akun & masuk'
                : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-slate-400">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600"
          />
          <span>
            Sesi login berlaku {SESSION_TTL_DAYS} hari dan bisa dicabut kapan
            saja dari Settings → Security. Halaman /admin mana pun akan
            diarahkan ke layar ini bila Anda belum login.
          </span>
        </p>
      </div>
    </div>
  )
}
