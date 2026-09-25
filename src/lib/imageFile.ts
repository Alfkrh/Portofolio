/**
 * Client-side handling for a user-selected profile photo.
 *
 * Uploaded files are validated, then downscaled in the browser so the stored
 * photo stays small (fast load, no distortion — the frame crops with
 * `object-fit: cover` instead of stretching).
 */

/** Maximum accepted upload size, before optimisation. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

/** Longest edge of the stored photo. Enough for a 1:1 avatar on retina. */
export const MAX_PHOTO_DIMENSION = 1024

export const PHOTO_INPUT_ACCEPT =
  'image/png,image/jpeg,image/webp,image/avif,image/gif'

const SUPPORTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/gif',
])

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Apakah file gambar didukung (berdasarkan MIME type, atau ekstensi bila
 * browser tidak melaporkan MIME type — mis. file hasil drag & drop).
 */
export function isSupportedImageFile(file: File): boolean {
  if (SUPPORTED_TYPES.has(file.type.toLowerCase())) return true
  return file.type === '' && /\.(png|jpe?g|webp|avif|gif)$/i.test(file.name)
}

const isSupportedImage = isSupportedImageFile

/**
 * Validates the selected file and returns an optimised Blob to store.
 * Throws an `Error` with a user-facing message when the file is unusable.
 */
export async function createOptimizedPhoto(file: File): Promise<Blob> {
  if (!isSupportedImage(file)) {
    throw new Error('Format foto belum didukung. Gunakan JPG, PNG, atau WebP.')
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(
      `Ukuran foto terlalu besar (maks ${formatFileSize(MAX_PHOTO_BYTES)}).`,
    )
  }

  // Without createImageBitmap we simply keep the original file.
  if (typeof createImageBitmap !== 'function') return file

  let bitmap: ImageBitmap
  try {
    // `from-image` respects EXIF rotation from phone cameras.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Foto tidak dapat dibaca. Coba pilih file lain.')
  }

  try {
    const scale = Math.min(
      1,
      MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(bitmap, 0, 0, width, height)

    const optimized = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.9)
    })

    // Keep whichever is smaller so a PNG-like flat image is not inflated.
    if (!optimized || optimized.size >= file.size) return file
    return optimized
  } finally {
    bitmap.close()
  }
}
