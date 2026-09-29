/**
 * Kebijakan autentikasi yang dipakai bersama oleh server dan form login,
 * supaya aturan yang ditampilkan ke pengguna sama dengan yang divalidasi
 * server.
 */

/** Panjang minimum password admin. */
export const MIN_PASSWORD_LENGTH = 8

/** Masa berlaku sesi login (hari) — ditampilkan di layar login & panel Security. */
export const SESSION_TTL_DAYS = 30

/**
 * Satu-satunya role yang boleh membuka dashboard dan memakai endpoint tulis.
 * Login dengan role lain tetap sah, tetapi ditolak (403) oleh server dan
 * dihentikan di layar "Access Denied" pada frontend.
 */
export const ADMIN_ROLE = 'admin'
