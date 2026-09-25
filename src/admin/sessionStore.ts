/**
 * Store status login admin (di luar React, sama seperti `portfolioStore`).
 *
 * Menyimpan snapshot sesi (sudah login / belum, akun siapa, kapan berakhir)
 * dan menyediakan aksi login, setup awal, logout, dan logout semua perangkat.
 */

import { clearAdminToken, setAdminSession } from '../services/adminToken'
import {
  fetchSession,
  loginAdmin as loginRequest,
  logoutAdmin,
  logoutAllSessions,
  setupAdminAccount,
  type AdminSession,
} from '../services/portfolioApi'

export type AdminSessionStatus = 'loading' | 'ready' | 'error'

export interface AdminSessionSnapshot {
  status: AdminSessionStatus
  session: AdminSession | null
  error: string | null
}

let snapshot: AdminSessionSnapshot = {
  status: 'loading',
  session: null,
  error: null,
}

const listeners = new Set<() => void>()

function setSnapshot(next: AdminSessionSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

export function subscribeAdminSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAdminSessionSnapshot(): AdminSessionSnapshot {
  return snapshot
}

/** Baca status login dari server (memakai token yang tersimpan, bila ada). */
export async function loadAdminSession(): Promise<void> {
  try {
    const session = await fetchSession()
    setSnapshot({ status: 'ready', session, error: null })
  } catch (cause) {
    setSnapshot({
      status: 'error',
      session: snapshot.session,
      error:
        cause instanceof Error
          ? cause.message
          : 'Status admin tidak bisa diperiksa.',
    })
  }
}

/** Simpan token sesi lalu segerakan status login dari server. */
async function persistSession(
  request: ReturnType<typeof loginRequest>,
): Promise<string | null> {
  try {
    const result = await request
    setAdminSession(result.token, result.expiresAt)
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'Login gagal.'
  }

  // Ambil snapshot terbaru supaya dashboard langsung memakai data server.
  await loadAdminSession()

  if (!getSessionAuthenticated()) {
    clearAdminToken()
    return 'Sesi tidak bisa diverifikasi oleh server.'
  }

  return null
}

function getSessionAuthenticated(): boolean {
  return snapshot.session?.authenticated === true
}

/** Login dengan email + password. Mengembalikan pesan galat, atau `null`. */
export function loginWithPassword(
  email: string,
  password: string,
): Promise<string | null> {
  return persistSession(loginRequest(email, password))
}

/** Buat akun admin pertama (hanya tersedia saat belum ada akun). */
export function createFirstAdmin(
  email: string,
  password: string,
): Promise<string | null> {
  return persistSession(setupAdminAccount(email, password))
}

/** Logout: cabut sesi di server, lalu bersihkan token di browser. */
export async function signOutAdmin(): Promise<void> {
  try {
    await logoutAdmin()
  } catch {
    // Sesi mungkin sudah kedaluwarsa di server — tetap bersihkan browser.
  }

  clearAdminToken()
  await loadAdminSession()
}

/** Cabut semua sesi akun (semua perangkat, termasuk yang ini). */
export async function signOutEverywhere(): Promise<string | null> {
  try {
    await logoutAllSessions()
  } catch (cause) {
    return cause instanceof Error
      ? cause.message
      : 'Gagal mengakhiri semua sesi.'
  }

  clearAdminToken()
  await loadAdminSession()
  return null
}
