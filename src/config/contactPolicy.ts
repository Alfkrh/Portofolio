/**
 * Batas form Contact yang dipakai bersama server dan frontend, supaya validasi
 * di browser dan di API tidak pernah berbeda.
 *
 * Nilai ini juga menentukan panjang input (`maxLength`) pada form publik.
 */

export const CONTACT_NAME_MAX_LENGTH = 80
export const CONTACT_EMAIL_MAX_LENGTH = 160
export const CONTACT_MESSAGE_MIN_LENGTH = 10
export const CONTACT_MESSAGE_MAX_LENGTH = 2000

/**
 * Pembatas pengiriman: maksimal sekian pesan dari satu alamat IP dalam satu
 * jendela waktu, supaya form publik tidak bisa dipakai untuk spam.
 */
export const CONTACT_MAX_SUBMISSIONS = 5
export const CONTACT_SUBMISSION_WINDOW_MS = 10 * 60 * 1000
