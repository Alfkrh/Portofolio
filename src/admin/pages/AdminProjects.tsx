/**
 * Halaman Projects: kelola portfolio project.
 *
 * Form memakai field khusus (kategori, thumbnail, status publish) sehingga
 * tidak memakai CRUD generik. Project yang belum dipublikasikan tetap ada di
 * database dan dashboard, tetapi disaring di halaman publik.
 */

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FolderKanban,
  Github,
  GripVertical,
  Pencil,
  Star,
} from 'lucide-react'
import FilterTabs, { type FilterOption } from '../../components/ui/FilterTabs'
import Tag from '../../components/ui/Tag'
import { cn } from '../../lib/cn'
import { navigate, useLocation } from '../../lib/useLocation'
import type { PortfolioData, Project, ProjectFilter } from '../../types/portfolio'
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
  ImageFieldControl,
} from '../ui/AdminForm'
import { fieldInputClasses } from '../ui/fieldStyles'
import AdminProjectFiltersPanel from './AdminProjectFiltersPanel'

/** Kategori standar yang diminta pada form project. */
const CATEGORY_OPTIONS = [
  'UI/UX',
  'Web Development',
  'Academic',
  'Other',
] as const

const SUCCESS_NOTE_DURATION_MS = 6000

/** Inisial untuk placeholder thumbnail yang dibuat otomatis. */
function getInitials(title: string) {
  return (
    title
      .split(' ')
      .filter((word) => /^[A-Za-z]/.test(word))
      .slice(0, 3)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'PR'
  )
}

/** Key filter publik yang cocok dengan sebuah kategori (bila ada). */
function filterKeyForCategory(
  category: string,
  filters: ProjectFilter[],
): string | null {
  const normalized = category.trim().toLowerCase()
  if (normalized.length === 0) return null

  return (
    filters.find((filter) => filter.label.trim().toLowerCase() === normalized)
      ?.key ?? null
  )
}

/**
 * Kategori awal saat mengedit: pakai label kategori, atau filter yang cocok
 * dengan tag project (data lama) supaya penyaringan publik tidak hilang.
 */
function initialCategory(project: Project, filters: ProjectFilter[]): string {
  const byLabel = filterKeyForCategory(project.category ?? '', filters)
  if (byLabel) return project.category?.trim() ?? CATEGORY_OPTIONS[0]

  const byTag = filters.find((filter) => project.tags.includes(filter.key))
  if (byTag) return byTag.label

  const existing = project.category?.trim()
  return existing && existing.length > 0 ? existing : CATEGORY_OPTIONS[0]
}

interface ProjectFormState {
  title: string
  description: string
  full_description: string
  category: string
  thumbnail_url: string
  tools: string
  url: string
  github_url: string
  featured: boolean
  published: boolean
}

const EMPTY_FORM: ProjectFormState = {
  title: '',
  description: '',
  full_description: '',
  category: CATEGORY_OPTIONS[0],
  thumbnail_url: '',
  tools: '',
  url: '',
  github_url: '',
  featured: false,
  published: true,
}

type EditorState = { mode: 'create' } | { mode: 'edit'; id: number } | null
type PublishFilter = 'all' | 'published' | 'draft'

interface AdminProjectsProps {
  data: PortfolioData
  reload: () => Promise<void>
}

export default function AdminProjects({ data, reload }: AdminProjectsProps) {
  const items = data.projects
  const filters = data.project_filters
  const location = useLocation()

  const openedFromUrl = new URLSearchParams(location.search).get('new') === '1'

  const [editor, setEditor] = useState<EditorState | null>(() =>
    openedFromUrl ? { mode: 'create' } : null,
  )
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  // Notifikasi hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => setNote(null), SUCCESS_NOTE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [note])

  const publishedCount = items.filter((item) => item.published).length
  const draftCount = items.length - publishedCount

  /** Opsi kategori: daftar standar + label filter tambahan dari database. */
  const categoryOptions = useMemo(() => {
    const values: string[] = [...CATEGORY_OPTIONS]
    for (const filter of filters) {
      const label = filter.label.trim()
      if (label && !values.includes(label)) values.push(label)
    }
    const current = form.category.trim()
    if (current && !values.includes(current)) values.push(current)
    return values
  }, [filters, form.category])

  const filterOptions = useMemo<FilterOption<PublishFilter>[]>(
    () => [
      { id: 'all', label: 'Semua', count: items.length },
      { id: 'published', label: 'Published', count: publishedCount },
      { id: 'draft', label: 'Unpublished', count: draftCount },
    ],
    [draftCount, items.length, publishedCount],
  )

  const visibleItems = items.filter((item) => {
    if (publishFilter === 'published') return item.published
    if (publishFilter === 'draft') return !item.published
    return true
  })

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'create' })
  }

  const openEdit = (project: Project) => {
    setForm({
      title: project.title,
      description: project.description ?? '',
      full_description: project.full_description ?? '',
      category: initialCategory(project, filters),
      thumbnail_url: project.thumbnail_url ?? '',
      tools: project.tools.join(', '),
      url: project.url ?? '',
      github_url: project.github_url ?? '',
      featured: project.featured,
      published: project.published,
    })
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'edit', id: project.id })
  }

  const closeEditor = () => {
    setEditor(null)
    setFormError(null)
    // Bersihkan `?new=1` supaya refresh tidak membuka form lagi.
    if (location.search) navigate(location.pathname, { replace: true })
  }

  const setField = <K extends keyof ProjectFormState>(
    name: K,
    value: ProjectFormState[K],
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
    if (form.title.trim().length === 0) {
      fieldErrors.title = 'Project Title wajib diisi.'
    }
    if (form.category.trim().length === 0) {
      fieldErrors.category = 'Category wajib dipilih.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setFormError('Lengkapi field pertama yang ditandai di bawah.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const category = form.category.trim()
    // Tag filter publik diturunkan dari kategori agar tab filter tetap akurat.
    const filterKey = filterKeyForCategory(category, filters)

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      full_description: form.full_description.trim() || null,
      category,
      thumbnail_url: form.thumbnail_url.trim() || null,
      tools: form.tools
        .split(',')
        .map((tool) => tool.trim())
        .filter(Boolean),
      url: form.url.trim() || null,
      github_url: form.github_url.trim() || null,
      tags: filterKey ? [filterKey] : [],
      featured: form.featured,
      published: form.published,
    }

    try {
      if (editor?.mode === 'edit') {
        await saveCollectionItem('projects', editor.id, payload)
      } else {
        const highest = items.reduce(
          (max, item) => Math.max(max, item.sort_order),
          0,
        )
        await saveCollectionItem('projects', null, {
          ...payload,
          sort_order: highest + 1,
        })
      }

      await reload()
      setEditor(null)
      setNote(
        form.published
          ? 'Project berhasil disimpan dan sudah tampil di website portfolio.'
          : 'Project berhasil disimpan sebagai unpublished (tidak tampil di website).',
      )
      if (location.search) navigate(location.pathname, { replace: true })
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Project gagal disimpan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  /** Publish / unpublish tanpa membuka form. */
  const togglePublished = async (project: Project) => {
    setBusyId(project.id)
    setRowError(null)

    try {
      await saveCollectionItem('projects', project.id, {
        published: !project.published,
      })
      await reload()
      setNote(
        !project.published
          ? `Project “${project.title}” dipublikasikan.`
          : `Project “${project.title}” dijadikan unpublished dan disembunyikan dari website.`,
      )
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Status publish gagal diubah.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (project: Project) => {
    setBusyId(project.id)
    setRowError(null)

    try {
      await removeCollectionItem('projects', project.id)
      await reload()
      setNote(`Project “${project.title}” dihapus.`)
    } catch (cause) {
      setRowError(cause instanceof Error ? cause.message : 'Project gagal dihapus.')
    } finally {
      setBusyId(null)
    }
  }

  /** Pindahkan project ke posisi project tujuan, lalu rapikan `sort_order`. */
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
            'projects',
            item.id,
            ordered.findIndex((entry) => entry.id === item.id) + 1,
          ),
        ),
      )
      await reload()
      setNote('Urutan project berhasil diperbarui.')
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Urutan gagal diperbarui.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleMoveBy = (project: Project, direction: -1 | 1) => {
    const index = visibleItems.findIndex((entry) => entry.id === project.id)
    const neighbour = visibleItems[index + direction]
    if (!neighbour) return

    void moveItem(project.id, neighbour.id)
  }

  const editingItem =
    editor?.mode === 'edit'
      ? (items.find((item) => item.id === editor.id) ?? null)
      : null

  const activeFilterKey = filterKeyForCategory(form.category, filters)

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total project', value: items.length, icon: FolderKanban },
          { label: 'Published', value: publishedCount, icon: Check },
          { label: 'Unpublished', value: draftCount, icon: EyeOff },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-card border border-line bg-white p-4 shadow-soft"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
            >
              <stat.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-2xl font-extrabold tracking-tight text-navy tabular-nums">
                {stat.value}
              </span>
              <span className="mt-0.5 block text-xs text-slate-400">
                {stat.label}
              </span>
            </span>
          </div>
        ))}
      </section>

      <AdminPanel
        title="Projects"
        description="Urutan pada daftar ini menentukan urutan kartu di halaman publik. Project unpublished tetap tersimpan di sini tetapi tidak tampil di website."
        actions={
          <span className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {items.length} item
            </span>
            <AdminAddButton label="Add Project" onClick={openCreate} />
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
              icon={FolderKanban}
              title="Belum ada project yang ditambahkan"
              description="Tambahkan project pertama agar section Projects tampil di halaman publik."
              action={<AdminAddButton label="Add Project" onClick={openCreate} />}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <FilterTabs
                options={filterOptions}
                value={publishFilter}
                onChange={setPublishFilter}
                ariaLabel="Filter status publish"
              />
              <span className="text-xs text-slate-400">
                {visibleItems.length} dari {items.length} item
              </span>
            </div>

            {visibleItems.length === 0 ? (
              <div className="p-5 sm:p-6">
                <AdminEmptyState
                  icon={FolderKanban}
                  title={
                    publishFilter === 'draft'
                      ? 'Tidak ada project unpublished'
                      : 'Tidak ada project published'
                  }
                  description="Semua project pada filter ini sudah sesuai statusnya."
                  action={
                    <AdminAddButton label="Add Project" onClick={openCreate} />
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {visibleItems.map((project, index) => {
                  const isBusy = busyId === project.id
                  const tools = project.tools.filter(
                    (tool) => tool.trim().length > 0,
                  )

                  return (
                    <li
                      key={project.id}
                      draggable
                      onDragStart={() => setDraggingId(project.id)}
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (dragOverId !== project.id) setDragOverId(project.id)
                      }}
                      onDragLeave={() => {
                        if (dragOverId === project.id) setDragOverId(null)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        const dragged =
                          draggingId ??
                          Number(event.dataTransfer.getData('text/plain'))
                        if (dragged) void moveItem(dragged, project.id)
                        setDraggingId(null)
                        setDragOverId(null)
                      }}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setDragOverId(null)
                      }}
                      className={cn(
                        'flex flex-col gap-4 p-4 transition duration-200 sm:p-5 lg:flex-row lg:items-center',
                        isBusy && 'opacity-60',
                        draggingId === project.id && 'opacity-40',
                        dragOverId === project.id &&
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

                        <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-brand-50">
                          {project.thumbnail_url ? (
                            <img
                              src={project.thumbnail_url}
                              alt=""
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-display text-xs font-extrabold text-brand-300">
                              {getInitials(project.title)}
                            </span>
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-navy">
                              {project.title}
                            </p>
                            {project.featured ? (
                              <Tag
                                tone="brand"
                                className="inline-flex items-center gap-1"
                              >
                                <Star
                                  aria-hidden="true"
                                  className="h-3 w-3 fill-brand-600 text-brand-600"
                                />
                                Featured
                              </Tag>
                            ) : null}
                            <Tag
                              tone="neutral"
                              className={cn(
                                'inline-flex items-center gap-1',
                                project.published
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                  : 'border-amber-100 bg-amber-50 text-amber-700',
                              )}
                            >
                              {project.published ? (
                                <Eye aria-hidden="true" className="h-3 w-3" />
                              ) : (
                                <EyeOff aria-hidden="true" className="h-3 w-3" />
                              )}
                              {project.published ? 'Published' : 'Unpublished'}
                            </Tag>
                          </div>

                          {project.description ? (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {project.description}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                            {project.category ? (
                              <span className="text-xs font-medium text-slate-400">
                                Kategori: {project.category}
                              </span>
                            ) : null}

                            {project.url ? (
                              <a
                                href={project.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                              >
                                <ArrowUpRight
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                Project URL
                              </a>
                            ) : null}

                            {project.github_url ? (
                              <a
                                href={project.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                              >
                                <Github aria-hidden="true" className="h-3 w-3" />
                                GitHub
                              </a>
                            ) : null}
                          </div>

                          {tools.length > 0 ? (
                            <ul className="mt-2.5 flex flex-wrap gap-1.5">
                              {tools.slice(0, 5).map((tool) => (
                                <li key={`${project.id}-${tool}`}>
                                  <Tag tone="neutral">{tool}</Tag>
                                </li>
                              ))}
                              {tools.length > 5 ? (
                                <li className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-medium text-slate-400">
                                  +{tools.length - 5}
                                </li>
                              ) : null}
                            </ul>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 self-end lg:self-auto">
                        <AdminIconButton
                          icon={ChevronUp}
                          label="Naikkan urutan"
                          disabled={index === 0 || isBusy}
                          onClick={() => handleMoveBy(project, -1)}
                        />
                        <AdminIconButton
                          icon={ChevronDown}
                          label="Turunkan urutan"
                          disabled={index === visibleItems.length - 1 || isBusy}
                          onClick={() => handleMoveBy(project, 1)}
                        />
                        <AdminIconButton
                          icon={project.published ? EyeOff : Eye}
                          label={
                            project.published
                              ? `Unpublish ${project.title}`
                              : `Publish ${project.title}`
                          }
                          disabled={isBusy}
                          onClick={() => void togglePublished(project)}
                        />
                        <AdminIconButton
                          icon={Pencil}
                          label={`Edit ${project.title}`}
                          tone="brand"
                          disabled={isBusy}
                          onClick={() => openEdit(project)}
                        />
                        <ConfirmDeleteButton
                          disabled={isBusy}
                          label={`Hapus ${project.title}`}
                          onConfirm={() => void handleDelete(project)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </AdminPanel>

      <AdminProjectFiltersPanel data={data} reload={reload} />

      <AdminModal
        open={editor !== null}
        onClose={closeEditor}
        onSubmit={(event) => void handleSubmit(event)}
        title={editor?.mode === 'edit' ? 'Edit Project' : 'Add Project'}
        description={
          editor?.mode === 'edit' && editingItem
            ? editingItem.title
            : 'Isi data project, lalu simpan untuk menampilkannya di halaman publik.'
        }
        footer={
          <AdminFormFooter
            isSaving={isSaving}
            onCancel={closeEditor}
            cancelLabel="Cancel"
            submitLabel={editor?.mode === 'edit' ? 'Save Changes' : 'Add Project'}
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
              htmlFor="admin-project-title"
              label="Project Title"
              required
              error={errors.title}
            >
              <input
                id="admin-project-title"
                type="text"
                value={form.title}
                placeholder="mis. Website Presensi PKL & Magang"
                onChange={(event) => setField('title', event.target.value)}
                className={fieldInputClasses(Boolean(errors.title))}
              />
            </FormRow>
          </div>

          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-project-description"
              label="Short Description"
              hint="Tampil pada kartu project di halaman publik (1–3 kalimat)."
            >
              <textarea
                id="admin-project-description"
                rows={3}
                value={form.description}
                placeholder="Ringkasan singkat project…"
                onChange={(event) => setField('description', event.target.value)}
                className={cn(
                  fieldInputClasses(false),
                  'resize-y leading-relaxed',
                )}
              />
            </FormRow>
          </div>

          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-project-full-description"
              label="Full Description"
              hint="Penjelasan lebih panjang: latar belakang, fitur, dan hasil."
            >
              <textarea
                id="admin-project-full-description"
                rows={6}
                value={form.full_description}
                placeholder="Ceritakan proses dan detail project…"
                onChange={(event) =>
                  setField('full_description', event.target.value)
                }
                className={cn(
                  fieldInputClasses(false),
                  'resize-y leading-relaxed',
                )}
              />
            </FormRow>
          </div>

          <FormRow
            htmlFor="admin-project-category"
            label="Category"
            required
            error={errors.category}
            hint={
              activeFilterKey
                ? `Masuk tab filter publik “${form.category}”.`
                : 'Belum punya tab filter — project tampil pada tab “Semua”.'
            }
          >
            <select
              id="admin-project-category"
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
              className={fieldInputClasses(Boolean(errors.category))}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow
            htmlFor="admin-project-url"
            label="Project URL"
            hint="Tautan demo atau halaman project."
          >
            <input
              id="admin-project-url"
              type="url"
              value={form.url}
              placeholder="https://…"
              onChange={(event) => setField('url', event.target.value)}
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-project-github"
            label="GitHub URL"
            hint="Tautan repositori (opsional)."
          >
            <input
              id="admin-project-github"
              type="url"
              value={form.github_url}
              placeholder="https://github.com/username/repo"
              onChange={(event) => setField('github_url', event.target.value)}
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <FormRow
            htmlFor="admin-project-tools"
            label="Tools / Technology"
            hint="Pisahkan dengan koma, mis. React, Tailwind CSS, Figma."
          >
            <input
              id="admin-project-tools"
              type="text"
              value={form.tools}
              placeholder="React, Tailwind CSS"
              onChange={(event) => setField('tools', event.target.value)}
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <div className="sm:col-span-2">
            <FormRow
              htmlFor="admin-project-thumbnail"
              label="Thumbnail"
              hint="Rasio 4:3 paling pas. Unggah, ganti, atau hapus kapan saja."
            >
              <ImageFieldControl
                value={form.thumbnail_url}
                label="Thumbnail project"
                onChange={(value) => setField('thumbnail_url', value)}
              />
            </FormRow>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface/60 px-4 py-3.5 sm:col-span-2 sm:flex-row sm:gap-8">
            <label
              htmlFor="admin-project-featured"
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id="admin-project-featured"
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setField('featured', event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-navy">
                  Featured Project
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  Diberi penanda “Featured” pada kartu di halaman publik.
                </span>
              </span>
            </label>

            <label
              htmlFor="admin-project-published"
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id="admin-project-published"
                type="checkbox"
                checked={form.published}
                onChange={(event) => setField('published', event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-navy">
                  Publish project
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  Hilangkan centang untuk menyimpan sebagai unpublished — tidak
                  tampil di halaman publik.
                </span>
              </span>
            </label>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
