/**
 * Store konten portfolio (sumber data eksternal untuk React).
 *
 * Data disimpan di luar React sehingga:
 *  - beberapa komponen bisa berbagi satu snapshot tanpa fetch berulang,
 *  - request yang sedang berjalan otomatis dibatalkan saat ada request baru,
 *  - halaman bisa memuat ulang data (mis. setelah admin mengubah sesuatu)
 *    tanpa `setState` di dalam effect.
 */

import { fetchPortfolio } from './portfolioApi'
import type { PortfolioData } from '../types/portfolio'

export type PortfolioStatus = 'loading' | 'ready' | 'error'

export interface PortfolioSnapshot {
  status: PortfolioStatus
  data: PortfolioData | null
  error: string | null
}

const initialSnapshot: PortfolioSnapshot = {
  status: 'loading',
  data: null,
  error: null,
}

let snapshot: PortfolioSnapshot = initialSnapshot
let inflight: AbortController | null = null

const listeners = new Set<() => void>()

function setSnapshot(next: PortfolioSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

function toMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Konten portfolio gagal dimuat dari server.'
}

export function subscribePortfolio(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPortfolioSnapshot(): PortfolioSnapshot {
  return snapshot
}

/** Ambil konten terbaru dari API (menggantikan request yang sedang jalan). */
export async function loadPortfolio(): Promise<void> {
  inflight?.abort()
  const controller = new AbortController()
  inflight = controller

  try {
    const data = await fetchPortfolio(controller.signal)
    if (controller.signal.aborted) return
    setSnapshot({ status: 'ready', data, error: null })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    if (controller.signal.aborted) return

    // Bila data lama masih ada, tetap tampilkan halaman dengan pesan galat.
    setSnapshot({
      status: snapshot.data ? 'ready' : 'error',
      data: snapshot.data,
      error: toMessage(cause),
    })
  }
}

/**
 * Muat ulang konten saat tab kembali aktif/fokus, sehingga perubahan yang
 * dilakukan admin langsung terlihat tanpa reload manual.
 */
export function watchPortfolioRefresh(): () => void {
  const onFocus = () => void loadPortfolio()
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void loadPortfolio()
  }

  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
