/**
 * Klien API portfolio.
 *
 * Backend (Express + Prisma) membalas setiap request dengan amplop yang sama:
 *
 *   sukses  → { success: true,  message, data }
 *   gagal   → { success: false, message, errors?: [{ field, message }] }
 *
 * Halaman publik hanya memakai fungsi baca + upload foto, sedangkan fungsi
 * koleksi (create/update/delete) sudah disiapkan untuk admin dashboard.
 *
 * Base URL bisa di-override lewat env `VITE_API_BASE` bila API tidak berada di
 * origin yang sama (lihat `src/config/apiBase.ts`).
 *
 * ---------------------------------------------------------------------------
 * Catatan penerjemahan
 *
 * Tipe konten di frontend (`src/types/portfolio.ts`) sengaja TIDAK diubah, agar
 * seluruh komponen tidak perlu ikut diubah. Perbedaan penamaan dengan backend
 * diselesaikan di file ini saja:
 *
 *   - `contacts`  → resource `/social-links` (field `kind` → `platform`)
 *   - `experience`→ resource `/experiences`
 *   - `project_filters` → resource `/project-filters`
 *   - agregat `/portfolio` memakai kunci `experiences` & `social_links`
 *
 * Semua penulisan data (POST/PUT/DELETE) melewati `/admin/...` supaya tidak ada
 * satu pun endpoint tulis yang terbuka tanpa login.
 * ---------------------------------------------------------------------------
 */

import { API_BASE } from '../config/apiBase'
import type {
  CollectionItemMap,
  CollectionName,
  Contact,
  ContactMessage,
  PortfolioData,
  Profile,
  SectionTexts,
  SiteSettings,
} from '../types/portfolio'
import { clearAdminToken, getAdminSessionExpiry, getAdminToken } from './adminToken'

/** Satu galat validasi dari server. */
export interface ApiFieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  /** Galat per-field (diisi server saat validasi gagal). */
  readonly errors: ApiFieldError[]

  constructor(message: string, status: number, errors: ApiFieldError[] = []) {
    // Pesan bisa datang dari body respons yang tidak kita duga (mis. server
    // membalas `{ "error": { ... } }`). Tanpa guard ini, `Error` akan
    // mencoerce-nya menjadi teks "[object Object]" yang tak berguna di UI.
    super(
      typeof message === 'string' && message.trim().length > 0
        ? message
        : `Permintaan gagal (${status}).`,
    )
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

/* ------------------------ amplop respons & galat ------------------------- */

interface Envelope<T> {
  success: boolean
  message?: unknown
  data: T
  errors?: ApiFieldError[]
}

/** Amplop dikenali dari dua penanda yang selalu ada bersamaan. */
function isEnvelope(payload: unknown): payload is Envelope<unknown> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    'data' in payload
  )
}

/** Ambil daftar galat per-field bila bentuknya sesuai. */
function readFieldErrors(payload: unknown): ApiFieldError[] {
  if (typeof payload !== 'object' || payload === null) return []
  const raw = (payload as { errors?: unknown }).errors
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const { field, message } = item as { field?: unknown; message?: unknown }
      if (typeof message !== 'string') return null
      return { field: typeof field === 'string' ? field : '', message }
    })
    .filter((item): item is ApiFieldError => item !== null)
}

/**
 * Susun pesan galat dari body respons apa pun bentuknya.
 *
 * Diterima: `{ message }` (backend baru), `{ error: "..." }` , `{ error: { message } }`
 * (mis. balasan 404 milik Vercel), dan `{ errors: [...] }`. Kalau tidak ada yang
 * cocok, pesan cadangan yang dipakai — tidak pernah menghasilkan "[object Object]".
 */
function readErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) return fallback
  const record = payload as Record<string, unknown>

  if (typeof record.message === 'string' && record.message.trim().length > 0) {
    return record.message
  }

  const error = record.error
  if (typeof error === 'string' && error.trim().length > 0) return error
  if (typeof error === 'object' && error !== null) {
    const nested = (error as { message?: unknown }).message
    if (typeof nested === 'string' && nested.trim().length > 0) return nested
  }

  return readFieldErrors(payload)[0]?.message ?? fallback
}

/* -------------------------------- request -------------------------------- */

/**
 * Kirim satu request ke API dan kembalikan isi `data` dari amplopnya.
 * Melempar `ApiError` bila server menjawab di luar 2xx.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')

  const adminToken = getAdminToken()
  if (adminToken) headers.set('authorization', `Bearer ${adminToken}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(
      'Tidak bisa terhubung ke server portfolio. Pastikan backend berjalan.',
      0,
    )
  }

  if (!response.ok) {
    // Sesi kedaluwarsa/dicabut di server → bersihkan token di browser supaya
    // dashboard kembali ke gerbang login.
    if (response.status === 401 && getAdminToken()) clearAdminToken()

    const fallback = `Permintaan gagal (${response.status}).`

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      // Body bukan JSON — pakai pesan default.
      throw new ApiError(fallback, response.status)
    }

    throw new ApiError(
      readErrorMessage(payload, fallback),
      response.status,
      readFieldErrors(payload),
    )
  }

  if (response.status === 204) return undefined as T

  const payload = (await response.json()) as unknown
  return (isEnvelope(payload) ? payload.data : payload) as T
}

/** Request tanpa amplop (mis. balasan 200 tanpa body bermakna). */
function requestVoid(path: string, init: RequestInit = {}): Promise<void> {
  return request<void>(path, init).then(() => undefined)
}

function jsonBody(value: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  }
}

/* --------------------- pemetaan resource & nama field -------------------- */

/** Nama resource di URL API untuk tiap koleksi frontend. */
const RESOURCE_PATH: Record<CollectionName, string> = {
  experience: 'experiences',
  skills: 'skills',
  projects: 'projects',
  project_filters: 'project-filters',
  education: 'education',
  contacts: 'social-links',
}

/** Nama field saat dikirim KE server. */
const FIELD_TO_API: Partial<Record<CollectionName, Record<string, string>>> = {
  contacts: { kind: 'platform' },
}

/** Nama field saat diterima DARI server. */
const FIELD_FROM_API: Partial<Record<CollectionName, Record<string, string>>> = {
  contacts: { platform: 'kind' },
}

function renameKeys(
  item: Record<string, unknown>,
  map: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!map) return item
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(item)) {
    result[map[key] ?? key] = value
  }
  return result
}

function toApiPayload(
  collection: CollectionName,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return renameKeys(payload, FIELD_TO_API[collection])
}

function fromApiItem<K extends CollectionName>(
  collection: K,
  raw: unknown,
): CollectionItemMap[K] {
  const item = (raw ?? {}) as Record<string, unknown>
  // Cast lewat `unknown`: bentuk item berasal dari server, bukan dari tipe
  // generik yang tidak bisa diturunkan dari nama koleksi dinamis.
  return renameKeys(item, FIELD_FROM_API[collection]) as unknown as CollectionItemMap[K]
}

/* ------------------------------ public reads ----------------------------- */

/** Bentuk mentah `/portfolio` — kunci backend, sebelum diterjemahkan. */
interface RawPortfolio {
  profile?: Profile | null
  experiences?: CollectionItemMap['experience'][]
  social_links?: Contact[]
  skills?: CollectionItemMap['skills'][]
  projects?: CollectionItemMap['projects'][]
  project_filters?: CollectionItemMap['project_filters'][]
  education?: CollectionItemMap['education'][]
  sections?: SectionTexts
  settings?: SiteSettings
}

/**
 * Ubah payload agregat backend menjadi `PortfolioData` yang dipakai komponen.
 * Daftar `?? []` penting: halaman harus tetap bisa dirender walau satu bagian
 * belum punya data sama sekali.
 */
function toPortfolioData(raw: RawPortfolio | null): PortfolioData {
  const source = raw ?? {}

  return {
    profile: source.profile ?? null,
    experience: source.experiences ?? [],
    skills: source.skills ?? [],
    projects: source.projects ?? [],
    project_filters: source.project_filters ?? [],
    education: source.education ?? [],
    contacts: (source.social_links ?? []).map(
      (item) => fromApiItem('contacts', item) as Contact,
    ),
    sections: source.sections ?? {},
    settings: source.settings ?? {},
  }
}

export async function fetchPortfolio(signal?: AbortSignal): Promise<PortfolioData> {
  return toPortfolioData(await request<RawPortfolio | null>('/portfolio', { signal }))
}

export function fetchProfile(signal?: AbortSignal): Promise<Profile | null> {
  return request<Profile | null>('/profile', { signal })
}

export function fetchSections(signal?: AbortSignal): Promise<SectionTexts> {
  return request<SectionTexts>('/sections', { signal })
}

/* --------------------------------- writes -------------------------------- */

export async function updateProfile(
  patch: Partial<Omit<Profile, 'id' | 'updated_at'>>,
): Promise<{ profile: Profile | null }> {
  const profile = await request<Profile | null>('/admin/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return { profile }
}

export function updateSections(texts: SectionTexts): Promise<SectionTexts> {
  return request<SectionTexts>('/admin/sections', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(texts),
  })
}

export function updateSettings(
  patch: Record<string, string>,
): Promise<Record<string, string>> {
  return request<Record<string, string>>('/admin/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

/* --------------------------------- uploads ------------------------------- */

/**
 * Upload berkas gambar (dipakai foto profil & thumbnail project).
 *
 * Berkas dikirim sebagai multipart dengan nama field `file` — bukan lagi raw
 * body seperti backend lama, supaya server bisa memvalidasi tipe & ukurannya.
 */
export function uploadImage(file: Blob, fileName?: string): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file, fileName && fileName.length > 0 ? fileName : 'upload')
  return request<{ url: string }>('/admin/uploads', { method: 'POST', body: form })
}

/** Upload foto profil lalu simpan URL-nya ke profil. */
export async function uploadProfilePhoto(
  file: Blob,
): Promise<{ profile: Profile | null }> {
  const { url } = await uploadImage(file, 'profile-photo')
  return updateProfile({ photo_url: url })
}

/** Hapus foto profil (berkasnya dibiarkan di server, hanya rujukannya dibuang). */
export function deleteProfilePhoto(): Promise<{ profile: Profile | null }> {
  return updateProfile({ photo_url: null })
}

/* ------------------------------- contact form ---------------------------- */

/** Hasil pengiriman form kontak: id pesan yang tersimpan. */
export interface ContactSubmitResult {
  id: number
  created_at: string | null
}

/**
 * Kirim pesan dari form Contact halaman publik. Satu-satunya endpoint tulis
 * yang tidak memerlukan login — server tetap membatasi jumlah kiriman per IP.
 */
export function sendContactMessage(input: {
  name: string
  email: string
  message: string
}): Promise<ContactSubmitResult> {
  return request<ContactSubmitResult>('/contact', jsonBody(input))
}

/* ---------------------------- contact messages --------------------------- */

/** Hasil pembacaan inbox: daftar pesan + jumlah yang belum dibaca. */
export interface ContactMessagesResult {
  messages: ContactMessage[]
  unread: number
}

/** Daftar pesan masuk (khusus admin). */
export function fetchContactMessages(
  signal?: AbortSignal,
): Promise<ContactMessagesResult> {
  return request<ContactMessagesResult>('/admin/contact-messages', { signal })
}

/** Tandai satu pesan sudah/belum dibaca. */
export function setContactMessageRead(
  id: number,
  isRead: boolean,
): Promise<ContactMessage> {
  return request<ContactMessage>(`/admin/contact-messages/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ is_read: isRead }),
  })
}

/** Hapus satu pesan masuk. */
export function deleteContactMessage(id: number): Promise<{ id: number }> {
  return request<{ id: number }>(`/admin/contact-messages/${id}`, {
    method: 'DELETE',
  })
}

/* ------------------------------ admin session ---------------------------- */

/** Bentuk mentah `/auth/me` dari backend. */
interface RawSession {
  authenticated?: boolean
  setupRequired?: boolean
  email?: string | null
  role?: string | null
  activeSessions?: number
}

/** Status login admin, dipakai dashboard sebagai gerbang akses. */
export interface AdminSession {
  /** `true` bila belum ada akun admin — dashboard menampilkan form setup awal. */
  setupRequired: boolean
  /** `true` bila request ini membawa sesi login yang valid. */
  authenticated: boolean
  email: string | null
  /**
   * Role akun yang login. Hanya `'admin'` yang boleh membuka dashboard; akun
   * terautentikasi dengan role lain ditolak dengan halaman Access Denied.
   */
  role: string | null
  expiresAt: string | null
  authMode: 'session' | 'none'
  /** Jumlah sesi aktif akun ini (hanya diisi saat login memakai akun). */
  activeSessions: number
}

/** Kredensial hasil login/setup: token sesi + email + masa berlakunya. */
export interface AdminAuthResult {
  token: string
  expiresAt: string
  email: string
}

/**
 * Cek status login (dan apakah setup awal masih diperlukan).
 *
 * Backend tidak mengirim waktu kedaluwarsa sesi per-request; nilainya dibaca
 * dari yang tersimpan di browser saat login, dan tetap diverifikasi server
 * lewat token pada setiap penulisan data.
 */
export async function fetchSession(signal?: AbortSignal): Promise<AdminSession> {
  const raw = await request<RawSession>('/auth/me', { signal })

  return {
    setupRequired: raw.setupRequired === true,
    authenticated: raw.authenticated === true,
    email: raw.email ?? null,
    role: raw.role ?? null,
    expiresAt: raw.authenticated ? getAdminSessionExpiry() : null,
    authMode: raw.authenticated ? 'session' : 'none',
    activeSessions: raw.activeSessions ?? 0,
  }
}

/** Login dengan akun admin. */
export function loginAdmin(
  email: string,
  password: string,
): Promise<AdminAuthResult> {
  return request<AdminAuthResult>('/auth/login', jsonBody({ email, password }))
}

/** Buat akun admin pertama (hanya bisa bila belum ada akun sama sekali). */
export function setupAdminAccount(
  email: string,
  password: string,
): Promise<AdminAuthResult> {
  return request<AdminAuthResult>('/auth/setup', jsonBody({ email, password }))
}

/** Cabut sesi di server (logout). */
export function logoutAdmin(): Promise<void> {
  return requestVoid('/auth/logout', { method: 'POST' })
}

/** Cabut semua sesi akun (logout dari semua perangkat). */
export function logoutAllSessions(): Promise<{ revoked: number }> {
  return request<{ revoked: number }>('/auth/logout-all', { method: 'POST' })
}

/** Ganti password admin (wajib menyertakan password saat ini). */
export function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ revoked: number }> {
  return request<{ revoked: number }>(
    '/auth/password',
    jsonBody({ current_password: currentPassword, new_password: newPassword }),
  )
}

/** Ganti email admin (wajib menyertakan password saat ini). */
export function changeAdminEmail(
  currentPassword: string,
  email: string,
): Promise<{ email: string }> {
  return request<{ email: string }>(
    '/auth/email',
    jsonBody({ current_password: currentPassword, email }),
  )
}

/* --------------------------- koleksi (admin) ----------------------------- */

export type CollectionPayload<K extends CollectionName> = Partial<
  Omit<CollectionItemMap[K], 'id'>
>

/** Daftar isi satu koleksi — termasuk yang belum dipublikasikan (khusus admin). */
export async function listCollection<K extends CollectionName>(
  collection: K,
  signal?: AbortSignal,
): Promise<CollectionItemMap[K][]> {
  const path = RESOURCE_PATH[collection]
  const items = await request<CollectionItemMap[K][]>(`/admin/${path}`, { signal })
  return items.map((item) => fromApiItem(collection, item))
}

export async function createItem<K extends CollectionName>(
  collection: K,
  payload: CollectionPayload<K>,
): Promise<CollectionItemMap[K]> {
  const path = RESOURCE_PATH[collection]
  const item = await request<CollectionItemMap[K]>(
    `/admin/${path}`,
    jsonBody(toApiPayload(collection, payload as Record<string, unknown>)),
  )
  return fromApiItem(collection, item)
}

export async function updateItem<K extends CollectionName>(
  collection: K,
  id: number,
  payload: CollectionPayload<K>,
): Promise<CollectionItemMap[K]> {
  const path = RESOURCE_PATH[collection]
  const item = await request<CollectionItemMap[K]>(`/admin/${path}/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(toApiPayload(collection, payload as Record<string, unknown>)),
  })
  return fromApiItem(collection, item)
}

export async function deleteItem(
  collection: CollectionName,
  id: number,
): Promise<{ id: number }> {
  const path = RESOURCE_PATH[collection]
  return request<{ id: number }>(`/admin/${path}/${id}`, { method: 'DELETE' })
}
