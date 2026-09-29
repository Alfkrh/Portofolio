/**
 * Store pesan masuk dari form Contact (di luar React, sama seperti
 * `sessionStore` dan `portfolioStore`).
 *
 * Halaman Contact memakainya untuk membaca inbox dari endpoint admin
 * `/api/contact-messages`, menandai pesan sudah/belum dibaca, dan menghapusnya.
 */

import {
  deleteContactMessage as deleteRequest,
  fetchContactMessages,
  setContactMessageRead as setReadRequest,
} from '../services/portfolioApi'
import type { ContactMessage } from '../types/portfolio'

export type ContactInboxStatus = 'loading' | 'ready' | 'error'

export interface ContactInboxSnapshot {
  status: ContactInboxStatus
  messages: ContactMessage[]
  unread: number
  error: string | null
}

let snapshot: ContactInboxSnapshot = {
  status: 'loading',
  messages: [],
  unread: 0,
  error: null,
}

const listeners = new Set<() => void>()

function setSnapshot(next: ContactInboxSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

export function subscribeContactInbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getContactInboxSnapshot(): ContactInboxSnapshot {
  return snapshot
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

/** Susun ulang snapshot dari daftar pesan terbaru. */
function applyMessages(
  messages: ContactMessage[],
  status: ContactInboxStatus = 'ready',
): void {
  setSnapshot({
    status,
    messages,
    unread: messages.filter((message) => !message.is_read).length,
    error: null,
  })
}

/** Ambil daftar pesan dari server (pesan terbaru lebih dulu). */
export async function loadContactInbox(): Promise<void> {
  try {
    const result = await fetchContactMessages()
    setSnapshot({
      status: 'ready',
      messages: result.messages,
      unread: result.unread,
      error: null,
    })
  } catch (cause) {
    // Daftar yang sudah tampil dibiarkan; hanya pesan galatnya yang berubah.
    setSnapshot({
      ...snapshot,
      status: 'error',
      error: errorMessage(cause, 'Pesan masuk gagal dimuat.'),
    })
  }
}

/**
 * Tandai satu pesan sudah/belum dibaca.
 * Mengembalikan pesan galat, atau `null` bila berhasil.
 */
export async function markContactMessage(
  id: number,
  isRead: boolean,
): Promise<string | null> {
  try {
    const updated = await setReadRequest(id, isRead)
    applyMessages(
      snapshot.messages.map((message) =>
        message.id === updated.id ? updated : message,
      ),
    )
    return null
  } catch (cause) {
    return errorMessage(cause, 'Status pesan gagal diubah.')
  }
}

/** Hapus satu pesan. Mengembalikan pesan galat, atau `null` bila berhasil. */
export async function removeContactMessage(id: number): Promise<string | null> {
  try {
    await deleteRequest(id)
    applyMessages(snapshot.messages.filter((message) => message.id !== id))
    return null
  } catch (cause) {
    return errorMessage(cause, 'Pesan gagal dihapus.')
  }
}
