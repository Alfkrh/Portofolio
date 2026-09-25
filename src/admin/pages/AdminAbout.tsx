/**
 * Halaman About: bio dan detail profil yang tampil di section About publik.
 *
 * Semua field disimpan di tabel `profile`, jadi satu tombol "Save Changes"
 * langsung memperbarui halaman portfolio tanpa build ulang. Judul/eyebrow
 * section diatur di halaman Settings bersama teks section lain.
 */

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BadgeCheck, BookOpen, GraduationCap, Settings2, Target } from 'lucide-react'
import { formatDateTime } from '../../lib/formatDate'
import { navigate } from '../../lib/useLocation'
import { sectionFallbacks } from '../../config/siteCopy'
import type { Profile, SectionTexts } from '../../types/portfolio'
import type { AdminField } from '../adminConfig'
import { useProfileForm } from '../hooks/useProfileForm'
import { AdminAlert, AdminPanel } from '../ui/AdminPanels'
import { AdminFieldGrid, AdminFormFooter } from '../ui/AdminForm'

const ABOUT_FIELDS: AdminField[] = [
  {
    name: 'bio',
    label: 'About Me',
    type: 'textarea',
    full: true,
    rows: 8,
    hint: 'Pisahkan antar paragraf dengan satu baris kosong. Paragraf pertama tampil lebih besar di halaman publik.',
    placeholder: 'Ceritakan singkat tentang diri Anda…',
  },
  {
    name: 'education',
    label: 'Education',
    type: 'text',
    placeholder: 'Universitas Nusa Mandiri',
    hint: 'Nama kampus atau sekolah yang tampil pada kartu Education.',
  },
  {
    name: 'major',
    label: 'Major',
    type: 'text',
    placeholder: 'Sistem Informasi',
    hint: 'Jurusan atau program studi.',
  },
  {
    name: 'focus',
    label: 'Focus Areas',
    type: 'list',
    full: true,
    hint: 'Pisahkan dengan koma, mis. UI/UX Design, Web Development.',
    placeholder: 'UI/UX Design, Web Development',
  },
  {
    name: 'status',
    label: 'Current Status',
    type: 'text',
    full: true,
    placeholder: 'Mahasiswa aktif semester 5',
    hint: 'Status singkat saat ini, mis. mahasiswa aktif atau open to internship.',
  },
]

const ABOUT_FIELD_NAMES = ABOUT_FIELDS.map((field) => field.name)

const SUCCESS_NOTE =
  'Perubahan berhasil disimpan dan sudah tampil di website portfolio.'
const SUCCESS_NOTE_DURATION_MS = 6000

interface AdminAboutProps {
  profile: Profile | null
  sections: SectionTexts
  onSaved: () => Promise<void>
}

export default function AdminAbout({
  profile,
  sections,
  onSaved,
}: AdminAboutProps) {
  const { values, setValue, isDirty, isSaving, error, savedAt, save, reset } =
    useProfileForm(profile, {
      fields: ABOUT_FIELD_NAMES,
      arrayFields: ['focus'],
      onSaved,
    })

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

  /** Simpan hanya field yang berubah; tampilkan notifikasi bila benar tersimpan. */
  const handleSave = async () => {
    const status = await save()

    if (status === 'saved') {
      setNote(SUCCESS_NOTE)
      return
    }

    // 'error' → pesan galat sudah tampil di panel; 'noop' → tidak ada perubahan.
    setNote(null)
  }

  /** Cancel: kembalikan form ke data tersimpan dan tutup notifikasi. */
  const handleCancel = () => {
    reset()
    setNote(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleSave()
  }

  if (!profile) {
    return (
      <AdminPanel title="About">
        <AdminAlert tone="error">
          Baris profil belum ada di database sehingga section About belum bisa
          diisi.
        </AdminAlert>
      </AdminPanel>
    )
  }

  const headingKeys = ['about.eyebrow', 'about.title', 'about.cta_label'] as const

  const paragraphs = (values.bio ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const focusPreview = values.focus
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const previewFacts = [
    { id: 'education', icon: GraduationCap, label: 'Education', value: values.education.trim() },
    { id: 'major', icon: BookOpen, label: 'Major', value: values.major.trim() },
    { id: 'focus', icon: Target, label: 'Focus', value: focusPreview.join(', ') },
    { id: 'status', icon: BadgeCheck, label: 'Status', value: values.status.trim() },
  ].filter((fact) => fact.value.length > 0)

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      <form onSubmit={handleSubmit}>
        <AdminPanel
          title="Isi section About"
          description="Section About memakai bio dan detail profil berikut. Field yang dikosongkan tidak akan ditampilkan di halaman publik."
        >
          <AdminFieldGrid
            fields={ABOUT_FIELDS}
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
              isSaving={isSaving}
              isDirty={isDirty || Boolean(note)}
              onCancel={handleCancel}
              cancelLabel="Cancel"
              submitLabel="Save Changes"
              status={
                savedAt
                  ? `Tersimpan ${formatDateTime(new Date(savedAt).toISOString())}`
                  : isDirty
                    ? 'Ada perubahan yang belum disimpan.'
                    : 'Tidak ada perubahan.'
              }
            />
          </div>
        </AdminPanel>
      </form>

      <AdminPanel
        title="Pratinjau section About"
        description="Tampilan teks dan detail profil seperti yang dilihat pengunjung setelah disimpan."
      >
        <div className="rounded-card border border-line bg-surface/60 p-5">
          {paragraphs.length > 0 ? (
            <>
              <p className="font-display text-lg leading-relaxed font-semibold text-navy">
                {paragraphs[0]}
              </p>

              {paragraphs.length > 1 ? (
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-500">
                  {paragraphs.slice(1).map((paragraph, index) => (
                    <p key={`${index}-${paragraph}`}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-400">
              About Me masih kosong — halaman publik akan menampilkan catatan
              placeholder.
            </p>
          )}

          {previewFacts.length > 0 ? (
            <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              {previewFacts.map((fact) => (
                <div key={fact.id} className="flex items-start gap-3 bg-white p-4">
                  <fact.icon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                  />
                  <span className="min-w-0">
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-navy">
                      {fact.value}
                    </dd>
                  </span>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Judul section"
        description="Eyebrow, judul, dan label tombol section About diatur bersama teks section lainnya."
        actions={
          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            className="inline-flex h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-semibold text-navy shadow-soft transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <Settings2 aria-hidden="true" className="h-4 w-4" />
            Buka Settings
          </button>
        }
      >
        <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {headingKeys.map((key) => (
            <div key={key} className="bg-white p-4">
              <dt className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                {key.replace('about.', '')}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-navy">
                {sections[key]?.trim() || sectionFallbacks[key]}
              </dd>
            </div>
          ))}
        </dl>
      </AdminPanel>
    </div>
  )
}
