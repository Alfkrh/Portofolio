/**
 * Titik kumpul route.
 *
 * Semua route di sini dipasang di bawah prefix `/api` oleh `app.js`:
 *
 *   GET  /api/health
 *   .../api/auth/*            → autentikasi admin
 *   GET  /api/<resource>      → data publik
 *   .../api/admin/*           → CRUD penuh, wajib login
 */

import { Router } from 'express'
import { healthController } from '../controllers/health.controller.js'
import adminRoutes from './admin.routes.js'
import authRoutes from './auth.routes.js'
import publicRoutes from './public.routes.js'

const router = Router()

router.get('/health', healthController.check)

router.use('/auth', authRoutes)

// Route admin dipasang LEBIH DULU daripada route publik supaya path seperti
// /api/admin/projects tidak pernah tertangkap oleh pola publik.
router.use('/admin', adminRoutes)

router.use('/', publicRoutes)

export default router
