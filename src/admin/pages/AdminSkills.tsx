/**
 * Halaman Skills: kelola keahlian per kategori.
 *
 * Tampilan memakai kartu kategori berisi pill — tanpa persentase atau progress
 * bar — supaya sama dengan section Skills di halaman publik. Setiap aksi
 * (tambah, ubah, hapus, geser urutan) langsung menulis ke database lewat API,
 * tidak ada tombol "publish" terpisah.
 */

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import {
  Code,
  Database,
  GripVertical,
  Palette,
  PenTool,
  Pencil,
  Plus,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import IconTile from '../../components/ui/IconTile'
import { cn } from '../../lib/cn'
import type { PortfolioData, Skill } from '../../types/portfolio'
import {
  removeCollectionItem,
  saveCollectionItem,
  saveCollectionOrder,
} from '../itemView'
import { AdminAlert, AdminEmptyState, AdminPanel } from '../ui/AdminPanels'
import { AdminFormFooter, AdminModal, FormRow } from '../ui/AdminForm'
import { fieldInputClasses } from '../ui/fieldStyles'

/** Kategori standar; sama dengan daftar yang dipakai halaman publik. */
const CATEGORY_OPTIONS = [
  'UI/UX Design',
  'Web Development',
  'Database',
  'Creative',
  'Tools',
  'Other',
] as const

/** Ikon per kategori — mengikuti pemetaan section Skills publik. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'UI/UX Design': PenTool,
  'Web Development': Code,
  Database: Database,
  Creative: Palette,
  Tools: Wrench,
  Other: Sparkles,
}

const SUCCESS_NOTE_DURATION_MS = 6000

/** Kategori kosong dianggap `Other`, sama seperti di halaman publik. */
function normalizeCategory(category: string): string {
  const trimmed = category.trim()
  return trimmed.length > 0 ? trimmed : 'Other'
}

interface SkillFormState {
  name: string
  category: string
}

interface AdminSkillsProps {
  data: PortfolioData
  reload: () => Promise<void>
}

export default function AdminSkills({ data, reload }: AdminSkillsProps) {
  const items = data.skills

  const [note, setNote] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  // Form tambah cepat (selalu terlihat di atas daftar).
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<string>(CATEGORY_OPTIONS[0])
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Modal edit.
  const [editing, setEditing] = useState<Skill | null>(null)
  const [form, setForm] = useState<SkillFormState>({ name: '', category: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Konfirmasi hapus + status geser.
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  // Notifikasi hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => setNote(null), SUCCESS_NOTE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [note])

  /** Urutan kategori: kategori standar lebih dulu, lalu kategori lain di data. */
  const categories = useMemo(() => {
    const known: string[] = [...CATEGORY_OPTIONS]
    const extra: string[] = []
    for (const item of items) {
      const category = normalizeCategory(item.category)
      if (!known.includes(category) && !extra.includes(category)) {
        extra.push(category)
      }
    }
    return [...known, ...extra]
  }, [items])

  const grouped = useMemo(
    () =>
      categories.map((category) => ({
        category,
        skills: items.filter(
          (item) => normalizeCategory(item.category) === category,
        ),
      })),
    [categories, items],
  )

  /**
   * Pindahkan satu skill tepat ke posisi skill tujuan, lalu tulis ulang
   * `sort_order` berurutan hanya untuk baris yang berubah.
   */
  const moveSkill = async (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return

    const ordered = [...items]
    const from = ordered.findIndex((item) => item.id === draggedId)
    const to = ordered.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) return

    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)

    const changed = ordered.filter(
      (item, index) => item.sort_order !== index + 1,
    )
    if (changed.length === 0) return

    setBusyId(draggedId)
    setRowError(null)

    try {
      await Promise.all(
        changed.map((item) =>
          saveCollectionOrder(
            'skills',
            item.id,
            ordered.findIndex((entry) => entry.id === item.id) + 1,
          ),
        ),
      )
      await reload()
      setNote('Urutan skill berhasil diperbarui.')
    } catch (cause) {
      setRowError(
        cause instanceof Error ? cause.message : 'Urutan gagal diperbarui.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = newName.trim()
    if (name.length === 0) {
      setAddError('Skill Name wajib diisi.')
      return
    }

    const duplicate = items.some(
      (item) =>
        item.name.trim().toLowerCase() === name.toLowerCase() &&
        normalizeCategory(item.category) === normalizeCategory(newCategory),
    )
    if (duplicate) {
      setAddError(`“${name}” sudah ada di kategori ${normalizeCategory(newCategory)}.`)
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      const highest = items.reduce((max, item) => Math.max(max, item.sort_order), 0)
      await saveCollectionItem('skills', null, {
        name,
        category: normalizeCategory(newCategory),
        sort_order: highest + 1,
      })
      await reload()
      setNewName('')
      setNote(`Skill “${name}” berhasil ditambahkan.`)
    } catch (cause) {
      setAddError(cause instanceof Error ? cause.message : 'Skill gagal disimpan.')
    } finally {
      setIsAdding(false)
    }
  }

  const openEdit = (skill: Skill) => {
    setForm({ name: skill.name, category: normalizeCategory(skill.category) })
    setFormError(null)
    setEditing(skill)
  }

  const handleSubmitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = form.name.trim()
    if (name.length === 0) {
      setFormError('Skill Name wajib diisi.')
      return
    }

    if (!editing) return

    setIsSaving(true)
    setFormError(null)

    try {
      await saveCollectionItem('skills', editing.id, {
        name,
        category: normalizeCategory(form.category),
      })
      await reload()
      setEditing(null)
      setNote('Skill berhasil diperbarui dan sudah tampil di website portfolio.')
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Skill gagal diperbarui.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (skill: Skill) => {
    setConfirmingId(null)
    setBusyId(skill.id)
    setRowError(null)

    try {
      await removeCollectionItem('skills', skill.id)
      await reload()
      setNote(`Skill “${skill.name}” dihapus dari website portfolio.`)
    } catch (cause) {
      setRowError(cause instanceof Error ? cause.message : 'Skill gagal dihapus.')
    } finally {
      setBusyId(null)
    }
  }

  /** Geser satu langkah di dalam kategori yang sama (dukungan keyboard). */
  const handleMoveBy = (skill: Skill, direction: -1 | 1) => {
    const siblings = items.filter(
      (item) => normalizeCategory(item.category) === normalizeCategory(skill.category),
    )
    const index = siblings.findIndex((item) => item.id === skill.id)
    const neighbour = siblings[index + direction]
    if (!neighbour) return

    void moveSkill(skill.id, neighbour.id)
  }

  const handleHandleKeys = (
    event: KeyboardEvent<HTMLButtonElement>,
    skill: Skill,
  ) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      handleMoveBy(skill, -1)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      handleMoveBy(skill, 1)
    }
  }

  return (
    <div className="space-y-6">
      {note ? <AdminAlert tone="success">{note}</AdminAlert> : null}

      <AdminPanel
        title="Add Skill"
        description="Tambahkan keahlian lalu pilih kategorinya. Perubahan langsung tersimpan dan tampil di halaman publik."
      >
        <form onSubmit={(event) => void handleAdd(event)}>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto] sm:items-start">
            <FormRow
              htmlFor="admin-skill-name"
              label="Skill Name"
              required
              error={addError ?? undefined}
              hint="Mis. Figma, React, MySQL."
            >
              <input
                id="admin-skill-name"
                type="text"
                value={newName}
                placeholder="mis. Figma"
                onChange={(event) => {
                  setNewName(event.target.value)
                  setAddError(null)
                }}
                className={fieldInputClasses(Boolean(addError))}
              />
            </FormRow>

            <FormRow htmlFor="admin-skill-category" label="Category" required>
              <select
                id="admin-skill-category"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className={fieldInputClasses(false)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormRow>

            <div className="flex flex-col gap-2 sm:pt-6">
              <button
                type="submit"
                disabled={isAdding || newName.trim().length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-brand-600 px-5 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-700 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {isAdding ? 'Menyimpan…' : 'Add Skill'}
              </button>
            </div>
          </div>
        </form>
      </AdminPanel>

      {rowError ? <AdminAlert tone="error">{rowError}</AdminAlert> : null}

      {items.length === 0 ? (
        <AdminPanel title="Skills">
          <AdminEmptyState
            icon={Sparkles}
            title="Belum ada skill yang ditambahkan"
            description="Tambahkan skill pertama lewat form di atas agar section Skills tampil di halaman publik."
          />
        </AdminPanel>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {grouped.map((group) => {
            const Icon = CATEGORY_ICONS[group.category] ?? Sparkles

            return (
              <article
                key={group.category}
                className="flex flex-col rounded-card border border-line bg-white p-5 shadow-soft"
              >
                <header className="flex items-center gap-3">
                  <IconTile icon={Icon} size="md" tone="soft" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-navy">
                      {group.category}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                      {group.skills.length} skill
                    </p>
                  </div>
                </header>

                {group.skills.length === 0 ? (
                  <p className="mt-5 rounded-xl border border-dashed border-line px-3.5 py-4 text-xs text-slate-400">
                    Belum ada skill di kategori ini.
                  </p>
                ) : (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {group.skills.map((skill) => {
                      const isBusy = busyId === skill.id
                      const isDragging = draggingId === skill.id

                      return (
                        <li
                          key={skill.id}
                          onDragOver={(event) => {
                            // Hanya menerima skill dari kategori yang sama.
                            if (!draggingId) return
                            const dragged = items.find(
                              (item) => item.id === draggingId,
                            )
                            if (
                              !dragged ||
                              normalizeCategory(dragged.category) !== group.category
                            ) {
                              return
                            }
                            event.preventDefault()
                            if (dragOverId !== skill.id) setDragOverId(skill.id)
                          }}
                          onDragLeave={() => {
                            if (dragOverId === skill.id) setDragOverId(null)
                          }}
                          onDrop={(event) => {
                            event.preventDefault()
                            const dragged =
                              draggingId ??
                              Number(event.dataTransfer.getData('text/plain'))
                            if (dragged) void moveSkill(dragged, skill.id)
                            setDraggingId(null)
                            setDragOverId(null)
                          }}
                          className={cn(
                            'relative inline-flex items-center gap-1 rounded-pill border border-line bg-white py-1 pl-1.5 pr-1.5 shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] transition duration-200',
                            isBusy && 'opacity-60',
                            isDragging && 'opacity-40',
                            dragOverId === skill.id &&
                              'border-brand-300 ring-2 ring-brand-100',
                          )}
                        >
                          <button
                            type="button"
                            draggable
                            aria-label={`Geser urutan ${skill.name}`}
                            title="Geser untuk mengubah urutan (atau pakai tombol panah)"
                            disabled={isBusy}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = 'move'
                              event.dataTransfer.setData('text/plain', String(skill.id))
                              setDraggingId(skill.id)
                            }}
                            onDragEnd={() => {
                              setDraggingId(null)
                              setDragOverId(null)
                            }}
                            onKeyDown={(event) => handleHandleKeys(event, skill)}
                            className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-full text-slate-300 transition duration-200 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
                          >
                            <GripVertical aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>

                          <span className="px-0.5 text-sm font-medium text-navy">
                            {skill.name}
                          </span>

                          <button
                            type="button"
                            aria-label={`Edit ${skill.name}`}
                            title="Edit"
                            disabled={isBusy}
                            onClick={() => openEdit(skill)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition duration-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
                          >
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            aria-label={`Hapus ${skill.name}`}
                            title="Hapus"
                            disabled={isBusy}
                            onClick={() =>
                              setConfirmingId((current) =>
                                current === skill.id ? null : skill.id,
                              )
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition duration-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
                          >
                            <X aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>

                          {confirmingId === skill.id ? (
                            <>
                              <button
                                type="button"
                                aria-label="Tutup konfirmasi"
                                onClick={() => setConfirmingId(null)}
                                className="fixed inset-0 z-10 cursor-default"
                              />
                              <span className="absolute right-0 top-full z-20 mt-2 flex w-60 flex-col gap-2 rounded-xl border border-line bg-white p-3 text-left shadow-lift">
                                <span className="text-xs leading-relaxed text-slate-600">
                                  Hapus skill{' '}
                                  <span className="font-semibold text-navy">
                                    “{skill.name}”
                                  </span>
                                  ?
                                </span>
                                <span className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleDelete(skill)}
                                    className="inline-flex h-8 items-center rounded-pill bg-red-600 px-3 text-xs font-semibold text-white transition duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                                  >
                                    Ya, hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingId(null)}
                                    className="inline-flex h-8 items-center rounded-pill px-3 text-xs font-semibold text-slate-500 transition duration-200 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
                                  >
                                    Batal
                                  </button>
                                </span>
                              </span>
                            </>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </article>
            )
          })}
        </section>
      )}

      <AdminModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={(event) => void handleSubmitEdit(event)}
        title="Edit Skill"
        description={editing ? `Perbarui “${editing.name}” lalu simpan.` : undefined}
        footer={
          <AdminFormFooter
            isSaving={isSaving}
            onCancel={() => setEditing(null)}
            cancelLabel="Cancel"
            submitLabel="Save Changes"
          />
        }
      >
        {formError ? (
          <AdminAlert tone="error" className="mb-5">
            {formError}
          </AdminAlert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow htmlFor="admin-skill-edit-name" label="Skill Name" required>
            <input
              id="admin-skill-edit-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={fieldInputClasses(false)}
            />
          </FormRow>

          <FormRow htmlFor="admin-skill-edit-category" label="Category" required>
            <select
              id="admin-skill-edit-category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className={fieldInputClasses(false)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormRow>
        </div>
      </AdminModal>
    </div>
  )
}
