/**
 * Helper data untuk halaman CRUD admin: mengubah item database menjadi nilai
 * form, dan sebaliknya menjadi payload API.
 */

import { formatPeriod, formatYearRange } from '../lib/formatDate'
import {
  createItem,
  deleteItem,
  updateItem,
} from '../services/portfolioApi'
import type {
  CollectionName,
  Contact,
  Education,
  Experience,
  PortfolioData,
  Profile,
  Project,
  ProjectFilter,
  Skill,
} from '../types/portfolio'
import type { AdminField } from './adminConfig'

export type AdminCollectionItem =
  | Experience
  | Skill
  | Project
  | ProjectFilter
  | Education
  | Contact

/** Ambil daftar item satu koleksi dari payload portfolio. */
export function itemsOf(
  name: CollectionName,
  data: PortfolioData,
): AdminCollectionItem[] {
  switch (name) {
    case 'experience':
      return data.experience
    case 'skills':
      return data.skills
    case 'projects':
      return data.projects
    case 'project_filters':
      return data.project_filters
    case 'education':
      return data.education
    case 'contacts':
      return data.contacts
    default:
      return []
  }
}

export interface AdminItemSummary {
  title: string
  subtitle: string
  meta: string[]
  thumbnail: string | null
}

/** Ringkasan satu baris untuk daftar item di dashboard. */
export function summarize(
  name: CollectionName,
  item: AdminCollectionItem,
): AdminItemSummary {
  switch (name) {
    case 'experience': {
      const value = item as Experience
      const period = formatPeriod(value.start_date, value.end_date, 'Sekarang')
      return {
        title: value.position,
        subtitle: value.company,
        meta: [value.type, period, ...value.skills].filter(Boolean),
        thumbnail: null,
      }
    }
    case 'skills': {
      const value = item as Skill
      return { title: value.name, subtitle: value.category, meta: [], thumbnail: null }
    }
    case 'projects': {
      const value = item as Project
      return {
        title: value.title,
        subtitle: value.description ?? '',
        meta: [value.category ?? '', ...value.tools, ...value.tags].filter(Boolean),
        thumbnail: value.thumbnail_url,
      }
    }
    case 'project_filters': {
      const value = item as ProjectFilter
      return { title: value.label, subtitle: `key: ${value.key}`, meta: [], thumbnail: null }
    }
    case 'education': {
      const value = item as Education
      return {
        title: value.institution,
        subtitle: [value.degree, value.major].filter(Boolean).join(' • '),
        meta: [formatYearRange(value.start_year, value.end_year, 'Sekarang')].filter(
          Boolean,
        ),
        thumbnail: null,
      }
    }
    case 'contacts': {
      const value = item as Contact
      return {
        title: value.label || value.kind,
        subtitle: value.value ?? '',
        meta: [value.kind, value.url ?? ''].filter(Boolean),
        thumbnail: null,
      }
    }
    default:
      return { title: '', subtitle: '', meta: [], thumbnail: null }
  }
}

/** Nilai form (semua string) dari satu item database. */
export function toFormValues(
  fields: AdminField[],
  item: AdminCollectionItem | null,
  defaults: Record<string, string> = {},
): Record<string, string> {
  const values: Record<string, string> = { ...defaults }
  const source = (item ?? {}) as unknown as Record<string, unknown>

  for (const field of fields) {
    if (!item) {
      if (!(field.name in values)) values[field.name] = ''
      continue
    }

    const raw = source[field.name]
    if (Array.isArray(raw)) values[field.name] = raw.map(String).join(', ')
    else if (raw === null || raw === undefined) values[field.name] = ''
    else values[field.name] = String(raw)
  }

  return values
}

/**
 * Ubah nilai form menjadi payload API: list/tags → array, number → angka,
 * string kosong → null (kolom opsional).
 */
export function toPayload(
  fields: AdminField[],
  values: Record<string, string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of fields) {
    const raw = values[field.name] ?? ''

    if (field.type === 'list' || field.type === 'tags') {
      payload[field.name] = raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
      continue
    }

    const trimmed = raw.trim()
    if (trimmed.length === 0) {
      payload[field.name] = field.required ? '' : null
      continue
    }

    payload[field.name] = field.type === 'number' ? Number(trimmed) || 0 : trimmed
  }

  return payload
}

/** Nama singkat admin untuk header (fallback: "Admin"). */
export function adminDisplayName(profile: Profile | null): string {
  const name = profile?.name?.trim()
  return name && name.length > 0 ? name : 'Admin'
}

/** Inisial untuk avatar admin. */
export function initialsOf(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

/* ------------------------------ generic writes ----------------------------- */

/**
 * Payload dibangun sesuai schema koleksi (`AdminField`), jadi cast sempit di
 * sini aman — tipe generik API tidak bisa diturunkan dari nama koleksi dinamis.
 */
export function saveCollectionItem(
  name: CollectionName,
  id: number | null,
  payload: Record<string, unknown>,
) {
  return id === null
    ? createItem(name, payload as never)
    : updateItem(name, id, payload as never)
}

/** Ubah hanya satu kolom (dipakai untuk menggeser urutan tampil). */
export function saveCollectionOrder(
  name: CollectionName,
  id: number,
  sortOrder: number,
) {
  return updateItem(name, id, { sort_order: sortOrder } as never)
}

export function removeCollectionItem(name: CollectionName, id: number) {
  return deleteItem(name, id)
}
