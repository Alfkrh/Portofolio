/**
 * Panel tambahan di halaman Projects: mengelola daftar filter kategori yang
 * menjadi tombol filter pada section Projects di halaman publik.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, ChevronUp, Pencil, Tag as TagIcon } from 'lucide-react'
import IconTile from '../../components/ui/IconTile'
import { cn } from '../../lib/cn'
import type { PortfolioData } from '../../types/portfolio'
import { collectionConfigs } from '../adminConfig'
import {
  removeCollectionItem,
  saveCollectionItem,
  saveCollectionOrder,
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

const FILTER_CONFIG = collectionConfigs.project_filters

interface EditorState {
  mode: 'create' | 'edit'
  id: number | null
}

interface AdminProjectFiltersPanelProps {
  data: PortfolioData
  reload: () => Promise<void>
}

export default function AdminProjectFiltersPanel({
  data,
  reload,
}: AdminProjectFiltersPanelProps) {
  const filters = data.project_filters

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const openCreate = () => {
    setValues(
      toFormValues(FILTER_CONFIG.fields, null, {
        sort_order: String(filters.length + 1),
      }),
    )
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'create', id: null })
  }

  const openEdit = (item: AdminCollectionItem) => {
    setValues(toFormValues(FILTER_CONFIG.fields, item))
    setErrors({})
    setFormError(null)
    setEditor({ mode: 'edit', id: item.id })
  }

  const closeEditor = () => {
    setEditor(null)
    setFormError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const key = (values.key ?? '').trim().toLowerCase()
    const label = (values.label ?? '').trim()
    const fieldErrors: Record<string, string> = {}

    if (!key) fieldErrors.key = 'Key filter wajib diisi.'
    if (!label) fieldErrors.label = 'Label filter wajib diisi.'

    const duplicate = filters.some(
      (filter) =>
        filter.key.toLowerCase() === key && filter.id !== (editor?.id ?? null),
    )
    if (duplicate) fieldErrors.key = 'Key ini sudah dipakai filter lain.'

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setFormError('Periksa kembali field yang ditandai.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      await saveCollectionItem(
        FILTER_CONFIG.name,
        editor?.mode === 'edit' ? editor.id : null,
        toPayload(FILTER_CONFIG.fields, values),
      )
      await reload()
      setEditor(null)
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Filter gagal disimpan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: AdminCollectionItem) => {
    setBusyId(item.id)
    setRowError(null)

    try {
      await removeCollectionItem(FILTER_CONFIG.name, item.id)
      await reload()
    } catch (cause) {
      setRowError(cause instanceof Error ? cause.message : 'Filter gagal dihapus.')
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= filters.length) return

    const current = filters[index]
    const neighbour = filters[target]
    const sameOrder = current.sort_order === neighbour.sort_order

    setBusyId(current.id)
    setRowError(null)

    try {
      await Promise.all([
        saveCollectionOrder(
          FILTER_CONFIG.name,
          current.id,
          sameOrder ? target + 1 : neighbour.sort_order,
        ),
        saveCollectionOrder(
          FILTER_CONFIG.name,
          neighbour.id,
          sameOrder ? index + 1 : current.sort_order,
        ),
      ])
      await reload()
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Urutan filter gagal diperbarui.',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminPanel
      title="Filter kategori Projects"
      description="Label filter ini menjadi tombol kategori di section Projects. Tombol “All” selalu tersedia otomatis."
      actions={
        <AdminAddButton label="Tambah filter" onClick={openCreate} />
      }
      bodyClassName="p-0 sm:p-0"
    >
      {rowError ? (
        <div className="px-5 pt-5 sm:px-6">
          <AdminAlert tone="error">{rowError}</AdminAlert>
        </div>
      ) : null}

      {filters.length === 0 ? (
        <div className="p-5 sm:p-6">
          <AdminEmptyState
            icon={TagIcon}
            title="Belum ada filter kategori"
            description="Tanpa filter, section Projects hanya menampilkan tombol “All”."
            action={<AdminAddButton label="Tambah filter" onClick={openCreate} />}
          />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {filters.map((filter, index) => {
            const isBusy = busyId === filter.id
            const used = data.projects.filter((project) =>
              project.tags.includes(filter.key),
            ).length

            return (
              <li
                key={filter.id}
                className={cn(
                  'flex flex-col gap-3 p-4 transition duration-200 sm:flex-row sm:items-center sm:p-5',
                  isBusy && 'opacity-60',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <IconTile icon={TagIcon} size="md" tone="soft" />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">
                      {filter.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      key:{' '}
                      <span className="font-mono text-slate-500">
                        {filter.key}
                      </span>{' '}
                      • dipakai {used} project
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                  <AdminIconButton
                    icon={ChevronUp}
                    label="Naikkan urutan"
                    disabled={index === 0 || isBusy}
                    onClick={() => void handleMove(index, -1)}
                  />
                  <AdminIconButton
                    icon={ChevronDown}
                    label="Turunkan urutan"
                    disabled={index === filters.length - 1 || isBusy}
                    onClick={() => void handleMove(index, 1)}
                  />
                  <AdminIconButton
                    icon={Pencil}
                    label="Edit filter"
                    tone="brand"
                    disabled={isBusy}
                    onClick={() => openEdit(filter)}
                  />
                  <ConfirmDeleteButton
                    disabled={isBusy}
                    label="Hapus filter"
                    onConfirm={() => void handleDelete(filter)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AdminModal
        open={editor !== null}
        onClose={closeEditor}
        onSubmit={(event) => void handleSubmit(event)}
        title={editor?.mode === 'edit' ? 'Edit filter' : 'Tambah filter'}
        description="Key dipakai pada data project (tags), label yang tampil di tombol filter."
        footer={
          <AdminFormFooter
            isSaving={isSaving}
            onCancel={closeEditor}
            submitLabel={editor?.mode === 'edit' ? 'Simpan perubahan' : 'Tambah filter'}
          />
        }
      >
        {formError ? (
          <AdminAlert tone="error" className="mb-5">
            {formError}
          </AdminAlert>
        ) : null}

        <AdminFieldGrid
          fields={FILTER_CONFIG.fields}
          values={values}
          errors={errors}
          onChange={(name, value) => {
            setValues((current) => ({ ...current, [name]: value }))
            setErrors((current) => {
              if (!(name in current)) return current
              const next = { ...current }
              delete next[name]
              return next
            })
          }}
        />
      </AdminModal>
    </AdminPanel>
  )
}
