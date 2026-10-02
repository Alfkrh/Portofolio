import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { optionalAuth, requireAdminRole, requireAuth } from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import {
  changeEmailSchema,
  changePasswordSchema,
  loginSchema,
  setupSchema,
} from '../models/validators.js'

const router = Router()

// Setup awal hanya bisa berhasil selama belum ada akun admin sama sekali.
router.post('/setup', validate(setupSchema), authController.setup)

// Endpoint publik yang tetap dibatasi supaya password tidak bisa ditebak paksa.
router.post('/login', loginLimiter, validate(loginSchema), authController.login)

// Tanpa `requireAuth`: tamu juga perlu tahu statusnya untuk memilih antara
// form login dan form setup awal.
router.get('/me', optionalAuth, authController.me)

router.post('/logout', requireAuth, authController.logout)

router.post(
  '/logout-all',
  requireAuth,
  requireAdminRole,
  authController.logoutAll,
)

router.post(
  '/password',
  requireAuth,
  requireAdminRole,
  validate(changePasswordSchema),
  authController.changePassword,
)

router.post(
  '/email',
  requireAuth,
  requireAdminRole,
  validate(changeEmailSchema),
  authController.changeEmail,
)

export default router
