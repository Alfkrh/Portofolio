/**
 * Halaman Education: kelola riwayat pendidikan.
 *
 * Form dibuat khusus (bukan CRUD generik) karena ada perilaku antar-field:
 * centang "Currently Studying" mengunci dan mengosongkan End Year, dan halaman
 * publik menampilkan "Sekarang" bila `end_year` bernilai null.
 */

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  GripVertical,
  Pencil,
} from 'lucide-react'
import IconTile from '../../components/ui/IconTile'
import Tag from '../../components/ui/Tag'
import { cn } from '../../lib/cn'
import { formatYearRange } from '../../lib/formatDate'
import { navigate, useLocation } from '../../lib/useLocation'
import type { Education, PortfolioData } from '../../types/portfolio'
import {
  removeCollectionItem,
  saveCollectionItem,
  saveCollectionOrder,
} from '../itemView'
import {
  AdminAddButton,
  AdminAlert,
  AdminEmptyState,
  AdminIconButton,
  AdminPanel,
} from '../ui/AdminPanels'
import {
  AdminFormFooter,
  AdminModal,
  ConfirmDeleteButton,
  FormRow,
} from '../ui/AdminForm'
import { fieldInputClasses } from '../ui/fieldStyles'

const SUCCESS_NOTE_DURATION_MS = 6000

/** Tahun harus 4 digit; kosong diperbolehkan. */
function isValidYear(value: string): boolean {
  return /^\d{4}$/.test(value.trim())
}

interface EducationFormState {
  institution: string
  degree: string
  major: string
  start_year: string
  end_year: string
  studying: boolean
  description: string
}

const EMPTY_FORM: EducationFormState = {
  institution: '',
  degree: '',
  major: '',
  start_year: '',
  end_year: '',
  studying: false,
  description: '',
}

function formFromItem(item: Education): EducationFormState {
  return {
    institution: item.institution,
    degree: item.degree ?? '',
    major: item.major ?? '',
    start_year: item.start_year ?? '',
    end_year: item.end_year ?? '',
    studying: !item.end_year,
    description: item.description ?? '',
  }
}

type EditorState = { mode: 'create' } | { mode: 'edit'; id: number } | null

interface AdminEducationProps {
  data: PortfolioData
  reload: () => Promise<void>
}

export default function AdminEducation({ data, reload }: AdminEducationProps) {
  const items = data.education
  const location = useLocation()

  const openedFromUrl = new URLSearchParams(location.search).get('new') === '1'

  const [editor, setEditor] = useState<EditorState | null>(() =>
    openedFromUrl ? { mode: 'create' } : null,
  )
  const [form, setForm] = useState<EducationFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  // Notifikasi hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => setNote(null), SUCCESS_NOTE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [note])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'create' })
  }

  const openEdit = (item: Education) => {
    setForm(formFromItem(item))
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'edit', id: item.id })
  }

  const closeEditor = () => {
    setEditor(null)
    setFormError(null)
    // Bersihkan `?new=1` supaya refresh tidak membuka form lagi.
    if (location.search) navigate(location.pathname, { replace: true })
  }

  const setField = <K extends keyof EducationFormState>(
    name: K,
    value: EducationFormState[K],
  ) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      const key = String(name)
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const fieldErrors: Record<string, string> = {}
    if (form.institution.trim().length === 0) {
      fieldErrors.institution = 'Institution wajib diisi.'
    }
    if (form.start_year.trim() && !isValidYear(form.start_year)) {
      fieldErrors.start_year = 'Isi tahun 4 digit, mis. 2023.'
    }
    if (
      !form.studying &&
      form.end_year.trim().length > 0 &&
      !isValidYear(form.end_year)
    ) {
      fieldErrors.end_year = 'Isi tahun 4 digit, mis. 2026.'
    }
    // Hanya wajib bila tahun mulai diisi — tanpa tahun sama sekali pun sah.
    if (!form.studying && form.start_year.trim() && !form.end_year.trim()) {
      fieldErrors.end_year =
        'Isi tahun selesai, atau centang “Currently Studying”.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setFormError('Lengkapi field yang ditandai di bawah.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const payload: Record<string, unknown> = {
      institution: form.institution.trim(),
      degree: form.degree.trim() || null,
      major: form.major.trim() || null,
      start_year: form.start_year.trim() || null,
      // `null` = masih berjalan, dan halaman publik menampilkan "Sekarang".
      end_year: form.studying ? null : form.end_year.trim() || null,
      description: form.description.trim() || null,
    }

    try {
      if (editor?.mode === 'edit') {
        await saveCollectionItem('education', editor.id, payload)
      } else {
        const highest = items.reduce(
          (max, item) => Math.max(max, item.sort_order),
          0,
        )
        await saveCollectionItem('education', null, {
          ...payload,
          sort_order: highest + 1,
        })
      }

      await reload()
      setEditor(null)
      setNote(
        'Data pendidikan berhasil disimpan dan sudah tampil di website portfolio.',
      )
      if (location.search) navigate(location.pathname, { replace: true })
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Data pendidikan gagal disimpan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: Education) => {
    setBusyId(item.id)
    setRowError(null)

    try {
      await removeCollectionItem('education', item.id)
      await reload()
      setNote(`Riwayat pendidikan “${item.institution}” dihapus.`)
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Data pendidikan gagal dihapus.',
      )
    } finally {
      setBusyId(null)
    }
  }

  /** Pindahkan item ke posisi item tujuan, lalu rapikan `sort_order`. */
  const moveItem = async (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return

    const ordered = [...items]
    const from = ordered.findIndex((item) => item.id === draggedId)
    const to = ordered.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) return

    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)

    const changed = ordered.filter((item, index) => item.sort_order !== index + 1)
    if (changed.length === 0) return

    setBusyId(draggedId)
    setRowError(null)

    try {
      await Promise.all(
        changed.map((item) =>
          saveCollectionOrder(
            'education',
            item.id,
            ordered.findIndex((entry) => entry.id === item.id) + 1,
          ),
        ),
      )
      await reload()
      setNote('Urutan riwayat pendidikan berhasil diperbarui.')
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Urutan gagal diperbarui.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleMoveBy = (item: Education, direction: -1 | 1) => {
    const index = items.findIndex((entry) => entry.id === item.id)
    const neighbour = items[index + direction]
    if (!neighbour) return

    void moveItem(item.id, neighbour.id)
  }

  const editingItem =
    editor?.mode === 'edit'
      ? (items.find((item) => item.id === editor.id) ?? null)
      : null

  const rangePreview =
    formatYearRange(form.start_year, form.end_year, 'Sekarang') ||
    'Tahun belum diisi'

  const studyingCount = items.filter((item) => !item.end_year).length

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      <AdminPanel
        title="Education"
        description="Riwayat pendidikan yang tampil berurutan pada section Education di halaman publik. Geser baris atau pakai tombol panah untuk menyusun ulang."
        actions={
          <span className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {items.length} item
              {studyingCount > 0 ? ` • ${studyingCount} sedang berjalan` : ''}
            </span>
            <AdminAddButton label="Add Education" onClick={openCreate} />
          </span>
        }
        bodyClassName="p-0 sm:p-0"
      >
        {rowError ? (
          <div className="px-5 pt-5 sm:px-6">
            <AdminAlert tone="error">{rowError}</AdminAlert>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <AdminEmptyState
              icon={GraduationCap}
              title="Belum ada riwayat pendidikan"
              description="Tambahkan pendidikan pertama agar section Education tampil di halaman publik."
              action={<AdminAddButton label="Add Education" onClick={openCreate} />}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item, index) => {
              const isBusy = busyId === item.id
              const isOngoing = !item.end_year
              const yearRange = formatYearRange(item.start_year, item.end_year)

              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggingId(item.id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dragOverId !== item.id) setDragOverId(item.id)
                  }}
                  onDragLeave={() => {
                    if (dragOverId === item.id) setDragOverId(null)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const dragged =
                      draggingId ??
                      Number(event.dataTransfer.getData('text/plain'))
                    if (dragged) void moveItem(dragged, item.id)
                    setDraggingId(null)
                    setDragOverId(null)
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setDragOverId(null)
                  }}
                  className={cn(
                    'flex flex-col gap-3 p-4 transition duration-200 sm:p-5 lg:flex-row lg:items-center lg:gap-4',
                    isBusy && 'opacity-60',
                    draggingId === item.id && 'opacity-40',
                    dragOverId === item.id &&
                      'bg-brand-50/60 ring-1 ring-brand-200 ring-inset',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-1 hidden cursor-grab text-slate-300 transition hover:text-brand-600 lg:block"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>

                    <IconTile icon={GraduationCap} size="md" tone="soft" />

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">
                        {item.institution}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {[item.degree, item.major].filter(Boolean).length > 0 ? (
                          <Tag tone="brand">
                            {[item.degree, item.major]
                              .filter((value) => Boolean(value && value.trim()))
                              .join(' ')}
                          </Tag>
                        ) : null}

                        <Tag
                          tone="neutral"
                          className="inline-flex items-center gap-1.5"
                        >
                          <Calendar aria-hidden="true" className="h-3 w-3" />
                          {yearRange || 'Tahun belum diisi'}
                        </Tag>

                        {isOngoing ? (
                          <Tag
                            tone="neutral"
                            className="border-emerald-100 bg-emerald-50 text-emerald-700"
                          >
                            Sedang berjalan
                          </Tag>
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end lg:self-auto">
                    <AdminIconButton
                      icon={ChevronUp}
                      label="Naikkan urutan"
                      disabled={index === 0 || isBusy}
                      onClick={() => handleMoveBy(item, -1)}
                    />
                    <AdminIconButton
                      icon={ChevronDown}
                      label="Turunkan urutan"
                      disabled={index === items.length - 1 || isBusy}
                      onClick={() => handleMoveBy(item, 1)}
                    />
                    <AdminIconButton
                      icon={Pencil}
                      label={`Edit ${item.institution}`}
                      tone="brand"
                      disabled={isBusy}
                      onClick={() => openEdit(item)}
                    />
                    <ConfirmDeleteButton
                      disabled={isBusy}
                      label={`Hapus ${item.institution}`}
                      onConfirm={() => void handleDelete(item)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </AdminPanel>

      <AdminModal
        open={editor !== null}
        onClose={closeEditor}
        onSubmit={(event) => void handleSubmit(event)}
        title={editor?.mode === 'edit' ? 'Edit Education' : 'Add Education'}
        description={
          editor?.mode === 'edit' && editingItem
            ? editingItem.institution
            : 'Isi data pendidikan, lalu simpan untuk menampilkannya di halaman publik.'
        }
        footer={
          <AdminFormFooter
            isSaving={isSaving}
            onCancel={closeEditor}
            cancelLabel="Cancel"
            submitLabel={
              editor?.mode === 'edit' ? 'Save Changes' : 'Add Education'
            }
          />
        }
      >
        {formError ? (
          <AdminAlert tone="error" className="mb-5">
            {formError}
          </AdminAlert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-education-institution"
              label="Institution"
              required
              error={errors.institution}
              hint="Nama kampus atau sekolah."
            >
              <input
                id="admin-education-institution"
                type="text"
                value={form.institution}
                placeholder="mis. Universitas Nusa Mandiri"
                onChange={(event) => setField('institution', event.target.value)}
                className={fieldInputClasses(Boolean(errors.institution))}
              />
            </FormRow>
          </div>

          <FormRow
            htmlFor="admin-education-degree"
            label="Degree"
            hint="Jenjang, mis. S1 atau SMA/SMK."
          >
            <input
              id="admin-education-degree"
              type="text"
              value={form.degree}
              placeholder="mis. S1"
              onChange={(event) => setField('degree', event.target.value)}
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-education-major"
            label="Major"
            hint="Jurusan atau program studi."
          >
            <input
              id="admin-education-major"
              type="text"
              value={form.major}
              placeholder="mis. Sistem Informasi"
              onChange={(event) => setField('major', event.target.value)}
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-education-start"
            label="Start Year"
            error={errors.start_year}
            hint="Tahun 4 digit, mis. 2023."
          >
            <input
              id="admin-education-start"
              type="text"
              inputMode="numeric"
              value={form.start_year}
              placeholder="2023"
              onChange={(event) => setField('start_year', event.target.value)}
              className={fieldInputClasses(Boolean(errors.start_year))}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-education-end"
            label="End Year"
            error={errors.end_year}
            hint={
              form.studying
                ? 'Dikunci karena pendidikan ini masih berjalan.'
                : 'Kosongkan hanya bila masih berjalan, mis. 2026.'
            }
          >
            <input
              id="admin-education-end"
              type="text"
              inputMode="numeric"
              value={form.studying ? '' : form.end_year}
              disabled={form.studying}
              placeholder="2026"
              onChange={(event) => setField('end_year', event.target.value)}
              className={fieldInputClasses(Boolean(errors.end_year))}
            />
          </FormRow>

          <div className="flex flex-col justify-center rounded-xl border border-line bg-surface/60 px-4 py-3.5 sm:col-span-2">
            <label
              htmlFor="admin-education-studying"
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id="admin-education-studying"
                type="checkbox"
                checked={form.studying}
                onChange={(event) => {
                  const studying = event.target.checked
                  setForm((current) => ({
                    ...current,
                    studying,
                    end_year: studying ? '' : current.end_year,
                  }))
                  setErrors((current) => {
                    if (!('end_year' in current)) return current
                    const next = { ...current }
                    delete next.end_year
                    return next
                  })
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-navy">
                  Currently Studying
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  End Year dikosongkan dan halaman publik menampilkan “Sekarang”.
                </span>
              </span>
            </label>

            <p className="mt-3 border-t border-line pt-2.5 text-xs text-slate-400">
              Pratinjau tahun:{' '}
              <span className="font-semibold text-navy">{rangePreview}</span>
            </p>
          </div>

          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-education-description"
              label="Description"
              hint="Prestasi, konsentrasi, atau kegiatan yang relevan."
            >
              <textarea
                id="admin-education-description"
                rows={4}
                value={form.description}
                placeholder="Ringkasan singkat tentang pendidikan ini…"
                onChange={(event) => setField('description', event.target.value)}
                className={cn(
                  fieldInputClasses(false),
                  'resize-y leading-relaxed',
                )}
              />
            </FormRow>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
