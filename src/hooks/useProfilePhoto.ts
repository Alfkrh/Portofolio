import { useCallback, useEffect, useRef, useState } from 'react'
import { createOptimizedPhoto } from '../lib/imageFile'
import {
  deleteProfilePhoto,
  uploadProfilePhoto,
} from '../services/portfolioApi'
import type { Profile } from '../types/portfolio'

export interface ProfilePhotoDetails {
  name: string
  size: number
}

export interface UseProfilePhotoResult {
  photoUrl: string | null
  isProcessing: boolean
  error: string | null
  details: ProfilePhotoDetails | null
  uploadPhoto: (file: File) => Promise<void>
  removePhoto: () => Promise<void>
}

/**
 * Foto profil yang tersimpan di server (bukan di browser).
 *
 * Karena fotonya disimpan di storage server, semua pengunjung melihat foto yang
 * sama dan admin dapat menggantinya tanpa mengubah source code.
 *
 * @param profile  Data profil terbaru dari API.
 * @param onChanged Dipanggil setelah perubahan tersimpan agar konten diambil ulang.
 */
export function useProfilePhoto(
  profile: Profile | null,
  onChanged: () => Promise<void> | void,
): UseProfilePhotoResult {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<ProfilePhotoDetails | null>(null)

  const previewRef = useRef<string | null>(null)

  const setPreview = useCallback((blob: Blob | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
      previewRef.current = null
    }
    if (!blob) {
      setPreviewUrl(null)
      return
    }
    previewRef.current = URL.createObjectURL(blob)
    setPreviewUrl(previewRef.current)
  }, [])

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  const uploadPhoto = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setError(null)

      try {
        // Perkecil foto di browser dulu supaya upload ringan.
        const optimized = await createOptimizedPhoto(file)
        setPreview(optimized)
        setDetails({ name: file.name, size: optimized.size })

        await uploadProfilePhoto(optimized)
        await onChanged()

        // Pakai URL dari server sebagai sumber tunggal setelah tersimpan.
        setPreview(null)
      } catch (cause) {
        setPreview(null)
        setDetails(null)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Foto gagal diunggah. Coba lagi.',
        )
      } finally {
        setIsProcessing(false)
      }
    },
    [onChanged, setPreview],
  )

  const removePhoto = useCallback(async () => {
    setIsProcessing(true)
    setError(null)

    try {
      await deleteProfilePhoto()
      setPreview(null)
      setDetails(null)
      await onChanged()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Foto gagal dihapus.',
      )
    } finally {
      setIsProcessing(false)
    }
  }, [onChanged, setPreview])

  return {
    photoUrl: previewUrl ?? profile?.photo_url ?? null,
    isProcessing,
    error,
    details,
    uploadPhoto,
    removePhoto,
  }
}
