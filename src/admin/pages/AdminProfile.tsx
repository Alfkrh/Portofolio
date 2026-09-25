/**
 * Halaman Profile: foto profil (tersimpan di server), field identitas yang
 * tampil di Hero, dan kontak (Email, LinkedIn, GitHub, Instagram) yang
 * disimpan sebagai baris koleksi `contacts`.
 */

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  Camera,
  ImageUp,
  LoaderCircle,
  Mail,
  Sparkles,
  TriangleAlert,
  Trash2,
} from 'lucide-react'
import { formatDateTime } from '../../lib/formatDate'
import {
  formatFileSize,
  MAX_PHOTO_BYTES,
  PHOTO_INPUT_ACCEPT,
} from '../../lib/imageFile'
import { getContactIcon } from '../../lib/contactIcons'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'
import type { Contact, Profile } from '../../types/portfolio'
import type { AdminField } from '../adminConfig'
import { useProfileForm } from '../hooks/useProfileForm'
import {
  PROFILE_CONTACT_FIELDS,
  useProfileContacts,
  type ProfileContactKind,
} from '../hooks/useProfileContacts'
import { AdminAlert, AdminPanel } from '../ui/AdminPanels'
import { AdminFieldGrid, AdminFormFooter, FormRow } from '../ui/AdminForm'

const IDENTITY_FIELDS: AdminField[] = [
  {
    name: 'name',
    label: 'Nama lengkap',
    type: 'text',
    required: true,
    full: true,
    placeholder: 'Alif Fikri',
  },
  {
    name: 'logo',
    label: 'Wordmark navbar',
    type: 'text',
    placeholder: 'ALIF.',
    hint: 'Teks singkat di navbar; titik akhir ditambahkan otomatis.',
  },
  {
    name: 'greeting',
    label: 'Sapaan Hero',
    type: 'text',
    placeholder: 'Hello, I am',
  },
  {
    name: 'headline',
    label: 'Headline',
    type: 'text',
    full: true,
    placeholder: 'Information Systems Student & Digital Creative',
  },
  {
    name: 'short_description',
    label: 'Deskripsi singkat',
    type: 'textarea',
    full: true,
    rows: 3,
    placeholder: 'Satu sampai dua kalimat tentang diri Anda.',
  },
  {
    name: 'availability',
    label: 'Status ketersediaan',
    type: 'text',
    full: true,
    placeholder: 'Open to internship',
  },
]

const IDENTITY_FIELD_NAMES = IDENTITY_FIELDS.map((field) => field.name)

const SUCCESS_NOTE =
  'Perubahan berhasil disimpan dan sudah tampil di website portfolio.'
const SUCCESS_NOTE_DURATION_MS = 6000

interface AdminProfileProps {
  profile: Profile | null
  contacts: Contact[]
  onSaved: () => Promise<void>
}

export default function AdminProfile({
  profile,
  contacts,
  onSaved,
}: AdminProfileProps) {
  const {
    values,
    setValue,
    isDirty,
    isSaving,
    error,
    savedAt,
    save,
    reset,
  } = useProfileForm(profile, {
    fields: IDENTITY_FIELD_NAMES,
    onSaved,
  })

  const contactForm = useProfileContacts(contacts, onSaved)

  const [note, setNote] = useState<string | null>(null)

  // Notifikasi sukses hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(
      () => setNote(null),
      SUCCESS_NOTE_DURATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [note])

  const photo = useProfilePhoto(profile, onSaved)
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoNote, setPhotoNote] = useState<string | null>(null)

  const initials = (profile?.name ?? 'Admin')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPhotoNote(null)
    await photo.uploadPhoto(file)
  }

  const handleRemove = async () => {
    setPhotoNote(null)
    await photo.removePhoto()
    setPhotoNote('Foto profil dihapus.')
  }

  /** Simpan identitas + kontak sekaligus; tampilkan notifikasi bila ada yang tersimpan. */
  const handleSave = async () => {
    setPhotoNote(null)

    const [identitySaved, contactsSaved] = await Promise.all([
      save(),
      contactForm.save(),
    ])

    if (identitySaved === 'error' || contactsSaved === 'error') {
      setNote(null)
      return
    }

    // Keduanya noop (tidak ada perubahan) → tidak perlu notifikasi.
    if (identitySaved !== 'saved' && contactsSaved !== 'saved') return

    setNote(SUCCESS_NOTE)
  }

  /** Reset: kembalikan form ke data tersimpan dan tutup notifikasi. */
  const handleCancel = () => {
    reset()
    contactForm.reset()
    setNote(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleSave()
  }

  const isBusy = isSaving || contactForm.isSaving

  if (!profile) {
    return (
      <AdminPanel title="Profile">
        <AdminAlert tone="error">
          Baris profil belum ada di database. Jalankan server sekali lagi agar
          data awal dibuat, lalu muat ulang halaman ini.
        </AdminAlert>
      </AdminPanel>
    )
  }

  return (
    <div className="space-y-6">
      {note ? (
        <AdminAlert tone="success">{note}</AdminAlert>
      ) : null}

      <AdminPanel
        title="Foto profil"
        description="Foto disimpan di server (folder uploads), bukan di browser — semua pengunjung melihat foto yang sama."
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-[1.5rem] border border-line bg-surface">
            {photo.photoUrl ? (
              <img
                src={photo.photoUrl}
                alt={`Foto ${profile.name}`}
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-brand-50 font-display text-2xl font-extrabold text-brand-600">
                {initials}
              </span>
            )}

            {photo.isProcessing ? (
              <span
                role="status"
                className="absolute inset-0 flex items-center justify-center gap-2 bg-navy/70 text-xs font-semibold text-white"
              >
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                Proses…
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={photo.isProcessing}
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-pill bg-brand-600 px-5 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-700 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-safe:hover:-translate-y-0.5"
              >
                {photo.photoUrl ? (
                  <Camera aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <ImageUp aria-hidden="true" className="h-4 w-4" />
                )}
                {photo.photoUrl ? 'Ganti foto' : 'Unggah foto'}
              </button>

              {photo.photoUrl ? (
                <button
                  type="button"
                  disabled={photo.isProcessing}
                  onClick={() => void handleRemove()}
                  className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-semibold text-slate-500 shadow-soft transition duration-200 ease-out hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Hapus foto
                </button>
              ) : null}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              JPG, PNG, atau WebP • maks {formatFileSize(MAX_PHOTO_BYTES)} • gambar
              diperkecil otomatis dan ditampilkan 1:1.
            </p>

            {photo.error ? (
              <AdminAlert tone="error" className="mt-4">
                <span className="inline-flex items-center gap-2">
                  <TriangleAlert aria-hidden="true" className="h-4 w-4" />
                  {photo.error}
                </span>
              </AdminAlert>
            ) : photoNote ? (
              <AdminAlert tone="success" className="mt-4">
                {photoNote}
              </AdminAlert>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              accept={PHOTO_INPUT_ACCEPT}
              onChange={(event) => void handleFile(event)}
              className="sr-only"
            />
          </div>
        </div>
      </AdminPanel>

      <form onSubmit={handleSubmit}>
        <AdminPanel
          title="Identitas & Hero"
          description="Teks yang muncul di navbar dan bagian paling atas halaman publik."
        >
          <AdminFieldGrid
            fields={IDENTITY_FIELDS}
            values={values}
            onChange={(name, value) => {
              setNote(null)
              setValue(name, value)
            }}
          />

          {error ? (
            <AdminAlert tone="error" className="mt-5">
              {error}
            </AdminAlert>
          ) : null}

          <div className="mt-6 border-t border-line pt-5">
            <AdminFormFooter
              isSaving={isBusy}
              isDirty={isDirty || contactForm.isDirty || Boolean(note)}
              onCancel={handleCancel}
              cancelLabel="Cancel"
              submitLabel="Save Changes"
              status={
                savedAt
                  ? `Tersimpan ${formatDateTime(new Date(savedAt).toISOString())}`
                  : isDirty || contactForm.isDirty
                    ? 'Ada perubahan yang belum disimpan.'
                    : 'Tidak ada perubahan.'
              }
            />
          </div>
        </AdminPanel>

        <AdminPanel
          className="mt-6"
          title="Kontak & sosial media"
          description="Disimpan sebagai baris kontak di database — dipakai oleh Hero, section Contact, dan Footer."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {PROFILE_CONTACT_FIELDS.map((field) => {
              const Icon = getContactIcon(field.kind)
              const row = contacts.find(
                (contact) => contact.kind === (field.kind as string),
              )
              const isEmpty = !row || (!row.value && !row.url)

              return (
                <FormRow
                  key={field.kind}
                  htmlFor={`admin-contact-${field.kind}`}
                  label={field.label}
                  hint={
                    field.hint ??
                    (isEmpty
                      ? 'Belum diisi — tidak tampil di halaman publik.'
                      : undefined)
                  }
                >
                  <div className="relative">
                    <Icon
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id={`admin-contact-${field.kind}`}
                      type="text"
                      value={contactForm.values[field.kind as ProfileContactKind]}
                      placeholder={field.placeholder}
                      onChange={(event) => {
                        setNote(null)
                        contactForm.setValue(
                          field.kind as ProfileContactKind,
                          event.target.value,
                        )
                      }}
                      className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3.5 text-sm text-navy shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] transition duration-200 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-surface"
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

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <Mail aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Tempel tautan langsung (mis. https://github.com/username) atau cukup
            alamatnya — protokol dan format tampilan dirapikan otomatis saat
            disimpan. Kosongkan untuk menghapus kontak.
          </p>
        </AdminPanel>
      </form>

      <AdminPanel title="Pratinjau cepat" description="Rangkaian teks seperti yang dilihat pengunjung.">
        <div className="rounded-card border border-line bg-surface/60 p-5">
          <span className="inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-white px-3.5 py-1.5 text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            {values.greeting || 'Sapaan hero'}
          </span>

          <p className="mt-4 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            {values.name || 'Nama Anda'}
          </p>
          <p className="mt-2 font-display text-base font-semibold text-brand-700">
            {values.headline || 'Headline belum diisi'}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {values.short_description || 'Deskripsi singkat belum diisi.'}
          </p>

          {(() => {
            const previewContacts = PROFILE_CONTACT_FIELDS.filter(
              (field) => contactForm.values[field.kind].trim().length > 0,
            )

            if (previewContacts.length === 0) return null

            return (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {previewContacts.map((field) => {
                  const Icon = getContactIcon(field.kind)
                  return (
                    <span
                      key={field.kind}
                      className="inline-flex h-9 items-center gap-2 rounded-pill border border-line bg-white px-3.5 text-xs font-medium text-slate-600"
                    >
                      <Icon aria-hidden="true" className="h-3.5 w-3.5 text-brand-600" />
                      {field.label}
                    </span>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </AdminPanel>
    </div>
  )
}
