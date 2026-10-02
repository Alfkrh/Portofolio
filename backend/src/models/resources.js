/**
 * Registry resource: satu tempat yang mendefinisikan setiap jenis konten.
 *
 * Dari daftar ini dibangun otomatis route publik, route admin, validasinya,
 * urutan tampil, dan filter "hanya yang boleh tampil ke pengunjung". Menambah
 * jenis konten baru cukup menambah satu entri di sini.
 *
 * `name` adalah segmen URL sekaligus nama resource di API.
 * `model` adalah nama delegate Prisma (huruf pertama kecil, camelCase).
 */

import {
  certificateSchemas,
  educationSchemas,
  experienceSchemas,
  profileSchema,
  projectFilterSchemas,
  projectSchemas,
  skillSchemas,
  socialLinkSchemas,
} from './validators.js'

/** Urutan default: `sort_order` dulu, lalu id sebagai penentu akhir. */
const bySortOrder = [{ sort_order: 'asc' }, { id: 'asc' }]

export const resources = [
  {
    name: 'profile',
    label: 'Profil',
    model: 'profile',
    /** Singleton: selalu satu baris (id = 1), tidak punya daftar/urutan. */
    singleton: true,
    schema: profileSchema,
    publicWhere: null,
    orderBy: [{ id: 'asc' }],
  },
  {
    name: 'skills',
    label: 'Skill',
    model: 'skill',
    schemas: skillSchemas,
    publicWhere: null,
    orderBy: bySortOrder,
  },
  {
    name: 'experiences',
    label: 'Pengalaman',
    model: 'experience',
    schemas: experienceSchemas,
    publicWhere: null,
    orderBy: bySortOrder,
  },
  {
    name: 'projects',
    label: 'Project',
    model: 'project',
    schemas: projectSchemas,
    /** Draft tidak boleh ikut terkirim ke pengunjung. */
    publicWhere: { published: true },
    orderBy: bySortOrder,
  },
  {
    name: 'project-filters',
    label: 'Filter Project',
    model: 'projectFilter',
    schemas: projectFilterSchemas,
    publicWhere: null,
    orderBy: bySortOrder,
  },
  {
    name: 'education',
    label: 'Pendidikan',
    model: 'education',
    schemas: educationSchemas,
    publicWhere: null,
    orderBy: bySortOrder,
  },
  {
    name: 'certificates',
    label: 'Sertifikat',
    model: 'certificate',
    schemas: certificateSchemas,
    publicWhere: { published: true },
    orderBy: bySortOrder,
  },
  {
    name: 'social-links',
    label: 'Tautan Sosial',
    model: 'socialLink',
    schemas: socialLinkSchemas,
    /** Hanya tautan yang ditandai aktif yang tampil di website. */
    publicWhere: { is_active: true },
    orderBy: bySortOrder,
  },
]

/** Resource koleksi saja (tanpa singleton), untuk membangun route CRUD. */
export const collectionResources = resources.filter((item) => !item.singleton)

/** Pencarian resource berdasarkan `name`. */
export const resourceByName = new Map(resources.map((item) => [item.name, item]))

export function findResource(name) {
  return resourceByName.get(name)
}
