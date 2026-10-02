/**
 * Route publik.
 *
 * Hanya mengembalikan data yang boleh dilihat pengunjung:
 *  - project dengan `published = true`
 *  - sertifikat dengan `published = true`
 *  - tautan sosial dengan `is_active = true`
 *
 * Penyaringan ini dilakukan di database, bukan di frontend, sehingga data draft
 * tidak pernah ikut terkirim keluar.
 */

import { Router } from 'express'
import { contactController } from '../controllers/contact.controller.js'
import { portfolioController } from '../controllers/portfolio.controller.js'
import { profileController } from '../controllers/resource.controller.js'
import { resourceControllers } from '../controllers/index.js'
import { contactLimiter } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { collectionResources } from '../models/resources.js'
import { contactMessageSchema } from '../models/validators.js'
import { sectionsService, settingsService } from '../services/kv.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

// Seluruh konten sekaligus — halaman portfolio memang membutuhkannya bersamaan.
router.get('/portfolio', portfolioController.get)

router.get('/profile', profileController.get)

// GET /skills, /experiences, /projects, /education, /certificates,
// /social-links, dan /project-filters.
for (const resource of collectionResources) {
  router.get(`/${resource.name}`, resourceControllers.get(resource.name).listPublic)
}

router.get(
  '/sections',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await sectionsService.read(), 'Teks section berhasil diambil.')
  }),
)

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await settingsService.read(), 'Pengaturan situs berhasil diambil.')
  }),
)

// Form Contact — satu-satunya endpoint tulis yang terbuka untuk pengunjung.
router.post(
  '/contact',
  contactLimiter,
  validate(contactMessageSchema),
  contactController.submit,
)

export default router
