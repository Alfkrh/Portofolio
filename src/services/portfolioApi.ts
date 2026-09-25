/**
 * Klien API portfolio.
 *
 * Halaman publik hanya memakai fungsi baca + upload foto, sedangkan fungsi
 * koleksi (create/update/delete) sudah disiapkan untuk admin dashboard.
 *
 * Base URL bisa di-override lewat env `VITE_API_BASE` bila API tidak berada di
 * origin yang sama.
 */

import type {
  CollectionItemMap,
  CollectionName,
  PortfolioData,
  Profile,
} from '../types/portfolio'
import { clearAdminToken, getAdminToken } from './adminToken'

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

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

    let message = `Permintaan gagal (${response.status}).`
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) message = payload.error
    } catch {
      // Body bukan JSON — pakai pesan default.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/* ------------------------------ public reads ------------------------------ */

export function fetchPortfolio(signal?: AbortSignal): Promise<PortfolioData> {
  return request<PortfolioData>('/portfolio', { signal })
}

export function fetchProfile(signal?: AbortSignal): Promise<Profile | null> {
  return request<Profile | null>('/profile', { signal })
}

export function fetchSections(signal?: AbortSignal): Promise<Record<string, string>> {
  return request<Record<string, string>>('/sections', { signal })
}

/* --------------------------------- writes --------------------------------- */

export function updateProfile(
  patch: Partial<Omit<Profile, 'id' | 'updated_at'>>,
): Promise<{ profile: Profile | null }> {
  return request<{ profile: Profile | null }>('/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

/* --------------------------------- uploads -------------------------------- */

/** Upload file gambar mentah (dipakai foto profil & thumbnail project). */
export function uploadImage(
  file: Blob,
  fileName?: string,
): Promise<{ url: string }> {
  const headers: Record<string, string> = {
    'content-type': file.type || 'image/png',
  }
  if (fileName) headers['x-file-name'] = fileName

  return request<{ url: string }>('/uploads', {
    method: 'POST',
    headers,
    body: file,
  })
}

/** Upload foto profil sekaligus menyimpannya ke profile. */
export function uploadProfilePhoto(
  file: Blob,
): Promise<{ profile: Profile | null }> {
  return request<{ profile: Profile | null }>('/profile/photo', {
    method: 'POST',
    headers: { 'content-type': file.type || 'image/png' },
    body: file,
  })
}

export function deleteProfilePhoto(): Promise<{ profile: Profile | null }> {
  return request<{ profile: Profile | null }>('/profile/photo', {
    method: 'DELETE',
  })
}

export function updateSections(
  texts: Record<string, string>,
): Promise<Record<string, string>> {
  return request<Record<string, string>>('/sections', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(texts),
  })
}

export type CollectionPayload<K extends CollectionName> = Partial<
  Omit<CollectionItemMap[K], 'id'>
>

/* ------------------------------ admin session ----------------------------- */

/** Status login admin, dipakai dashboard sebagai gerbang akses. */
export interface AdminSession {
  /** `true` bila belum ada akun admin — dashboard menampilkan form setup awal. */
  setupRequired: boolean
  /** `true` bila request ini membawa sesi login (atau token env) yang valid. */
  authenticated: boolean
  email: string | null
  expiresAt: string | null
  authMode: 'session' | 'env-token' | 'none'
  /** Jumlah sesi aktif akun ini (hanya diisi saat login memakai akun). */
  activeSessions: number
}

/** Kredensial hasil login/setup: token sesi + masa berlakunya. */
export interface AdminAuthResult {
  token: string
  expiresAt: string
  email: string
}

/** Cek status login (dan apakah setup awal masih diperlukan). */
export function fetchSession(signal?: AbortSignal): Promise<AdminSession> {
  return request<AdminSession>('/session', { signal })
}

/** Login dengan akun admin. */
export function loginAdmin(
  email: string,
  password: string,
): Promise<AdminAuthResult> {
  return request<AdminAuthResult>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

/** Buat akun admin pertama (hanya bisa bila belum ada akun sama sekali). */
export function setupAdminAccount(
  email: string,
  password: string,
): Promise<AdminAuthResult> {
  return request<AdminAuthResult>('/auth/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

/** Cabut sesi di server (logout). */
export function logoutAdmin(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/auth/logout', { method: 'POST' })
}

/** Cabut semua sesi akun (logout dari semua perangkat). */
export function logoutAllSessions(): Promise<{
  success: boolean
  revoked: number
}> {
  return request<{ success: boolean; revoked: number }>('/auth/logout-all', {
    method: 'POST',
  })
}

/** Ganti password admin (wajib menyertakan password saat ini). */
export function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; revoked: number }> {
  return request<{ success: boolean; revoked: number }>('/auth/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

/** Ganti email admin (wajib menyertakan password saat ini). */
export function changeAdminEmail(
  currentPassword: string,
  email: string,
): Promise<{ success: boolean; email: string }> {
  return request<{ success: boolean; email: string }>('/auth/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword, email }),
  })
}

/* -------------------------------- settings -------------------------------- */

/** Simpan pengaturan situs (nama, judul, deskripsi, favicon). */
export function updateSettings(
  patch: Record<string, string>,
): Promise<Record<string, string>> {
  return request<Record<string, string>>('/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export function listCollection<K extends CollectionName>(
  collection: K,
  signal?: AbortSignal,
): Promise<CollectionItemMap[K][]> {
  return request<CollectionItemMap[K][]>(`/${collection}`, { signal })
}

export function createItem<K extends CollectionName>(
  collection: K,
  payload: CollectionPayload<K>,
): Promise<CollectionItemMap[K]> {
  return request<CollectionItemMap[K]>(`/${collection}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateItem<K extends CollectionName>(
  collection: K,
  id: number,
  payload: CollectionPayload<K>,
): Promise<CollectionItemMap[K]> {
  return request<CollectionItemMap[K]>(`/${collection}/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteItem(
  collection: CollectionName,
  id: number,
): Promise<{ success: boolean; id: number }> {
  return request<{ success: boolean; id: number }>(`/${collection}/${id}`, {
    method: 'DELETE',
  })
}
