/**
 * Skema validasi request (Zod).
 *
 * Satu skema "create" per resource, dan versi "update"-nya dibuat otomatis
 * dengan `.partial()` — jadi aturan tipe/panjangnya tidak mungkin berbeda
 * antara POST dan PUT.
 *
 * `z.object()` membuang field yang tidak dikenal, sehingga klien tidak bisa
 * menyelipkan kolom di luar daftar (mis. `id` atau `created_at`).
 */

import { z } from 'zod'
import { LIMITS } from '../config/constants.js'

/* --------------------------------- helper --------------------------------- */

const text = (max) => z.string().trim().max(max)
const requiredText = (max) => text(max).min(1, 'Wajib diisi.')

/** Teks opsional: boleh dikirim, boleh null (untuk menghapus nilai). */
const optionalText = (max) => text(max).nullish()

const optionalUrl = () =>
  text(LIMITS.url)
    .refine(
      (value) => value === '' || /^https?:\/\/\S+$/i.test(value) || value.startsWith('/'),
      'Harus berupa URL http(s) atau path yang diawali "/".',
    )
    .nullish()

const optionalEmail = () =>
  text(LIMITS.name)
    .refine((value) => value === '' || z.email().safeParse(value).success, 'Format email belum benar.')
    .nullish()

const optionalStringList = (max) => z.array(text(max).min(1)).max(50).optional()

const sortOrder = z.coerce.number().int().min(0).max(100000).optional()

/** Bentuk create + update dari satu skema. */
function crud(createSchema) {
  return { create: createSchema, update: createSchema.partial() }
}

/* ---------------------------------- profil -------------------------------- */

export const profileSchema = z.object({
  name: requiredText(LIMITS.name).optional(),
  logo: optionalText(60),
  greeting: optionalText(LIMITS.shortText),
  headline: optionalText(LIMITS.mediumText),
  short_description: optionalText(LIMITS.longText),
  availability: optionalText(LIMITS.shortText),
  bio: optionalText(LIMITS.longText),
  education: optionalText(LIMITS.name),
  major: optionalText(LIMITS.name),
  focus: optionalStringList(60),
  status: optionalText(LIMITS.shortText),
  photo_url: optionalUrl(),
  email: optionalEmail(),
  location: optionalText(LIMITS.name),
})

/* --------------------------------- resource ------------------------------- */

export const skillSchemas = crud(
  z.object({
    name: requiredText(LIMITS.name),
    category: requiredText(LIMITS.name),
    level: z.coerce.number().int().min(1).max(5).nullish(),
    icon_url: optionalUrl(),
    sort_order: sortOrder,
  }),
)

export const experienceSchemas = crud(
  z.object({
    position: requiredText(LIMITS.name),
    company: requiredText(LIMITS.name),
    company_logo_url: optionalUrl(),
    type: text(LIMITS.name).optional(),
    start_date: optionalText(20),
    end_date: optionalText(20),
    is_current: z.coerce.boolean().optional(),
    description: optionalText(LIMITS.longText),
    skills: optionalStringList(60),
    sort_order: sortOrder,
  }),
)

export const projectSchemas = crud(
  z.object({
    title: requiredText(LIMITS.name),
    description: optionalText(LIMITS.longText),
    full_description: optionalText(LIMITS.longText * 2),
    category: optionalText(LIMITS.name),
    thumbnail_url: optionalUrl(),
    tools: optionalStringList(60),
    url: optionalUrl(),
    github_url: optionalUrl(),
    tags: optionalStringList(80),
    project_date: optionalText(20),
    featured: z.coerce.boolean().optional(),
    published: z.coerce.boolean().optional(),
    sort_order: sortOrder,
  }),
)

export const projectFilterSchemas = crud(
  z.object({
    key: requiredText(80),
    label: requiredText(LIMITS.name),
    sort_order: sortOrder,
  }),
)

export const educationSchemas = crud(
  z.object({
    institution: requiredText(LIMITS.name),
    degree: optionalText(LIMITS.name),
    major: optionalText(LIMITS.name),
    start_year: optionalText(10),
    end_year: optionalText(10),
    description: optionalText(LIMITS.longText),
    sort_order: sortOrder,
  }),
)

export const certificateSchemas = crud(
  z.object({
    name: requiredText(LIMITS.name),
    issuer: requiredText(LIMITS.name),
    date: optionalText(20),
    credential_id: optionalText(LIMITS.name),
    credential_url: optionalUrl(),
    image_url: optionalUrl(),
    published: z.coerce.boolean().optional(),
    sort_order: sortOrder,
  }),
)

export const socialLinkSchemas = crud(
  z.object({
    platform: requiredText(LIMITS.name),
    label: optionalText(LIMITS.name),
    value: optionalText(LIMITS.shortText),
    url: optionalUrl(),
    icon_url: optionalUrl(),
    is_active: z.coerce.boolean().optional(),
    sort_order: sortOrder,
  }),
)

/* ------------------------- auth & form publik ---------------------------- */

export const loginSchema = z.object({
  email: z.email('Format email belum benar.'),
  password: text(200).min(1, 'Password wajib diisi.'),
})

export const setupSchema = z.object({
  email: z.email('Format email belum benar.'),
  password: text(200).min(8, 'Password minimal 8 karakter.'),
})

export const changePasswordSchema = z.object({
  current_password: text(200).min(1, 'Password saat ini wajib diisi.'),
  new_password: text(200).min(8, 'Password baru minimal 8 karakter.'),
})

export const changeEmailSchema = z.object({
  current_password: text(200).min(1, 'Password saat ini wajib diisi.'),
  email: z.email('Format email belum benar.'),
})

export const contactMessageSchema = z.object({
  name: requiredText(LIMITS.name),
  email: z.email('Format email belum benar.').max(LIMITS.name),
  message: text(LIMITS.message).min(10, 'Pesan minimal 10 karakter.'),
})

/* --------------------------------- teks UI -------------------------------- */

export const sectionSchema = z.record(z.string().max(80), text(LIMITS.longText))
export const settingSchema = z.record(z.string().max(80), text(LIMITS.url))
