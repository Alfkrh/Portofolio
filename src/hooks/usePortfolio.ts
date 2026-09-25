import { useEffect, useSyncExternalStore } from 'react'
import {
  getPortfolioSnapshot,
  loadPortfolio,
  subscribePortfolio,
  watchPortfolioRefresh,
  type PortfolioSnapshot,
} from '../services/portfolioStore'

export interface UsePortfolioResult extends PortfolioSnapshot {
  /** Ambil ulang konten dari server (dipakai setelah data diubah). */
  reload: () => Promise<void>
}

/**
 * Mengambil konten portfolio dari store, memicunya sekali saat halaman dibuka,
 * dan menyegarkan data saat tab kembali aktif.
 */
export function usePortfolio(): UsePortfolioResult {
  const snapshot = useSyncExternalStore(
    subscribePortfolio,
    getPortfolioSnapshot,
    getPortfolioSnapshot,
  )

  useEffect(() => {
    void loadPortfolio()
    return watchPortfolioRefresh()
  }, [])

  return { ...snapshot, reload: loadPortfolio }
}
