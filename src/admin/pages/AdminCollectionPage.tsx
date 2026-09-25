/**
 * Halaman CRUD generik untuk koleksi portfolio (experience, skills, projects,
 * education, contacts).
 *
 * Semua form dibangkitkan dari `AdminField[]` pada `collectionConfigs`, jadi
 * menambah field cukup mengubah konfigurasi.
 */

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import Tag from '../../components/ui/Tag'
import IconTile from '../../components/ui/IconTile'
import { useLocation, navigate } from '../../lib/useLocation'
import { cn } from '../../lib/cn'
import type { PortfolioData } from '../../types/portfolio'
import type { AdminCollectionConfig } from '../adminConfig'
import {
  itemsOf,
  removeCollectionItem,
  saveCollectionItem,
  saveCollectionOrder,
  summarize,
  toFormValues,
  toPayload,
  type AdminCollectionItem,
} from '../itemView'
import {
  AdminAddButton,
  AdminAlert,
  AdminEmptyState,
  AdminIconButton,
  AdminPanel,
} from '../ui/AdminPanels'
import {
  AdminFieldGrid,
  AdminFormFooter,
  AdminModal,
  ConfirmDeleteButton,
} from '../ui/AdminForm'
import AdminProjectFiltersPanel from './AdminProjectFiltersPanel'

const SUCCESS_NOTE_DURATION_MS = 6000

interface AdminCollectionPageProps {
  config: AdminCollectionConfig
  data: PortfolioData
  reload: () => Promise<void>
}

type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; id: number }
  | null

export default function AdminCollectionPage({
  config,
  data,
  reload,
}: AdminCollectionPageProps) {
  const location = useLocation()
  const items = itemsOf(config.name, data)

  const defaultValues = useCallback(
    (): Record<string, string> => ({ sort_order: String(items.length + 1) }),
    [items.length],
  )

  const openedFromUrl =
    new URLSearchParams(location.search).get('new') === '1'

  const [editor, setEditor] = useState<EditorState | null>(() =>
    openedFromUrl ? { mode: 'create' } : null,
  )
  const [values, setValues] = useState<Record<string, string>>(() =>
    openedFromUrl
      ? toFormValues(config.fields, null, { sort_order: '1' })
      : {},
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  /** Notifikasi sukses yang hilang sendiri setelah beberapa detik. */
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => setNote(null), SUCCESS_NOTE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [note])

  const tagOptions = data.project_filters.map((filter) => ({
    key: filter.key,
    label: filter.label,
  }))

  const openCreate = () => {
    setValues(toFormValues(config.fields, null, defaultValues()))
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'create' })
  }

  const openEdit = (item: AdminCollectionItem) => {
    setValues(toFormValues(config.fields, item))
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

  const setFieldValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const fieldErrors: Record<string, string> = {}
    for (const field of config.fields) {
      if (field.required && (values[field.name] ?? '').trim().length === 0) {
        fieldErrors[field.name] = `${field.label} wajib diisi.`
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setFormError('Lengkapi field wajib yang ditandai di bawah.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      const isEdit = editor?.mode === 'edit'
      await saveCollectionItem(
        config.name,
        isEdit ? (editor?.id ?? null) : null,
        toPayload(config.fields, values),
      )
      await reload()
      setEditor(null)
      setNote(
        isEdit
          ? `${config.label} berhasil diperbarui dan sudah tampil di website portfolio.`
          : `${config.label} baru berhasil ditambahkan dan sudah tampil di website portfolio.`,
      )
      if (location.search) navigate(location.pathname, { replace: true })
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Data gagal disimpan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: AdminCollectionItem) => {
    setBusyId(item.id)
    setRowError(null)

    const title = summarize(config.name, item).title

    try {
      await removeCollectionItem(config.name, item.id)
      await reload()
      setNote(
        title
          ? `“${title}” dihapus dari website portfolio.`
          : 'Data berhasil dihapus.',
      )
    } catch (cause) {
      setRowError(cause instanceof Error ? cause.message : 'Data gagal dihapus.')
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return

    const current = items[index]
    const neighbour = items[target]
    const sameOrder = current.sort_order === neighbour.sort_order

    setBusyId(current.id)
    setRowError(null)

    try {
      await Promise.all([
        saveCollectionOrder(
          config.name,
          current.id,
          sameOrder ? target + 1 : neighbour.sort_order,
        ),
        saveCollectionOrder(
          config.name,
          neighbour.id,
          sameOrder ? index + 1 : current.sort_order,
        ),
      ])
      await reload()
      setNote('Urutan berhasil diperbarui.')
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Urutan gagal diperbarui.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const editingItem =
    editor?.mode === 'edit'
      ? (items.find((item) => item.id === editor.id) ?? null)
      : null

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      {config.name === 'projects' ? (
        <AdminProjectFiltersPanel data={data} reload={reload} />
      ) : null}

      <AdminPanel
        title={config.label}
        description={config.description}
        actions={
          <span className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {items.length} item
            </span>
            <AdminAddButton
              label={`Tambah ${config.singular}`}
              onClick={openCreate}
            />
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
              icon={config.icon}
              title={`Belum ada ${config.singular} yang ditambahkan`}
              description={`Tambahkan ${config.singular} pertama agar section ini tampil di halaman publik.`}
              action={
                <AdminAddButton
                  label={`Tambah ${config.singular}`}
                  onClick={openCreate}
                />
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item, index) => {
              const summary = summarize(config.name, item)
              const isBusy = busyId === item.id

              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-col gap-3 p-4 transition duration-200 sm:p-5 lg:flex-row lg:items-center lg:gap-4',
                    isBusy && 'opacity-60',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    {summary.thumbnail ? (
                      <img
                        src={summary.thumbnail}
                        alt=""
                        decoding="async"
                        className="h-12 w-12 shrink-0 rounded-xl border border-line object-cover"
                      />
                    ) : (
                      <IconTile icon={config.icon} size="md" tone="soft" />
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">
                        {summary.title || '(tanpa judul)'}
                      </p>

                      {summary.subtitle ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {summary.subtitle}
                        </p>
                      ) : null}

                      {summary.meta.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {summary.meta.slice(0, 5).map((entry) => (
                            <li key={`${item.id}-${entry}`}>
                              <Tag tone="neutral">{entry}</Tag>
                            </li>
                          ))}
                          {summary.meta.length > 5 ? (
                            <li className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-medium text-slate-400">
                              +{summary.meta.length - 5}
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end lg:self-auto">
                    <AdminIconButton
                      icon={ChevronUp}
                      label="Naikkan urutan"
                      disabled={index === 0 || isBusy}
                      onClick={() => void handleMove(index, -1)}
                    />
                    <AdminIconButton
                      icon={ChevronDown}
                      label="Turunkan urutan"
                      disabled={index === items.length - 1 || isBusy}
                      onClick={() => void handleMove(index, 1)}
                    />
                    <AdminIconButton
                      icon={Pencil}
                      label={`Edit ${config.singular}`}
                      tone="brand"
                      disabled={isBusy}
                      onClick={() => openEdit(item)}
                    />
                    <ConfirmDeleteButton
                      disabled={isBusy}
                      label={`Hapus ${config.singular}`}
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
        title={
          editor?.mode === 'edit'
            ? `Edit ${config.singular}`
            : `Tambah ${config.singular}`
        }
        description={
          editor?.mode === 'edit'
            ? editingItem
              ? summarize(config.name, editingItem).title
              : 'Perbarui data berikut lalu simpan.'
            : 'Isi data berikut, lalu simpan untuk menampilkannya di halaman publik.'
        }
        footer={
          <AdminFormFooter
            isSaving={isSaving}
            onCancel={closeEditor}
            submitLabel={
              editor?.mode === 'edit'
                ? 'Simpan perubahan'
                : `Tambah ${config.singular}`
            }
          />
        }
      >
        {formError ? (
          <AdminAlert tone="error" className="mb-5">
            {formError}
          </AdminAlert>
        ) : null}

        <AdminFieldGrid
          fields={config.fields}
          values={values}
          errors={errors}
          onChange={setFieldValue}
          tagOptions={tagOptions}
        />
      </AdminModal>
    </div>
  )
}
