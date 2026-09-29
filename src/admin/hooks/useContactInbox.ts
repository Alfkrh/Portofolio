/**
 * Hook inbox pesan Contact: membaca snapshot dari `contactInboxStore` dan
 * menyediakan aksi tandai dibaca serta hapus.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  getContactInboxSnapshot,
  loadContactInbox,
  markContactMessage,
  removeContactMessage,
  subscribeContactInbox,
  type ContactInboxSnapshot,
} from '../contactInboxStore'

export interface UseContactInboxResult extends ContactInboxSnapshot {
  /** `true` saat daftar sedang dimuat ulang manual. */
  isRefreshing: boolean
  reload: () => Promise<void>
  /** Tandai sudah/belum dibaca. Mengembalikan galat, atau `null` bila berhasil. */
  markRead: (id: number, isRead: boolean) => Promise<string | null>
  /** Hapus satu pesan. Mengembalikan galat, atau `null` bila berhasil. */
  remove: (id: number) => Promise<string | null>
}

export function useContactInbox(): UseContactInboxResult {
  const snapshot = useSyncExternalStore(
    subscribeContactInbox,
    getContactInboxSnapshot,
    getContactInboxSnapshot,
  )

  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    void loadContactInbox()
  }, [])

  const reload = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await loadContactInbox()
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const markRead = useCallback(
    (id: number, isRead: boolean) => markContactMessage(id, isRead),
    [],
  )

  const remove = useCallback((id: number) => removeContactMessage(id), [])

  return { ...snapshot, isRefreshing, reload, markRead, remove }
}
