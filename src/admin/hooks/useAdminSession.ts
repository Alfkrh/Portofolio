/**
 * Hook sesi admin: membaca snapshot dari `sessionStore` dan menyediakan aksi
 * login (email + password), setup akun pertama, dan logout.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  createFirstAdmin,
  getAdminSessionSnapshot,
  loadAdminSession,
  signOutAdmin,
  signOutEverywhere,
  subscribeAdminSession,
  loginWithPassword,
  type AdminSessionSnapshot,
} from '../sessionStore'

export interface UseAdminSessionResult extends AdminSessionSnapshot {
  isRetrying: boolean
  reload: () => Promise<void>
  /** Login akun admin. Mengembalikan pesan galat, atau `null` bila berhasil. */
  login: (email: string, password: string) => Promise<string | null>
  /** Buat akun admin pertama (saat belum ada akun di database). */
  setup: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  /** Akhiri semua sesi di semua perangkat. */
  logoutAll: () => Promise<string | null>
}

export function useAdminSession(): UseAdminSessionResult {
  const snapshot = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSessionSnapshot,
    getAdminSessionSnapshot,
  )

  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    void loadAdminSession()
  }, [])

  const reload = useCallback(async () => {
    setIsRetrying(true)
    try {
      await loadAdminSession()
    } finally {
      setIsRetrying(false)
    }
  }, [])

  const login = useCallback(
    (email: string, password: string) => loginWithPassword(email, password),
    [],
  )

  const setup = useCallback(
    (email: string, password: string) => createFirstAdmin(email, password),
    [],
  )

  const logout = useCallback(() => signOutAdmin(), [])

  const logoutAll = useCallback(() => signOutEverywhere(), [])

  return { ...snapshot, isRetrying, reload, login, setup, logout, logoutAll }
}
