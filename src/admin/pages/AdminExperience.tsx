/**
 * Halaman Experience: kelola seluruh pengalaman (kerja, organisasi, akademik)
 * lengkap dengan urutan tampil.
 *
 * Form dibuat khusus (bukan generic CRUD) karena ada perilaku antar-field:
 * centang "Currently Working Here" mengunci dan mengosongkan tanggal selesai,
 * dan halaman publik menampilkan "Sekarang" bila `end_date` bernilai null.
 */

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  GripVertical,
  Pencil,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import FilterTabs, { type FilterOption } from '../../components/ui/FilterTabs'
import IconTile from '../../components/ui/IconTile'
import Tag from '../../components/ui/Tag'
import { cn } from '../../lib/cn'
import { formatPeriod } from '../../lib/formatDate'
import { navigate, useLocation } from '../../lib/useLocation'
import type { Experience, PortfolioData } from '../../types/portfolio'
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

/** Kategori standar yang dipakai halaman publik untuk mengelompokkan. */
const CATEGORY_TYPES = [
  'Work Experience',
  'Organization Experience',
  'Academic Experience',
] as const

/** Ikon ringkas untuk tiap kategori standar. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Work Experience': Briefcase,
  'Organization Experience': Users,
  'Academic Experience': GraduationCap,
}

const SUCCESS_NOTE_DURATION_MS = 6000

interface ExperienceFormState {
  position: string
  company: string
  type: string
  start_date: string
  end_date: string
  ongoing: boolean
  description: string
  skills: string
}

const EMPTY_FORM: ExperienceFormState = {
  position: '',
  company: '',
  type: CATEGORY_TYPES[0],
  start_date: '',
  end_date: '',
  ongoing: false,
  description: '',
  skills: '',
}

function formFromItem(item: Experience): ExperienceFormState {
  return {
    position: item.position,
    company: item.company,
    type: item.type,
    start_date: item.start_date ?? '',
    end_date: item.end_date ?? '',
    ongoing: !item.end_date,
    description: item.description ?? '',
    skills: item.skills.join(', '),
  }
}

type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; id: number }
  | null

interface AdminExperienceProps {
  data: PortfolioData
  reload: () => Promise<void>
}

export default function AdminExperience({
  data,
  reload,
}: AdminExperienceProps) {
  const items = data.experience
  const location = useLocation()

  const openedFromUrl = new URLSearchParams(location.search).get('new') === '1'

  const [editor, setEditor] = useState<EditorState | null>(() =>
    openedFromUrl ? { mode: 'create' } : null,
  )
  const [form, setForm] = useState<ExperienceFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  // Notifikasi hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => setNote(null), SUCCESS_NOTE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [note])

  /** Kategori tambahan (data lama) supaya tidak ada pengalaman yang tersembunyi. */
  const extraTypes = useMemo(() => {
    const known: string[] = [...CATEGORY_TYPES]
    const seen: string[] = []
    for (const item of items) {
      const type = item.type.trim()
      if (type && !known.includes(type) && !seen.includes(type)) seen.push(type)
    }
    return seen
  }, [items])

  const filterOptions = useMemo<FilterOption<string>[]>(
    () => [
      { id: 'all', label: 'Semua', count: items.length },
      ...[...CATEGORY_TYPES, ...extraTypes].map((type) => ({
        id: type,
        label: type,
        count: items.filter((item) => item.type === type).length,
      })),
    ],
    [extraTypes, items],
  )

  const visibleItems =
    filter === 'all' ? items : items.filter((item) => item.type === filter)

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'create' })
  }

  const openEdit = (item: Experience) => {
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

  const setField = <K extends keyof ExperienceFormState>(
    name: K,
    value: ExperienceFormState[K],
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
    if (form.position.trim().length === 0) {
      fieldErrors.position = 'Position wajib diisi.'
    }
    if (form.company.trim().length === 0) {
      fieldErrors.company = 'Company/Organization wajib diisi.'
    }
    if (form.type.trim().length === 0) fieldErrors.type = 'Type wajib dipilih.'
    // Hanya wajib bila tanggal mulai diisi — tanpa tanggal sama sekali pun sah.
    if (!form.ongoing && form.start_date.trim() && !form.end_date.trim()) {
      fieldErrors.end_date =
        'Isi tanggal selesai, atau centang “Currently Working Here”.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setFormError('Lengkapi field yang ditandai di bawah.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const payload: Record<string, unknown> = {
      position: form.position.trim(),
      company: form.company.trim(),
      type: form.type.trim(),
      start_date: form.start_date.trim() || null,
      // `null` = masih berlangsung, dan halaman publik menampilkan "Sekarang".
      end_date: form.ongoing ? null : form.end_date.trim() || null,
      description: form.description.trim() || null,
      skills: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    }

    try {
      if (editor?.mode === 'edit') {
        await saveCollectionItem('experience', editor.id, payload)
      } else {
        const highest = items.reduce(
          (max, item) => Math.max(max, item.sort_order),
          0,
        )
        await saveCollectionItem('experience', null, {
          ...payload,
          sort_order: highest + 1,
        })
      }

      await reload()
      setEditor(null)
      setNote(
        'Pengalaman berhasil disimpan dan sudah tampil di website portfolio.',
      )
      if (location.search) navigate(location.pathname, { replace: true })
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Pengalaman gagal disimpan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: Experience) => {
    setBusyId(item.id)
    setRowError(null)

    try {
      await removeCollectionItem('experience', item.id)
      await reload()
      setNote(`Pengalaman “${item.position}” dihapus dari website portfolio.`)
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Pengalaman gagal dihapus.',
      )
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Susun ulang daftar: item dipindah tepat di posisi item tujuan, lalu
   * `sort_order` ditulis ulang berurutan hanya untuk baris yang berubah.
   */
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
            'experience',
            item.id,
            ordered.findIndex((entry) => entry.id === item.id) + 1,
          ),
        ),
      )
      await reload()
      setNote('Urutan pengalaman berhasil diperbarui.')
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Urutan gagal diperbarui.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleMoveBy = (item: Experience, direction: -1 | 1) => {
    const index = visibleItems.findIndex((entry) => entry.id === item.id)
    const neighbour = visibleItems[index + direction]
    if (!neighbour) return

    void moveItem(item.id, neighbour.id)
  }

  const editingItem =
    editor?.mode === 'edit'
      ? (items.find((item) => item.id === editor.id) ?? null)
      : null

  /** Saat mengedit data lama, kategori lamanya tetap tersedia sebagai pilihan. */
  const typeOptions = useMemo(() => {
    const values: string[] = [...CATEGORY_TYPES]
    if (form.type.trim() && !values.includes(form.type.trim())) {
      values.push(form.type.trim())
    }
    return values
  }, [form.type])

  const periodPreview =
    formatPeriod(form.start_date, form.end_date, 'Sekarang') ||
    'Periode belum diisi'

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {CATEGORY_TYPES.map((type) => {
          const Icon = CATEGORY_ICONS[type] ?? Briefcase
          const count = items.filter((item) => item.type === type).length

          return (
            <div
              key={type}
              className="flex items-center gap-3 rounded-card border border-line bg-white p-4 shadow-soft"
            >
              <IconTile icon={Icon} size="md" tone="soft" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">
                  {type}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                  {count} pengalaman
                </p>
              </div>
            </div>
          )
        })}
      </section>

      <AdminPanel
        title="Experience"
        description="Urutan pada daftar ini menentukan urutan tampil di halaman publik. Geser baris atau pakai tombol panah untuk menyusun ulang."
        actions={
          <span className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {items.length} item
            </span>
            <AdminAddButton label="Add Experience" onClick={openCreate} />
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
              icon={Briefcase}
              title="Belum ada pengalaman yang ditambahkan"
              description="Tambahkan pengalaman kerja, organisasi, atau akademik pertama agar section Experience tampil di halaman publik."
              action={
                <AdminAddButton label="Add Experience" onClick={openCreate} />
              }
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <FilterTabs
                options={filterOptions}
                value={filter}
                onChange={setFilter}
                ariaLabel="Filter kategori pengalaman"
              />
              <span className="text-xs text-slate-400">
                {visibleItems.length} dari {items.length} item
              </span>
            </div>

            {visibleItems.length === 0 ? (
              <div className="p-5 sm:p-6">
                <AdminEmptyState
                  icon={Briefcase}
                  title={`Belum ada ${filter}`}
                  description="Pilih kategori lain atau tambahkan pengalaman baru untuk kategori ini."
                  action={
                    <AdminAddButton label="Add Experience" onClick={openCreate} />
                  }
                />
              </div>
            ) : (
              <div className="lg:min-w-[52rem]">
                {/* Header kolom hanya tampil pada layar lebar. */}
                <div
                  aria-hidden="true"
                  className="hidden gap-4 border-b border-line bg-surface/60 px-5 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase lg:grid lg:grid-cols-[1.25rem_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.05fr)_minmax(0,1.4fr)_auto] sm:px-6"
                >
                  <span />
                  <span>Posisi &amp; institusi</span>
                  <span>Kategori</span>
                  <span>Periode</span>
                  <span>Skills / Tools</span>
                  <span className="text-right">Aksi</span>
                </div>

                <ul className="divide-y divide-line">
                  {visibleItems.map((item, index) => {
                    const isBusy = busyId === item.id
                    const skills = item.skills.filter(
                      (skill) => skill.trim().length > 0,
                    )

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
                          'grid gap-3 bg-white p-4 transition duration-200 lg:grid-cols-[1.25rem_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.05fr)_minmax(0,1.4fr)_auto] lg:items-center lg:gap-4 sm:p-5',
                          isBusy && 'opacity-60',
                          draggingId === item.id && 'opacity-40',
                          dragOverId === item.id &&
                            'bg-brand-50/60 ring-1 ring-brand-200 ring-inset',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="hidden cursor-grab text-slate-300 transition hover:text-brand-600 lg:block"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>

                        <div className="flex min-w-0 items-start gap-3.5">
                          <IconTile icon={Briefcase} size="md" tone="soft" />

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy">
                              {item.position}
                            </p>
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <Building2
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-brand-600"
                              />
                              {item.company}
                            </p>
                            {item.description ? (
                              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag tone="brand">
                            {item.type || 'Tanpa kategori'}
                          </Tag>
                          {!item.end_date ? (
                            <Tag tone="neutral">Sedang berlangsung</Tag>
                          ) : null}
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Calendar
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-slate-400"
                          />
                          {formatPeriod(item.start_date, item.end_date) ||
                            'Belum diisi'}
                        </span>

                        <div className="min-w-0">
                          {skills.length > 0 ? (
                            <ul className="flex flex-wrap gap-1.5">
                              {skills.slice(0, 4).map((skill) => (
                                <li key={`${item.id}-${skill}`}>
                                  <Tag tone="neutral">{skill}</Tag>
                                </li>
                              ))}
                              {skills.length > 4 ? (
                                <li className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-medium text-slate-400">
                                  +{skills.length - 4}
                                </li>
                              ) : null}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-300">
                              Belum ada skill
                            </span>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <AdminIconButton
                            icon={ChevronUp}
                            label="Naikkan urutan"
                            disabled={index === 0 || isBusy}
                            onClick={() => handleMoveBy(item, -1)}
                          />
                          <AdminIconButton
                            icon={ChevronDown}
                            label="Turunkan urutan"
                            disabled={
                              index === visibleItems.length - 1 || isBusy
                            }
                            onClick={() => handleMoveBy(item, 1)}
                          />
                          <AdminIconButton
                            icon={Pencil}
                            label={`Edit ${item.position}`}
                            tone="brand"
                            disabled={isBusy}
                            onClick={() => openEdit(item)}
                          />
                          <ConfirmDeleteButton
                            disabled={isBusy}
                            label={`Hapus ${item.position}`}
                            onConfirm={() => void handleDelete(item)}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </AdminPanel>

      <AdminModal
        open={editor !== null}
        onClose={closeEditor}
        onSubmit={(event) => void handleSubmit(event)}
        title={editor?.mode === 'edit' ? 'Edit Experience' : 'Add Experience'}
        description={
          editor?.mode === 'edit' && editingItem
            ? editingItem.position
            : 'Isi data berikut, lalu simpan untuk menampilkannya di halaman publik.'
        }
        footer={
          <AdminFormFooter
            isSaving={isSaving}
            onCancel={closeEditor}
            cancelLabel="Cancel"
            submitLabel={
              editor?.mode === 'edit' ? 'Save Changes' : 'Add Experience'
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
          <FormRow
            htmlFor="admin-experience-position"
            label="Position"
            required
            error={errors.position}
            hint="Jabatan atau peran, mis. Web Developer Intern."
          >
            <input
              id="admin-experience-position"
              type="text"
              value={form.position}
              placeholder="mis. Video Editor"
              onChange={(event) => setField('position', event.target.value)}
              className={fieldInputClasses(Boolean(errors.position))}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-experience-company"
            label="Company / Organization"
            required
            error={errors.company}
            hint="Nama perusahaan, kampus, atau organisasi."
          >
            <input
              id="admin-experience-company"
              type="text"
              value={form.company}
              placeholder="mis. Sahabat Merantau"
              onChange={(event) => setField('company', event.target.value)}
              className={fieldInputClasses(Boolean(errors.company))}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-experience-type"
            label="Type"
            required
            error={errors.type}
            hint="Menentukan kelompok pengalaman di halaman publik."
          >
            <select
              id="admin-experience-type"
              value={form.type}
              onChange={(event) => setField('type', event.target.value)}
              className={fieldInputClasses(Boolean(errors.type))}
            >
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow
            htmlFor="admin-experience-start"
            label="Start Date"
            hint="Format bulan & tahun."
          >
            <input
              id="admin-experience-start"
              type="month"
              value={form.start_date}
              onChange={(event) => setField('start_date', event.target.value)}
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-experience-end"
            label="End Date"
            error={errors.end_date}
            hint={
              form.ongoing
                ? 'Dikunci karena pengalaman ini masih berlangsung.'
                : 'Kosongkan hanya bila masih berlangsung.'
            }
          >
            <input
              id="admin-experience-end"
              type="month"
              value={form.ongoing ? '' : form.end_date}
              disabled={form.ongoing}
              onChange={(event) => setField('end_date', event.target.value)}
              className={fieldInputClasses(Boolean(errors.end_date))}
            />
          </FormRow>

          <div className="flex flex-col justify-center rounded-xl border border-line bg-surface/60 px-4 py-3.5">
            <label
              htmlFor="admin-experience-ongoing"
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id="admin-experience-ongoing"
                type="checkbox"
                checked={form.ongoing}
                onChange={(event) => {
                  const ongoing = event.target.checked
                  setForm((current) => ({
                    ...current,
                    ongoing,
                    end_date: ongoing ? '' : current.end_date,
                  }))
                  setErrors((current) => {
                    if (!('end_date' in current)) return current
                    const next = { ...current }
                    delete next.end_date
                    return next
                  })
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-navy">
                  Currently Working Here
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  Tanggal selesai dikosongkan dan halaman publik menampilkan
                  “Sekarang”.
                </span>
              </span>
            </label>

            <p className="mt-3 border-t border-line pt-2.5 text-xs text-slate-400">
              Pratinjau periode:{' '}
              <span className="font-semibold text-navy">{periodPreview}</span>
            </p>
          </div>

          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-experience-description"
              label="Description"
              hint="Pekerjaan, tanggung jawab, atau pencapaian utama."
            >
              <textarea
                id="admin-experience-description"
                rows={4}
                value={form.description}
                placeholder="Ringkasan singkat peran dan hasilnya…"
                onChange={(event) => setField('description', event.target.value)}
                className={cn(fieldInputClasses(false), 'resize-y leading-relaxed')}
              />
            </FormRow>
          </div>

          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-experience-skills"
              label="Skills / Tools"
              hint="Pisahkan dengan koma, mis. React, Figma, SQL."
            >
              <input
                id="admin-experience-skills"
                type="text"
                value={form.skills}
                placeholder="Figma, Video Editing"
                onChange={(event) => setField('skills', event.target.value)}
                className={fieldInputClasses(false)}
              />
            </FormRow>

            {form.skills.trim().length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {form.skills
                  .split(',')
                  .map((skill) => skill.trim())
                  .filter(Boolean)
                  .map((skill, skillIndex) => (
                    <li key={`${skillIndex}-${skill}`}>
                      <Tag tone="neutral">{skill}</Tag>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
