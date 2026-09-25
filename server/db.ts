/**
 * Lapisan database untuk portfolio publik.
 *
 * Menggunakan `node:sqlite` (bawaan Node 24) sehingga tidak ada dependency
 * native tambahan. File database dibuat otomatis di `server/data/portfolio.db`
 * dan diisi konten awal dari `server/seed.ts` saat masih kosong.
 */

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  SITE_SETTING_DEFAULTS,
  SITE_SETTING_KEYS,
} from '../src/config/siteSettings.ts'
import type {
  CollectionItemMap,
  CollectionName,
  Contact,
  Education,
  Experience,
  PortfolioData,
  Profile,
  Project,
  ProjectFilter,
  Skill,
} from '../src/types/portfolio.ts'
import { seedData } from './seed.ts'

/* ------------------------------ tipe auth/settings ----------------------------- */

/** Akun admin (password selalu dalam bentuk hash). */
export interface AdminUser {
  id: number
  email: string
}

/** Sesi admin yang tersimpan — token asli tidak pernah disimpan. */
export interface AdminSessionRecord {
  token_hash: string
  user_id: number
  created_at: string | null
  expires_at: string | null
}

const serverDir = import.meta.dirname
const projectRoot = resolve(serverDir, '..')

/** Semua data runtime (database + file upload) disimpan di sini. */
export const DATA_DIR = process.env.PORTFOLIO_DATA_DIR
  ? resolve(process.env.PORTFOLIO_DATA_DIR)
  : resolve(serverDir, 'data')

export const UPLOADS_DIR = resolve(DATA_DIR, 'uploads')

const DB_PATH = process.env.PORTFOLIO_DB_PATH
  ? resolve(process.env.PORTFOLIO_DB_PATH)
  : resolve(DATA_DIR, 'portfolio.db')

/** Root folder build frontend (untuk server produksi). */
export const DIST_DIR = resolve(projectRoot, 'dist')

/** Kolom yang boleh ditulis, per koleksi. */
const COLLECTIONS = {
  experience: {
    table: 'experience',
    columns: [
      'position',
      'company',
      'type',
      'start_date',
      'end_date',
      'description',
      'skills',
      'sort_order',
    ],
  },
  skills: {
    table: 'skills',
    columns: ['name', 'category', 'sort_order'],
  },
  projects: {
    table: 'projects',
    columns: [
      'title',
      'description',
      'full_description',
      'category',
      'thumbnail_url',
      'tools',
      'url',
      'github_url',
      'tags',
      'featured',
      'published',
      'sort_order',
    ],
  },
  project_filters: {
    table: 'project_filters',
    columns: ['key', 'label', 'sort_order'],
  },
  education: {
    table: 'education',
    columns: [
      'institution',
      'degree',
      'major',
      'start_year',
      'end_year',
      'description',
      'sort_order',
    ],
  },
  contacts: {
    table: 'contacts',
    columns: ['kind', 'label', 'value', 'url', 'sort_order'],
  },
} as const satisfies Record<
  CollectionName,
  { table: string; columns: readonly string[] }
>

/** Kolom yang boleh ditulis untuk tabel profile. */
const PROFILE_COLUMNS = [
  'name',
  'logo',
  'greeting',
  'headline',
  'short_description',
  'availability',
  'bio',
  'education',
  'major',
  'focus',
  'status',
  'photo_url',
] as const

type DbRow = Record<string, unknown>

let database: DatabaseSync | null = null

function createSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      logo TEXT,
      greeting TEXT,
      headline TEXT,
      short_description TEXT,
      availability TEXT,
      bio TEXT,
      education TEXT,
      major TEXT,
      focus TEXT,
      status TEXT,
      photo_url TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS experience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position TEXT NOT NULL,
      company TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      description TEXT,
      skills TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      full_description TEXT,
      category TEXT,
      thumbnail_url TEXT,
      tools TEXT,
      url TEXT,
      github_url TEXT,
      tags TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    /* Filter section Projects (mis. "UI/UX", "Web Development"). */
    CREATE TABLE IF NOT EXISTS project_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    /* Akun admin dashboard — hanya hash password yang disimpan. */
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );

    /* Sesi login: yang disimpan hanya hash token, bukan token aslinya. */
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT,
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    /* Pengaturan tingkat situs (nama, judul, deskripsi, favicon). */
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution TEXT NOT NULL,
      degree TEXT,
      major TEXT,
      start_year TEXT,
      end_year TEXT,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      label TEXT,
      value TEXT,
      url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sections (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function seedIfEmpty(db: DatabaseSync) {
  const existing = db.prepare('SELECT COUNT(*) AS total FROM profile').get() as
    | { total: number }
    | undefined
  if (existing && Number(existing.total) > 0) return

  const insertProfile = db.prepare(`
    INSERT INTO profile (
      id, name, logo, greeting, headline, short_description, availability,
      bio, education, major, focus, status, photo_url, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const { profile } = seedData
  insertProfile.run(
    profile.name,
    profile.logo,
    profile.greeting,
    profile.headline,
    profile.short_description,
    profile.availability,
    profile.bio,
    profile.education,
    profile.major,
    JSON.stringify(profile.focus),
    profile.status,
    profile.photo_url,
    new Date().toISOString(),
  )

  const insertExperience = db.prepare(`
    INSERT INTO experience (position, company, type, start_date, end_date, description, skills, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  seedData.experience.forEach((item, index) =>
    insertExperience.run(
      item.position,
      item.company,
      item.type,
      item.start_date,
      item.end_date,
      item.description,
      JSON.stringify(item.skills),
      index + 1,
    ),
  )

  const insertSkill = db.prepare(
    'INSERT INTO skills (name, category, sort_order) VALUES (?, ?, ?)',
  )
  seedData.skills.forEach((skill, index) =>
    insertSkill.run(skill.name, skill.category, index + 1),
  )

  const insertProject = db.prepare(`
    INSERT INTO projects (
      title, description, full_description, category, thumbnail_url, tools,
      url, github_url, tags, featured, published, sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  seedData.projects.forEach((project, index) =>
    insertProject.run(
      project.title,
      project.description,
      project.full_description,
      project.category,
      project.thumbnail_url,
      JSON.stringify(project.tools),
      project.url,
      project.github_url,
      JSON.stringify(project.tags),
      project.featured ? 1 : 0,
      project.published ? 1 : 0,
      index + 1,
    ),
  )

  const insertEducation = db.prepare(`
    INSERT INTO education (institution, degree, major, start_year, end_year, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  seedData.education.forEach((item, index) =>
    insertEducation.run(
      item.institution,
      item.degree,
      item.major,
      item.start_year,
      item.end_year,
      item.description,
      index + 1,
    ),
  )

  const insertContact = db.prepare(
    'INSERT INTO contacts (kind, label, value, url, sort_order) VALUES (?, ?, ?, ?, ?)',
  )
  seedData.contacts.forEach((contact, index) =>
    insertContact.run(
      contact.kind,
      contact.label,
      contact.value,
      contact.url,
      index + 1,
    ),
  )

  const insertSection = db.prepare(
    'INSERT INTO sections (key, value) VALUES (?, ?)',
  )
  for (const [key, value] of Object.entries(seedData.sections)) {
    insertSection.run(key, value)
  }
}

/**
 * Filter project disimpan di tabelnya sendiri agar labelnya bisa diubah dari
 * database. Diisi otomatis saat tabelnya masih kosong (termasuk untuk database
 * yang sudah ada sebelum fitur filter ini ditambahkan).
 */
function seedProjectFiltersIfEmpty(db: DatabaseSync) {
  const existing = db
    .prepare('SELECT COUNT(*) AS total FROM project_filters')
    .get() as { total: number } | undefined

  if (existing && Number(existing.total) > 0) return

  const insert = db.prepare(
    'INSERT INTO project_filters (key, label, sort_order) VALUES (?, ?, ?)',
  )
  seedData.projectFilters.forEach((filter, index) =>
    insert.run(filter.key, filter.label, index + 1),
  )
}

/**
 * Upgrade ringan untuk database yang dibuat versi sebelumnya: menambahkan
 * kolom `projects` yang belum ada. Kolom `tags` (versi lama) juga diisi tag
 * bawaan pada baris yang masih kosong, jadi data manual tidak tertimpa.
 */
function migrateSchema(db: DatabaseSync) {
  const columns = db.prepare('PRAGMA table_info(projects)').all() as Array<{
    name?: unknown
  }>
  const hasColumn = (name: string) =>
    columns.some((column) => String(column.name) === name)

  if (!hasColumn('tags')) {
    db.exec('ALTER TABLE projects ADD COLUMN tags TEXT')

    const updateTags = db.prepare(
      `UPDATE projects SET tags = ? WHERE title = ? AND (tags IS NULL OR tags = '')`,
    )
    for (const project of seedData.projects) {
      updateTags.run(JSON.stringify(project.tags), project.title)
    }
  }

  // Kolom baru: deskripsi lengkap, tautan GitHub, featured, dan status publish.
  // `DEFAULT 1` membuat project lama tetap tampil di halaman publik.
  if (!hasColumn('full_description')) {
    db.exec('ALTER TABLE projects ADD COLUMN full_description TEXT')
  }
  if (!hasColumn('github_url')) {
    db.exec('ALTER TABLE projects ADD COLUMN github_url TEXT')
  }
  if (!hasColumn('featured')) {
    db.exec('ALTER TABLE projects ADD COLUMN featured INTEGER NOT NULL DEFAULT 0')
  }
  if (!hasColumn('published')) {
    db.exec('ALTER TABLE projects ADD COLUMN published INTEGER NOT NULL DEFAULT 1')
  }
}

/** Isi pengaturan bawaan saat tabel `settings` masih kosong. */
function seedSettingsIfEmpty(db: DatabaseSync): void {
  const existing = db
    .prepare('SELECT COUNT(*) AS total FROM settings')
    .get() as { total: number } | undefined

  if (existing && Number(existing.total) > 0) return

  const insert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
  )
  for (const key of SITE_SETTING_KEYS) {
    insert.run(key, SITE_SETTING_DEFAULTS[key])
  }
}

/** Membuka database (sekali) dan memastikan schema + konten awal siap. */
export function getDatabase(): DatabaseSync {
  if (database) return database

  mkdirSync(dirname(DB_PATH), { recursive: true })
  mkdirSync(UPLOADS_DIR, { recursive: true })

  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  createSchema(db)
  migrateSchema(db)
  seedIfEmpty(db)
  seedProjectFiltersIfEmpty(db)
  seedSettingsIfEmpty(db)

  database = db
  return db
}

/* ------------------------------- Utilities -------------------------------- */

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string' || value.length === 0) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

/** Konversi nilai untuk SQLite: array → JSON string, undefined dibiarkan. */
function toSqliteValue(value: unknown): string | number | null {
  if (value === undefined || value === null) return null
  if (Array.isArray(value)) return JSON.stringify(value.map(String))
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number' || typeof value === 'string') return value
  return JSON.stringify(value)
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/* --------------------------------- Reads ---------------------------------- */

export function getProfile(): Profile | null {
  const row = getDatabase()
    .prepare('SELECT * FROM profile WHERE id = 1')
    .get() as DbRow | undefined

  if (!row) return null

  return {
    id: 1,
    name: String(row.name ?? ''),
    logo: (row.logo as string | null) ?? null,
    greeting: (row.greeting as string | null) ?? null,
    headline: (row.headline as string | null) ?? null,
    short_description: (row.short_description as string | null) ?? null,
    availability: (row.availability as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    education: (row.education as string | null) ?? null,
    major: (row.major as string | null) ?? null,
    focus: parseJsonArray(row.focus),
    status: (row.status as string | null) ?? null,
    photo_url: (row.photo_url as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  }
}

export function listExperience(): Experience[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM experience ORDER BY sort_order, id')
    .all() as DbRow[]

  return rows.map((row) => ({
    id: toNumber(row.id),
    position: String(row.position ?? ''),
    company: String(row.company ?? ''),
    type: String(row.type ?? ''),
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    skills: parseJsonArray(row.skills),
    sort_order: toNumber(row.sort_order),
  }))
}

export function listSkills(): Skill[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM skills ORDER BY sort_order, id')
    .all() as DbRow[]

  return rows.map((row) => ({
    id: toNumber(row.id),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    sort_order: toNumber(row.sort_order),
  }))
}

export function listProjects(): Project[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM projects ORDER BY sort_order, id')
    .all() as DbRow[]

  return rows.map((row) => ({
    id: toNumber(row.id),
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? null,
    full_description: (row.full_description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    tools: parseJsonArray(row.tools),
    url: (row.url as string | null) ?? null,
    github_url: (row.github_url as string | null) ?? null,
    tags: parseJsonArray(row.tags),
    // `published` null (baris lama) dianggap tampil; hanya 0 yang disembunyikan.
    featured: toNumber(row.featured) !== 0,
    published: row.published === null || row.published === undefined
      ? true
      : toNumber(row.published) !== 0,
    sort_order: toNumber(row.sort_order),
  }))
}

/** Daftar filter section Projects, terurut sesuai `sort_order`. */
export function listProjectFilters(): ProjectFilter[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM project_filters ORDER BY sort_order, id')
    .all() as DbRow[]

  return rows.map((row) => ({
    id: toNumber(row.id),
    key: String(row.key ?? ''),
    label: String(row.label ?? ''),
    sort_order: toNumber(row.sort_order),
  }))
}

export function listEducation(): Education[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM education ORDER BY sort_order, id')
    .all() as DbRow[]

  return rows.map((row) => ({
    id: toNumber(row.id),
    institution: String(row.institution ?? ''),
    degree: (row.degree as string | null) ?? null,
    major: (row.major as string | null) ?? null,
    start_year: (row.start_year as string | null) ?? null,
    end_year: (row.end_year as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    sort_order: toNumber(row.sort_order),
  }))
}

export function listContacts(): Contact[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM contacts ORDER BY sort_order, id')
    .all() as DbRow[]

  return rows.map((row) => ({
    id: toNumber(row.id),
    kind: String(row.kind ?? ''),
    label: (row.label as string | null) ?? null,
    value: (row.value as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    sort_order: toNumber(row.sort_order),
  }))
}

export function listSections(): Record<string, string> {
  const rows = getDatabase()
    .prepare('SELECT key, value FROM sections')
    .all() as DbRow[]

  const sections: Record<string, string> = {}
  for (const row of rows) {
    sections[String(row.key)] = String(row.value ?? '')
  }
  return sections
}

/** Pengaturan situs (nama, judul, deskripsi, favicon) dari tabel `settings`. */
export function listSettings(): Record<string, string> {
  const rows = getDatabase()
    .prepare('SELECT key, value FROM settings')
    .all() as DbRow[]

  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[String(row.key)] = String(row.value ?? '')
  }
  return settings
}

/** Semua konten portfolio dalam satu payload untuk halaman publik. */
export function getPortfolio(): PortfolioData {
  return {
    profile: getProfile(),
    experience: listExperience(),
    skills: listSkills(),
    projects: listProjects(),
    project_filters: listProjectFilters(),
    education: listEducation(),
    contacts: listContacts(),
    sections: listSections(),
    settings: listSettings(),
  }
}

/* --------------------------------- Writes --------------------------------- */

/**
 * Simpan pengaturan situs. Hanya key pada `SITE_SETTING_KEYS` yang diterima,
 * dan nilai `undefined` diabaikan sehingga patch parsial tetap aman.
 */
export function updateSettings(patch: Record<string, unknown>): Record<string, string> {
  const statement = getDatabase().prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  )

  for (const key of SITE_SETTING_KEYS) {
    const value = patch[key]
    if (value === undefined) continue
    statement.run(key, value === null ? '' : String(value))
  }

  return listSettings()
}

/* -------------------------------- admin auth ------------------------------- */

/** Jumlah akun admin — dipakai untuk menentukan apakah perlu setup awal. */
export function countAdminUsers(): number {
  const row = getDatabase()
    .prepare('SELECT COUNT(*) AS total FROM admin_users')
    .get() as { total?: unknown } | undefined

  return Number(row?.total ?? 0)
}

function toAdminUser(row: DbRow): AdminUser {
  return { id: toNumber(row.id), email: String(row.email ?? '') }
}

export function createAdminUser(
  email: string,
  passwordHash: string,
): AdminUser {
  const now = new Date().toISOString()
  const result = getDatabase()
    .prepare(
      `INSERT INTO admin_users (email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(email.trim().toLowerCase(), passwordHash, now, now)

  return { id: Number(result.lastInsertRowid), email: email.trim().toLowerCase() }
}

/** Cari akun admin (dengan hash password) untuk proses login. */
export function findAdminUserByEmail(
  email: string,
): (AdminUser & { password_hash: string }) | null {
  const row = getDatabase()
    .prepare('SELECT * FROM admin_users WHERE email = ?')
    .get(email.trim().toLowerCase()) as DbRow | undefined

  if (!row) return null
  return { ...toAdminUser(row), password_hash: String(row.password_hash ?? '') }
}

export function findAdminUserById(id: number): AdminUser | null {
  const row = getDatabase()
    .prepare('SELECT * FROM admin_users WHERE id = ?')
    .get(id) as DbRow | undefined

  return row ? toAdminUser(row) : null
}

/** Ganti hash password satu akun. */
export function updateAdminUserPassword(id: number, hash: string): void {
  getDatabase()
    .prepare(
      'UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?',
    )
    .run(hash, new Date().toISOString(), id)
}

/** Ganti email admin. */
export function updateAdminUserEmail(id: number, email: string): void {
  getDatabase()
    .prepare('UPDATE admin_users SET email = ?, updated_at = ? WHERE id = ?')
    .run(email.trim().toLowerCase(), new Date().toISOString(), id)
}

/** Simpan sesi baru (hash token + masa berlaku). */
export function createAdminSession(
  userId: number,
  tokenHash: string,
  expiresAt: string,
): void {
  const now = new Date().toISOString()

  getDatabase()
    .prepare(
      `INSERT INTO admin_sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(tokenHash, userId, now, expiresAt)
}

/** Cari sesi berdasarkan hash token (baris kedaluwarsa langsung dihapus). */
export function findAdminSession(
  tokenHash: string,
): AdminSessionRecord | null {
  const row = getDatabase()
    .prepare('SELECT * FROM admin_sessions WHERE token_hash = ?')
    .get(tokenHash) as DbRow | undefined

  if (!row) return null

  const expiresAt = (row.expires_at as string | null) ?? null
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
    deleteAdminSession(tokenHash)
    return null
  }

  return {
    token_hash: tokenHash,
    user_id: toNumber(row.user_id),
    created_at: (row.created_at as string | null) ?? null,
    expires_at: expiresAt,
  }
}

/** Perpanjang masa berlaku sesi (sliding expiration). */
export function touchAdminSession(
  tokenHash: string,
  expiresAt: string,
): void {
  getDatabase()
    .prepare('UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?')
    .run(expiresAt, tokenHash)
}

/** Cabut satu sesi (logout). */
export function deleteAdminSession(tokenHash: string): boolean {
  const result = getDatabase()
    .prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
    .run(tokenHash)

  return Number(result.changes) > 0
}

/**
 * Cabut semua sesi satu akun. Bila `keepTokenHash` diisi, sesi tersebut
 * dipertahankan (dipakai saat ganti password agar perangkat ini tetap login).
 */
export function deleteAdminSessionsForUser(
  userId: number,
  keepTokenHash?: string,
): number {
  const db = getDatabase()
  const result = keepTokenHash
    ? db
        .prepare(
          'DELETE FROM admin_sessions WHERE user_id = ? AND token_hash <> ?',
        )
        .run(userId, keepTokenHash)
    : db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(userId)

  return Number(result.changes)
}

/** Jumlah sesi aktif satu akun (untuk ditampilkan di panel Security). */
export function countAdminSessionsForUser(userId: number): number {
  const rows = getDatabase()
    .prepare('SELECT expires_at FROM admin_sessions WHERE user_id = ?')
    .all(userId) as DbRow[]

  const now = Date.now()
  return rows.filter(
    (row) => Date.parse(String(row.expires_at ?? '')) > now,
  ).length
}

export function updateProfile(patch: Record<string, unknown>): Profile | null {
  const entries = Object.entries(patch).filter(([key]) =>
    (PROFILE_COLUMNS as readonly string[]).includes(key),
  )

  if (entries.length > 0) {
    const assignments = entries.map(([key]) => `${key} = ?`).join(', ')
    // `focus` (array) otomatis disimpan sebagai JSON oleh toSqliteValue.
    const values = entries.map(([, value]) => toSqliteValue(value))

    getDatabase()
      .prepare(
        `UPDATE profile SET ${assignments}, updated_at = ? WHERE id = 1`,
      )
      .run(...values, new Date().toISOString())
  }

  return getProfile()
}

export function listCollection<K extends CollectionName>(
  collection: K,
): CollectionItemMap[K][] {
  switch (collection) {
    case 'experience':
      return listExperience() as CollectionItemMap[K][]
    case 'skills':
      return listSkills() as CollectionItemMap[K][]
    case 'projects':
      return listProjects() as CollectionItemMap[K][]
    case 'project_filters':
      return listProjectFilters() as CollectionItemMap[K][]
    case 'education':
      return listEducation() as CollectionItemMap[K][]
    case 'contacts':
      return listContacts() as CollectionItemMap[K][]
    default:
      return []
  }
}

export function getCollectionItem<K extends CollectionName>(
  collection: K,
  id: number,
): CollectionItemMap[K] | null {
  const config = COLLECTIONS[collection]
  const row = getDatabase()
    .prepare(`SELECT * FROM ${config.table} WHERE id = ?`)
    .get(id) as DbRow | undefined

  if (!row) return null

  const items = listCollection(collection)
  return items.find((item) => item.id === id) ?? null
}

export function createCollectionItem<K extends CollectionName>(
  collection: K,
  payload: Record<string, unknown>,
): CollectionItemMap[K] {
  const config = COLLECTIONS[collection]
  const columns = config.columns.filter((column) => column in payload)

  if (columns.length === 0) {
    throw new Error('Tidak ada kolom yang bisa disimpan pada payload ini.')
  }

  const placeholders = columns.map(() => '?').join(', ')
  const values = columns.map((column) => toSqliteValue(payload[column]))

  const result = getDatabase()
    .prepare(
      `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders})`,
    )
    .run(...values)

  const createdId = Number(result.lastInsertRowid)
  const created = getCollectionItem(collection, createdId)

  if (!created) throw new Error('Data gagal dibaca setelah disimpan.')
  return created
}

export function updateCollectionItem<K extends CollectionName>(
  collection: K,
  id: number,
  patch: Record<string, unknown>,
): CollectionItemMap[K] | null {
  const config = COLLECTIONS[collection]
  const columns = config.columns.filter((column) => column in patch)

  if (columns.length === 0) return getCollectionItem(collection, id)

  const assignments = columns.map((column) => `${column} = ?`).join(', ')
  const values = columns.map((column) => toSqliteValue(patch[column]))

  getDatabase()
    .prepare(`UPDATE ${config.table} SET ${assignments} WHERE id = ?`)
    .run(...values, id)

  return getCollectionItem(collection, id)
}

export function deleteCollectionItem(
  collection: CollectionName,
  id: number,
): boolean {
  const config = COLLECTIONS[collection]
  const result = getDatabase()
    .prepare(`DELETE FROM ${config.table} WHERE id = ?`)
    .run(id)

  return Number(result.changes) > 0
}

export function updateSection(key: string, value: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO sections (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value)
}

export function updateSections(texts: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(texts)) {
    if (typeof value === 'string') updateSection(key, value)
  }
}
