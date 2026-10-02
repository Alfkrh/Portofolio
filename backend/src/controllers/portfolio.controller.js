/**
 * Endpoint agregat.
 *
 * `GET /api/portfolio` mengembalikan seluruh konten publik dalam satu request.
 * Halaman portfolio memang butuh semuanya sekaligus, jadi satu request jauh
 * lebih hemat daripada sepuluh request terpisah — dan bentuk responsnya
 * dipertahankan sama seperti sebelumnya supaya frontend tidak perlu diubah
 * banyak.
 *
 * Perhatikan: yang ikut hanya data yang boleh dilihat pengunjung (project
 * published, tautan sosial aktif).
 */

import { prisma } from '../lib/prisma.js'
import { sectionsService, settingsService } from '../services/kv.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const portfolioController = {
  get: asyncHandler(async (_req, res) => {
    const [
      profile,
      skills,
      experiences,
      projects,
      project_filters,
      education,
      certificates,
      social_links,
      sections,
      settings,
    ] = await Promise.all([
      prisma.profile.findUnique({ where: { id: 1 } }),
      prisma.skill.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] }),
      prisma.experience.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] }),
      prisma.project.findMany({
        where: { published: true },
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      }),
      prisma.projectFilter.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] }),
      prisma.education.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] }),
      prisma.certificate.findMany({
        where: { published: true },
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      }),
      prisma.socialLink.findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      }),
      sectionsService.read(),
      settingsService.read(),
    ])

    sendSuccess(
      res,
      {
        profile,
        skills,
        experiences,
        projects,
        project_filters,
        education,
        certificates,
        social_links,
        sections,
        settings,
      },
      'Konten portfolio berhasil diambil.',
    )
  }),
}
