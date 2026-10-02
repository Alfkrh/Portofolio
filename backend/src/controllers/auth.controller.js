/**
 * Controller autentikasi admin.
 *
 * Controller hanya menerjemahkan request menjadi pemanggilan service dan
 * menyusun respons — tidak ada query database langsung di sini.
 */

import * as authService from '../services/auth.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const authController = {
  /** POST /api/auth/setup — hanya berhasil bila belum ada akun sama sekali. */
  setup: asyncHandler(async (req, res) => {
    const result = await authService.setupFirstAdmin(req.validated.body)
    sendSuccess(res, result, 'Akun admin pertama berhasil dibuat.', 201)
  }),

  /** POST /api/auth/login */
  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.validated.body)
    sendSuccess(res, result, 'Login berhasil.')
  }),

  /**
   * GET /api/auth/me — status sesi sekaligus gerbang dashboard.
   * `authenticated: false` bukan galat: dashboard memakainya untuk memutuskan
   * menampilkan form login atau form setup awal.
   */
  me: asyncHandler(async (req, res) => {
    const setupRequired = (await authService.countAdmins()) === 0

    if (!req.admin) {
      sendSuccess(res, { authenticated: false, setupRequired, email: null, role: null })
      return
    }

    sendSuccess(res, {
      authenticated: true,
      setupRequired,
      email: req.admin.email,
      role: req.admin.role,
      activeSessions: await authService.countSessions(req.admin.id),
    })
  }),

  /** POST /api/auth/logout — cabut sesi yang sedang dipakai. */
  logout: asyncHandler(async (req, res) => {
    const result = await authService.logout(req.admin?.tokenHash)
    sendSuccess(res, result, 'Logout berhasil.')
  }),

  /** POST /api/auth/logout-all — cabut semua sesi akun ini. */
  logoutAll: asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.admin.id)
    sendSuccess(res, result, 'Semua sesi berhasil diakhiri.')
  }),

  /** POST /api/auth/password */
  changePassword: asyncHandler(async (req, res) => {
    const { current_password: currentPassword, new_password: newPassword } =
      req.validated.body

    const result = await authService.changePassword(
      req.admin.id,
      currentPassword,
      newPassword,
      req.admin.tokenHash,
    )
    sendSuccess(res, result, 'Password berhasil diganti.')
  }),

  /** POST /api/auth/email */
  changeEmail: asyncHandler(async (req, res) => {
    const { current_password: currentPassword, email } = req.validated.body
    const result = await authService.changeEmail(req.admin.id, currentPassword, email)
    sendSuccess(res, result, 'Email admin berhasil diganti.')
  }),
}
