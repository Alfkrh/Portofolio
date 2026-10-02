/**
 * Route admin.
 *
 * Dua middleware di paling atas berlaku untuk SEMUA route di bawahnya:
 * `requireAuth` (harus punya sesi valid) dan `requireAdminRole` (harus ber-role
 * admin). Jadi tidak ada satu pun endpoint tulis di sini yang bisa diakses
 * tanpa login — termasuk endpoint yang ditambahkan nanti.
 */

import { Router } from 'express'
import { contactController } from '../controllers/contact.controller.js'
import { profileController } from '../controllers/resource.controller.js'
import { resourceControllers } from '../controllers/index.js'
import { requireAdminRole, requireAuth } from '../middleware/auth.js'
import { uploadSingleFile } from '../middleware/upload.js'
import { validate } from '../middleware/validate.js'
import { uploadController } from '../controllers/upload.controller.js'
import { collectionResources } from '../models/resources.js'
import { profileSchema, sectionSchema, settingSchema } from '../models/validators.js'
import { sectionsService, settingsService } from '../services/kv.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.use(requireAuth, requireAdminRole)

/* --------------------------------- profil --------------------------------- */

router.get('/profile', profileController.get)
router.put('/profile', validate(profileSchema), profileController.update)

/* -------------------------------- resource -------------------------------- */

// CRUD penuh untuk: skills, experiences, projects, project-filters, education,
// certificates, dan social-links.
for (const resource of collectionResources) {
  const controller = resourceControllers.get(resource.name)

  router.get(`/${resource.name}`, controller.listAll)
  router.post(`/${resource.name}`, validate(resource.schemas.create), controller.create)
  router.get(`/${resource.name}/:id`, controller.getById)
  router.put(`/${resource.name}/:id`, validate(resource.schemas.update), controller.update)
  router.delete(`/${resource.name}/:id`, controller.remove)
}

/* --------------------------------- upload --------------------------------- */

router.post('/uploads', uploadSingleFile, uploadController.create)

/* ----------------------------- pesan kontak ------------------------------ */

router.get('/contact-messages', contactController.list)
router.patch('/contact-messages/:id', contactController.markRead)
router.delete('/contact-messages/:id', contactController.remove)

/* --------------------------- teks & pengaturan --------------------------- */

router.get(
  '/sections',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await sectionsService.read(), 'Teks section berhasil diambil.')
  }),
)

router.put(
  '/sections',
  validate(sectionSchema),
  asyncHandler(async (req, res) => {
    const data = await sectionsService.write(req.validated.body)
    sendSuccess(res, data, 'Teks section berhasil disimpan.')
  }),
)

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await settingsService.read(), 'Pengaturan situs berhasil diambil.')
  }),
)

router.put(
  '/settings',
  validate(settingSchema),
  asyncHandler(async (req, res) => {
    const data = await settingsService.write(req.validated.body)
    sendSuccess(res, data, 'Pengaturan situs berhasil disimpan.')
  }),
)

export default router
