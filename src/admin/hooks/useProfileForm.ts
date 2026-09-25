/**
 * Form untuk tabel `profile` (satu baris).
 *
 * Nilai disimpan sebagai draft string; hanya field yang benar-benar berubah
 * yang dikirim ke API (PATCH partial), lalu konten diambil ulang supaya angka
 * statistik dan halaman publik ikut terbarui.
 */

import { useCallback, useMemo, useState } from 'react'
import { updateProfile } from '../../services/portfolioApi'
import type { Profile } from '../../types/portfolio'

export type ProfileFormValues = Record<string, string>

/** Hasil simpan: ada yang tersimpan / tidak ada perubahan / gagal. */
export type ProfileSaveStatus = 'saved' | 'noop' | 'error'

export interface UseProfileFormOptions {
  /** Nama kolom profile yang ikut dikelola form ini. */
  fields: string[]
  /** Kolom yang berisi array string (mis. `focus`). */
  arrayFields?: string[]
  onSaved: () => Promise<void>
}

export interface UseProfileFormResult {
  values: ProfileFormValues
  setValue: (name: string, value: string) => void
  isDirty: boolean
  isSaving: boolean
  error: string | null
  savedAt: number | null
  /** `true` bila ada perubahan yang benar-benar dikirim ke API. */
  save: () => Promise<ProfileSaveStatus>
  reset: () => void
}

function toStringValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (value === null || value === undefined) return ''
  return String(value)
}

function buildValues(
  profile: Profile | null,
  fields: string[],
): ProfileFormValues {
  const values: ProfileFormValues = {}
  for (const field of fields) {
    values[field] = toStringValue(
      profile ? (profile as unknown as Record<string, unknown>)[field] : '',
    )
  }
  return values
}

export function useProfileForm(
  profile: Profile | null,
  { fields, arrayFields = [], onSaved }: UseProfileFormOptions,
): UseProfileFormResult {
  const initial = useMemo(
    () => buildValues(profile, fields),
    // `fields` berasal dari konstanta modul, jadi stabil per halaman.
    [profile, fields],
  )

  const [draft, setDraft] = useState<ProfileFormValues | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const values = draft ?? initial

  const setValue = useCallback(
    (name: string, value: string) => {
      setSavedAt(null)
      setDraft((current) => ({ ...(current ?? initial), [name]: value }))
    },
    [initial],
  )

  const isDirty = useMemo(
    () => fields.some((field) => values[field] !== initial[field]),
    [fields, initial, values],
  )

  const reset = useCallback(() => {
    setDraft(null)
    setError(null)
    setSavedAt(null)
  }, [])

  const save = useCallback(async (): Promise<ProfileSaveStatus> => {
    const patch: Record<string, unknown> = {}

    for (const field of fields) {
      if (values[field] === initial[field]) continue
      patch[field] = arrayFields.includes(field)
        ? values[field]
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : values[field].trim().length > 0
          ? values[field]
          : null
    }

    if (Object.keys(patch).length === 0) return 'noop'

    setIsSaving(true)
    setError(null)

    try {
      await updateProfile(patch as Partial<Omit<Profile, 'id' | 'updated_at'>>)
      await onSaved()
      // Setelah reload, nilai awal sudah berisi data terbaru dari server.
      setDraft(null)
      setSavedAt(Date.now())
      return 'saved'
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Perubahan gagal disimpan.',
      )
      return 'error'
    } finally {
      setIsSaving(false)
    }
  }, [arrayFields, fields, initial, onSaved, values])

  return { values, setValue, isDirty, isSaving, error, savedAt, save, reset }
}
