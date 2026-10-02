/**
 * Konstanta kebijakan yang dipakai middleware maupun service.
 */

/** Hanya akun ber-role ini yang boleh menyentuh endpoint admin. */
export const ADMIN_ROLE = 'admin'

/** Tipe gambar yang boleh diunggah, beserta ekstensi simpannya. */
export const ALLOWED_UPLOAD_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
  // Sertifikat sering dibagikan sebagai PDF, jadi ikut diizinkan.
  ['application/pdf', 'pdf'],
])

/** Nama field form-data yang dipakai endpoint upload. */
export const UPLOAD_FIELD_NAME = 'file'

/** Batas panjang teks untuk menjaga ukuran database tetap wajar. */
export const LIMITS = {
  name: 120,
  shortText: 300,
  url: 2048,
  mediumText: 600,
  longText: 8000,
  message: 4000,
}
