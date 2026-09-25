/**
 * Form kontak halaman Profile: Email, LinkedIn, GitHub, dan Instagram.
 *
 * Kontak TIDAK disimpan di tabel `profile` — masing-masing adalah baris
 * koleksi `contacts` yang dicocokkan lewat kolom `kind`. Saat disimpan:
 * baris yang sudah ada di-update (PUT), yang belum ada dibuat (POST), dan
 * yang dikosongkan dihapus (DELETE). Semua lewat API, jadi halaman publik
 * otomatis memakai data terbaru setelah `onSaved()` memuat ulang portfolio.
 */

import { useCallback, useMemo, useState } from 'react'
import type { Contact } from '../../types/portfolio'
import { removeCollectionItem, saveCollectionItem } from '../itemView'

export type ProfileContactKind = 'email' | 'linkedin' | 'github' | 'instagram'

export interface ProfileContactField {
  kind: ProfileContactKind
  label: string
  placeholder: string
  hint?: string
}

export const PROFILE_CONTACT_FIELDS: ProfileContactField[] = [
  {
    kind: 'email',
    label: 'Email',
    placeholder: 'nama@email.com',
    hint: 'Otomatis menjadi tautan mailto di halaman publik.',
  },
  { kind: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/username' },
  { kind: 'github', label: 'GitHub', placeholder: 'github.com/username' },
  { kind: 'instagram', label: 'Instagram', placeholder: 'instagram.com/username' },
]

export type ContactSaveStatus = 'saved' | 'noop' | 'error'

export interface UseProfileContactsResult {
  values: Record<ProfileContactKind, string>
  setValue: (kind: ProfileContactKind, value: string) => void
  isDirty: boolean
  isSaving: boolean
  error: string | null
  save: () => Promise<ContactSaveStatus>
  reset: () => void
}

/** Nilai awal satu kontak dari baris database (fallback ke url). */
function contactDraftValue(contact: Contact | undefined): string {
  if (!contact) return ''
  return (contact.value ?? contact.url ?? '').trim()
}

/**
 * Ubah input admin menjadi pasangan `value` (teks tampil) dan `url` (tautan).
 * Input tanpa protokol otomatis dibungkus — `github.com/user` menjadi
 * `https://github.com/user`, email menjadi `mailto:email`.
 */
function buildContactPayload(
  kind: ProfileContactKind,
  rawInput: string,
): { value: string | null; url: string | null } {
  const input = rawInput.trim()
  if (input.length === 0) return { value: null, url: null }

  if (kind === 'email') {
    const url = /^mailto:/i.test(input) ? input : `mailto:${input}`
    return { value: input, url }
  }

  const url = /^(https?:|mailto:|tel:)/i.test(input)
    ? input
    : `https://${input.replace(/^\/+/, '')}`
  const value = input.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')

  return { value, url }
}

export function useProfileContacts(
  contacts: Contact[],
  onSaved: () => Promise<void>,
): UseProfileContactsResult {
  const initial = useMemo(() => {
    const map = {} as Record<ProfileContactKind, string>
    for (const field of PROFILE_CONTACT_FIELDS) {
      const row = contacts.find((contact) => contact.kind === field.kind)
      map[field.kind] = contactDraftValue(row)
    }
    return map
  }, [contacts])

  const [draft, setDraft] = useState<Record<ProfileContactKind, string> | null>(
    null,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const values = draft ?? initial

  const setValue = useCallback(
    (kind: ProfileContactKind, value: string) => {
      setDraft((current) => ({ ...(current ?? initial), [kind]: value }))
    },
    [initial],
  )

  const isDirty = useMemo(
    () =>
      PROFILE_CONTACT_FIELDS.some(
        (field) => values[field.kind] !== initial[field.kind],
      ),
    [initial, values],
  )

  const reset = useCallback(() => {
    setDraft(null)
    setError(null)
  }, [])

  const save = useCallback(async (): Promise<ContactSaveStatus> => {
    const changes = PROFILE_CONTACT_FIELDS.filter(
      (field) => values[field.kind] !== initial[field.kind],
    ).map((field) => ({ field, input: values[field.kind] }))

    if (changes.length === 0) return 'noop'

    setIsSaving(true)
    setError(null)

    try {
      for (const { field, input } of changes) {
        const row = contacts.find((contact) => contact.kind === field.kind)
        const payload = buildContactPayload(field.kind, input)

        // Dikosongkan → hapus barisnya supaya kontak hilang dari halaman publik.
        if (!payload.value && !payload.url) {
          if (row) await removeCollectionItem('contacts', row.id)
          continue
        }

        if (row) {
          // Update parsial: label dan urutan lama tetap dipertahankan.
          await saveCollectionItem('contacts', row.id, payload)
        } else {
          await saveCollectionItem('contacts', null, {
            kind: field.kind,
            label: field.label,
            ...payload,
          })
        }
      }

      await onSaved()
      // Setelah reload, nilai awal sudah berisi data terbaru dari server.
      setDraft(null)
      return 'saved'
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kontak gagal disimpan.')
      return 'error'
    } finally {
      setIsSaving(false)
    }
  }, [contacts, initial, onSaved, values])

  return { values, setValue, isDirty, isSaving, error, save, reset }
}
