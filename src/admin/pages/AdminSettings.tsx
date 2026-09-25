/**
 * Halaman Settings: akun admin, pengaturan situs (nama/judul/deskripsi/favicon),
 * tautan sosial, status keamanan, teks section, dan informasi sistem.
 *
 * Bagian SECURITY bersifat informasi: proteksi dashboard selalu aktif dan tidak
 * bisa dimatikan dari UI — panel ini hanya menampilkan status + aksi sesi.
 */

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import IconTile from '../../components/ui/IconTile'
import { MIN_PASSWORD_LENGTH, SESSION_TTL_DAYS } from '../../config/authPolicy'
import { SITE_SETTING_DEFAULTS } from '../../config/siteSettings'
import { sectionFallbacks } from '../../config/siteCopy'
import { formatDateTime } from '../../lib/formatDate'
import { cn } from '../../lib/cn'
import { getContactIcon } from '../../lib/contactIcons'
import {
  changeAdminEmail,
  changeAdminPassword,
  updateSections,
  updateSettings,
  type AdminSession,
} from '../../services/portfolioApi'
import type { PortfolioData } from '../../types/portfolio'
import { sectionTextGroups } from '../adminConfig'
import {
  PROFILE_CONTACT_FIELDS,
  useProfileContacts,
} from '../hooks/useProfileContacts'
import { AdminAlert, AdminPanel } from '../ui/AdminPanels'
import {
  AdminFormFooter,
  AdminTextInput,
  FormRow,
  ImageFieldControl,
} from '../ui/AdminForm'
import { fieldInputClasses } from '../ui/fieldStyles'

const MULTILINE_KEYS = new Set(['contact.description', 'contact.form_note'])

const PART_LABELS: Record<string, string> = {
  eyebrow: 'Eyebrow',
  title: 'Judul',
  subtitle: 'Subtitle',
  cta_label: 'Label tombol',
  description: 'Deskripsi',
  form_note: 'Catatan form',
  tagline: 'Tagline',
}

/** Field pengaturan situs yang diedit di panel Portfolio. */
const SITE_FIELDS = [
  {
    key: 'site.name',
    label: 'Portfolio name',
    hint: 'Nama/brand yang dipakai pada judul dashboard dan fallback judul situs.',
    placeholder: SITE_SETTING_DEFAULTS['site.name'],
  },
  {
    key: 'site.title',
    label: 'Website title',
    hint: 'Judul pada tab browser halaman publik.',
    placeholder: SITE_SETTING_DEFAULTS['site.title'],
  },
] as const

const SUCCESS_NOTE_DURATION_MS = 6000

function labelFor(key: string): string {
  const [section, part] = key.split('.')
  return `${PART_LABELS[part] ?? part} · ${section}`
}

interface AdminSettingsProps {
  data: PortfolioData
  reload: () => Promise<void>
  session: AdminSession
  onLogout: () => Promise<void>
  onLogoutAll: () => Promise<string | null>
  /** Muat ulang status sesi (mis. setelah email admin berubah). */
  onSessionChanged: () => Promise<void>
}

export default function AdminSettings({
  data,
  reload,
  session,
  onLogout,
  onLogoutAll,
  onSessionChanged,
}: AdminSettingsProps) {
  /* ------------------------------ teks section ----------------------------- */
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  /* --------------------------- pengaturan situs ---------------------------- */
  const [siteDraft, setSiteDraft] = useState<Record<string, string> | null>(null)
  const [isSavingSite, setIsSavingSite] = useState(false)
  const [siteError, setSiteError] = useState<string | null>(null)

  /* ------------------------------- sosial --------------------------------- */
  const contactForm = useProfileContacts(data.contacts, reload)

  /* -------------------------------- akun ---------------------------------- */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const [note, setNote] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState(false)

  // Notifikasi hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => setNote(null), SUCCESS_NOTE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [note])

  const values: Record<string, string> = draft ?? data.sections
  const allKeys = sectionTextGroups.flatMap((group) => group.keys)
  const dirtyKeys = allKeys.filter(
    (key) => (values[key] ?? '') !== (data.sections[key] ?? ''),
  )

  const siteValues: Record<string, string> = siteDraft ?? {
    'site.name': data.settings['site.name'] ?? '',
    'site.title': data.settings['site.title'] ?? '',
    'site.description': data.settings['site.description'] ?? '',
    'site.favicon_url': data.settings['site.favicon_url'] ?? '',
  }


  /** Pengaturan tersimpan dari server (semua key diperlakukan sebagai teks). */
  const storedSettings: Record<string, string> = data.settings

  const siteDirtyKeys = [
    'site.name',
    'site.title',
    'site.description',
    'site.favicon_url',
  ].filter((key) => (siteValues[key] ?? '') !== (storedSettings[key] ?? ''))

  const socialFields = PROFILE_CONTACT_FIELDS.filter(
    (field) => field.kind !== 'email',
  )

  const setSectionValue = (key: string, value: string) => {
    setSavedAt(null)
    setDraft((current) => ({ ...(current ?? data.sections), [key]: value }))
  }

  const handleSectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (dirtyKeys.length === 0) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const patch: Record<string, string> = {}
      for (const key of dirtyKeys) patch[key] = values[key] ?? ''
      await updateSections(patch)
      await reload()
      setDraft(null)
      setSavedAt(Date.now())
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : 'Teks section gagal disimpan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleSiteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (siteDirtyKeys.length === 0) return

    setIsSavingSite(true)
    setSiteError(null)

    try {
      const patch: Record<string, string> = {}
      for (const key of siteDirtyKeys) patch[key] = siteValues[key] ?? ''
      await updateSettings(patch)
      await reload()
      setSiteDraft(null)
      setNote('Pengaturan portfolio disimpan dan sudah dipakai di website.')
    } catch (cause) {
      setSiteError(
        cause instanceof Error
          ? cause.message
          : 'Pengaturan portfolio gagal disimpan.',
      )
    } finally {
      setIsSavingSite(false)
    }
  }

  const handleSocialSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const status = await contactForm.save()
    if (status === 'saved') {
      setNote('Tautan sosial diperbarui di Hero, Contact, dan Footer.')
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setAccountError(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setAccountError('Konfirmasi password baru belum sama.')
      return
    }

    setIsSubmittingAccount(true)
    setAccountError(null)

    try {
      const result = await changeAdminPassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNote(
        result.revoked > 0
          ? `Password diganti. ${result.revoked} sesi lain diakhiri.`
          : 'Password admin berhasil diganti.',
      )
      await onSessionChanged()
    } catch (cause) {
      setAccountError(
        cause instanceof Error ? cause.message : 'Password gagal diganti.',
      )
    } finally {
      setIsSubmittingAccount(false)
    }
  }

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSubmittingAccount(true)
    setAccountError(null)

    try {
      const result = await changeAdminEmail(emailPassword, emailDraft)
      setEmailDraft('')
      setEmailPassword('')
      setNote(`Email admin diganti menjadi ${result.email}.`)
      await onSessionChanged()
    } catch (cause) {
      setAccountError(
        cause instanceof Error ? cause.message : 'Email gagal diganti.',
      )
    } finally {
      setIsSubmittingAccount(false)
    }
  }

  const handleLogoutAll = async () => {
    const message = await onLogoutAll()
    if (message) setAccountError(message)
  }

  const itemTotal =
    data.projects.length +
    data.experience.length +
    data.skills.length +
    data.education.length +
    data.contacts.length +
    data.project_filters.length

  const apiBase = import.meta.env.VITE_API_BASE ?? '/api'
  const hasAccount = session.authMode === 'session'

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      {/* ------------------------------ ACCOUNT ------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Akun admin"
          description="Email untuk login ke dashboard ini."
        >
          <div className="flex items-start gap-4">
            <IconTile icon={UserRound} size="md" tone="soft" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">
                {session.email ?? 'Kredensial token (env server)'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {hasAccount
                  ? `Sesi berlaku ${SESSION_TTL_DAYS} hari dan diperpanjang otomatis selama dipakai.`
                  : 'Anda masuk memakai PORTFOLIO_ADMIN_TOKEN dari env server, bukan akun dashboard.'}
              </p>
            </div>
          </div>

          {hasAccount ? (
            <form onSubmit={(event) => void handleEmailSubmit(event)} className="mt-5 border-t border-line pt-5">
              <FormRow
                htmlFor="settings-admin-email"
                label="Ganti email admin"
                hint="Perlu konfirmasi password untuk mencegah perubahan tanpa izin."
              >
                <input
                  id="settings-admin-email"
                  type="email"
                  value={emailDraft}
                  placeholder={session.email ?? 'nama@email.com'}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  className={fieldInputClasses(false)}
                />
              </FormRow>

              <FormRow
                htmlFor="settings-email-password"
                label="Password saat ini"
              >
                <input
                  id="settings-email-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={emailPassword}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(event) => setEmailPassword(event.target.value)}
                  className={fieldInputClasses(false)}
                />
              </FormRow>

              <button
                type="submit"
                disabled={
                  isSubmittingAccount ||
                  emailDraft.trim().length === 0 ||
                  emailPassword.length === 0
                }
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-semibold text-navy shadow-soft transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
                Simpan email
              </button>
            </form>
          ) : null}
        </AdminPanel>

        <AdminPanel
          title="Change password"
          description="Password disimpan sebagai hash scrypt. Sesi di perangkat lain otomatis diakhiri setelah penggantian."
        >
          {hasAccount ? (
            <form onSubmit={(event) => void handlePasswordSubmit(event)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
                  Keamanan akun
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-slate-500 transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  {showPasswords ? (
                    <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {showPasswords ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <FormRow
                  htmlFor="settings-current-password"
                  label="Password saat ini"
                >
                  <input
                    id="settings-current-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className={fieldInputClasses(false)}
                  />
                </FormRow>

                <FormRow
                  htmlFor="settings-new-password"
                  label="Password baru"
                  hint={`Minimal ${MIN_PASSWORD_LENGTH} karakter, memuat huruf dan angka.`}
                >
                  <input
                    id="settings-new-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={fieldInputClasses(false)}
                  />
                </FormRow>

                <FormRow
                  htmlFor="settings-confirm-password"
                  label="Ulangi password baru"
                >
                  <input
                    id="settings-confirm-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={fieldInputClasses(false)}
                  />
                </FormRow>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmittingAccount ||
                  currentPassword.length === 0 ||
                  newPassword.length === 0
                }
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-pill bg-brand-600 px-5 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-700 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              >
                {isSubmittingAccount ? (
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound aria-hidden="true" className="h-4 w-4" />
                )}
                Change password
              </button>
            </form>
          ) : (
            <p className="text-sm leading-relaxed text-slate-500">
              Ganti password hanya tersedia untuk akun admin dashboard. Selama
              masuk lewat token env, kelola kredensial di server.
            </p>
          )}
        </AdminPanel>
      </div>

      {/* ----------------------------- PORTFOLIO ----------------------------- */}
      <form onSubmit={(event) => void handleSiteSubmit(event)}>
        <AdminPanel
          title="Portfolio"
          description="Identitas website yang dipakai pada tab browser dan metadata halaman publik."
        >
          <div className="space-y-4">
            {SITE_FIELDS.map((field) => (
              <FormRow
                key={field.key}
                htmlFor={`settings-${field.key}`}
                label={field.label}
                hint={field.hint}
              >
                <input
                  id={`settings-${field.key}`}
                  type="text"
                  value={siteValues[field.key] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => {
                    const value = event.target.value
                    setSiteDraft((current) => ({
                      ...(current ?? siteValues),
                      [field.key]: value,
                    }))
                  }}
                  className={fieldInputClasses(false)}
                />
              </FormRow>
            ))}

            <FormRow
              htmlFor="settings-site-description"
              label="Website description"
              hint="Deskripsi meta yang dipakai mesin pencari dan pratinjau tautan."
            >
              <textarea
                id="settings-site-description"
                rows={3}
                value={siteValues['site.description'] ?? ''}
                placeholder={SITE_SETTING_DEFAULTS['site.description']}
                onChange={(event) => {
                  const value = event.target.value
                  setSiteDraft((current) => ({
                    ...(current ?? siteValues),
                    'site.description': value,
                  }))
                }}
                className={cn(fieldInputClasses(false), 'resize-y leading-relaxed')}
              />
            </FormRow>

            <FormRow
              htmlFor="settings-site-favicon"
              label="Browser favicon"
              hint="Tampil pada tab browser dan bookmark. Format persegi paling pas."
            >
              <ImageFieldControl
                value={siteValues['site.favicon_url'] ?? ''}
                label="Favicon"
                optimize={false}
                hint="PNG, JPG, atau WebP • maks 8 MB • disimpan tanpa dikonversi."
                onChange={(value) =>
                  setSiteDraft((current) => ({
                    ...(current ?? siteValues),
                    'site.favicon_url': value,
                  }))
                }
              />
              {/* Input file dikelola ImageFieldControl. */}
            </FormRow>
          </div>

          {siteError ? (
            <AdminAlert tone="error" className="mt-5">
              {siteError}
            </AdminAlert>
          ) : null}

          <div className="mt-6 border-t border-line pt-5">
            <AdminFormFooter
              isSaving={isSavingSite}
              isDirty={siteDirtyKeys.length > 0}
              onCancel={() => {
                setSiteDraft(null)
                setSiteError(null)
              }}
              cancelLabel="Cancel"
              submitLabel="Save Changes"
              status={
                siteDirtyKeys.length > 0
                  ? `${siteDirtyKeys.length} pengaturan berubah`
                  : 'Tidak ada perubahan.'
              }
            />
          </div>
        </AdminPanel>
      </form>

      {/* ------------------------------- SOCIAL ------------------------------ */}
      <form onSubmit={(event) => void handleSocialSubmit(event)}>
        <AdminPanel
          title="Social links"
          description="Tautan ini dipakai oleh Hero, section Contact, dan footer di halaman publik."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {socialFields.map((field) => {
              const Icon = getContactIcon(field.kind)
              const row = data.contacts.find(
                (contact) => contact.kind === (field.kind as string),
              )
              const isEmpty = !row || (!row.value && !row.url)

              return (
                <FormRow
                  key={field.kind}
                  htmlFor={`settings-social-${field.kind}`}
                  label={field.label}
                  hint={
                    isEmpty
                      ? 'Belum diisi — tidak tampil di halaman publik.'
                      : undefined
                  }
                >
                  <div className="relative">
                    <Icon
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id={`settings-social-${field.kind}`}
                      type="text"
                      value={contactForm.values[field.kind]}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        contactForm.setValue(field.kind, event.target.value)
                      }
                      className="w-full rounded-xl border border-line bg-white py-2.5 pr-3.5 pl-10 text-sm text-navy shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] transition duration-200 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </FormRow>
              )
            })}
          </div>

          {contactForm.error ? (
            <AdminAlert tone="error" className="mt-5">
              {contactForm.error}
            </AdminAlert>
          ) : null}

          <div className="mt-6 border-t border-line pt-5">
            <AdminFormFooter
              isSaving={contactForm.isSaving}
              isDirty={contactForm.isDirty}
              onCancel={contactForm.reset}
              cancelLabel="Cancel"
              submitLabel="Save Changes"
              status={
                contactForm.isDirty
                  ? 'Ada tautan yang belum disimpan.'
                  : 'Tidak ada perubahan.'
              }
            />
          </div>
        </AdminPanel>
      </form>

      {/* ------------------------------ SECURITY ----------------------------- */}
      <AdminPanel
        title="Security"
        description="Proteksi dashboard selalu aktif dan tidak bisa dimatikan dari UI — panel ini menampilkan statusnya."
      >
        <ul className="divide-y divide-line rounded-card border border-line">
          {[
            {
              label: 'Protected admin routes',
              value: 'Aktif',
              detail:
                'Semua request POST/PUT/DELETE ke API memerlukan sesi login yang valid.',
              ok: true,
            },
            {
              label: 'Authentication required',
              value: 'Aktif',
              detail: 'Dashboard memakai akun admin dengan password ter-hash scrypt.',
              ok: true,
            },
            {
              label: 'Redirect ke login',
              value: 'Aktif',
              detail:
                'Pengunjung tanpa sesi diarahkan ke /admin/login sebelum dashboard dirender.',
              ok: true,
            },
            {
              label: 'Sesi login',
              value: hasAccount ? `${session.activeSessions} aktif` : 'Token env',
              detail: session.expiresAt
                ? `Berlaku sampai ${formatDateTime(session.expiresAt)} (diperpanjang otomatis).`
                : 'Kelola token lewat PORTFOLIO_ADMIN_TOKEN di server.',
              ok: hasAccount,
            },
          ].map((row) => (
            <li
              key={row.label}
              className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                  {row.detail}
                </span>
              </span>

              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 self-start rounded-pill border px-3 py-1 text-xs font-semibold',
                  row.ok
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-amber-100 bg-amber-50 text-amber-700',
                )}
              >
                {row.ok ? (
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                {row.value}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-semibold text-slate-500 shadow-soft transition duration-200 ease-out hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Logout
          </button>

          {hasAccount ? (
            <button
              type="button"
              onClick={() => void handleLogoutAll()}
              className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-semibold text-slate-500 shadow-soft transition duration-200 ease-out hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <KeyRound aria-hidden="true" className="h-4 w-4" />
              Akhiri semua sesi
            </button>
          ) : null}
        </div>

        {accountError ? (
          <AdminAlert tone="error" className="mt-4">
            {accountError}
          </AdminAlert>
        ) : null}
      </AdminPanel>

      {/* ---------------------------- TEKS SECTION --------------------------- */}
      <form onSubmit={(event) => void handleSectionSubmit(event)}>
        <AdminPanel
          title="Teks Section"
          description="Judul, eyebrow, subtitle, dan label tombol tiap section. Field kosong memakai teks bawaan aplikasi."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {sectionTextGroups.map((group) => (
              <fieldset
                key={group.label}
                className="rounded-card border border-line bg-surface/40 p-4 sm:p-5"
              >
                <legend className="px-1 text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
                  {group.label}
                </legend>

                <div className="space-y-4">
                  {group.keys.map((key) => (
                    <FormRow
                      key={key}
                      htmlFor={`section-${key}`}
                      label={labelFor(key)}
                      hint={key}
                    >
                      <AdminTextInput
                        id={`section-${key}`}
                        value={values[key] ?? ''}
                        multiline={MULTILINE_KEYS.has(key)}
                        rows={2}
                        placeholder={sectionFallbacks[key]}
                        onChange={(value) => setSectionValue(key, value)}
                      />
                    </FormRow>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          {saveError ? (
            <AdminAlert tone="error" className="mt-5">
              {saveError}
            </AdminAlert>
          ) : null}

          <div className="mt-6 border-t border-line pt-5">
            <AdminFormFooter
              isSaving={isSaving}
              isDirty={dirtyKeys.length > 0}
              onCancel={() => {
                setDraft(null)
                setSaveError(null)
              }}
              cancelLabel="Reset"
              submitLabel="Simpan teks"
              status={
                savedAt
                  ? `Tersimpan ${formatDateTime(new Date(savedAt).toISOString())}`
                  : dirtyKeys.length > 0
                    ? `${dirtyKeys.length} field berubah`
                    : 'Tidak ada perubahan.'
              }
            />
          </div>
        </AdminPanel>
      </form>

      {/* --------------------------- INFORMASI SISTEM ------------------------ */}
      <AdminPanel
        title="Informasi Sistem"
        description="Ringkasan sumber data dan status penyimpanan."
      >
        <ul className="divide-y divide-line rounded-card border border-line">
          {[
            { label: 'API base URL', value: apiBase },
            { label: 'Database', value: 'SQLite (node:sqlite) via server/' },
            { label: 'Total item konten', value: String(itemTotal) },
            { label: 'Filter Projects', value: String(data.project_filters.length) },
            {
              label: 'Profil terakhir diperbarui',
              value: formatDateTime(data.profile?.updated_at ?? null) || '—',
            },
            {
              label: 'Proteksi endpoint tulis',
              value: 'Sesi login (Bearer)',
            },
          ].map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <span className="text-sm text-slate-500">{row.label}</span>
              <span className="truncate text-sm font-semibold text-navy">
                {row.value}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-semibold text-navy shadow-soft transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Ambil ulang data
          </button>

          <span className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-surface/70 px-5 text-sm font-medium text-slate-400">
            <Database aria-hidden="true" className="h-4 w-4" />
            Data tersimpan di server
          </span>

          <span className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-surface/70 px-5 text-sm font-medium text-slate-400">
            <Save aria-hidden="true" className="h-4 w-4" />
            Perubahan tersimpan otomatis ke database
          </span>
        </div>
      </AdminPanel>
    </div>
  )
}
