/**
 * Konfigurasi admin dashboard: menu sidebar, skema form tiap koleksi, dan
 * daftar teks section yang bisa diedit.
 *
 * Semua nilai di sini murni data (tanpa komponen) supaya layout grid form dan
 * label bisa dipakai ulang oleh satu halaman CRUD generik.
 */

import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  Info,
  LayoutDashboard,
  Mail,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CollectionName } from '../types/portfolio'
import type { SectionTextKey } from '../config/siteCopy'

/** Semua rute admin berada di bawah prefix ini. */
export const ADMIN_BASE = '/admin'

/**
 * Layar login admin. Rute `/admin/*` mana pun diarahkan ke sini selama
 * pengunjung belum punya sesi login yang valid.
 */
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE}/login`

export type AdminPageId =
  | 'dashboard'
  | 'profile'
  | 'about'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'education'
  | 'contact'
  | 'settings'

export interface AdminNavItem {
  id: AdminPageId
  label: string
  /** Judul halaman pada header dashboard. */
  title: string
  description: string
  path: string
  icon: LucideIcon
}

export const adminNav: AdminNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'Ringkasan konten website portfolio.',
    path: ADMIN_BASE,
    icon: LayoutDashboard,
  },
  {
    id: 'profile',
    label: 'Profile',
    title: 'Profile',
    description: 'Identitas, headline, dan foto profil yang tampil di Hero.',
    path: `${ADMIN_BASE}/profile`,
    icon: UserRound,
  },
  {
    id: 'about',
    label: 'About',
    title: 'About',
    description: 'Bio dan detail profil yang tampil di section About.',
    path: `${ADMIN_BASE}/about`,
    icon: Info,
  },
  {
    id: 'experience',
    label: 'Experience',
    title: 'Experience',
    description: 'Pengalaman kerja dan organisasi beserta urutannya.',
    path: `${ADMIN_BASE}/experience`,
    icon: Briefcase,
  },
  {
    id: 'skills',
    label: 'Skills',
    title: 'Skills',
    description: 'Keahlian yang dikelompokkan per kategori.',
    path: `${ADMIN_BASE}/skills`,
    icon: Sparkles,
  },
  {
    id: 'projects',
    label: 'Projects',
    title: 'Projects',
    description: 'Project unggulan, thumbnail, tools, dan filter kategorinya.',
    path: `${ADMIN_BASE}/projects`,
    icon: FolderKanban,
  },
  {
    id: 'education',
    label: 'Education',
    title: 'Education',
    description: 'Riwayat pendidikan yang tampil di section Education.',
    path: `${ADMIN_BASE}/education`,
    icon: GraduationCap,
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Contact',
    description: 'Email, sosial media, dan tautan kontak lainnya.',
    path: `${ADMIN_BASE}/contact`,
    icon: Mail,
  },
  {
    id: 'settings',
    label: 'Settings',
    title: 'Settings',
    description: 'Teks section, token admin, dan informasi sistem.',
    path: `${ADMIN_BASE}/settings`,
    icon: Settings,
  },
]

/** Cari menu berdasarkan pathname saat ini. */
export function findNavItem(pathname: string): AdminNavItem | undefined {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  return (
    adminNav.find((item) => item.path === normalized) ??
    adminNav.find(
      (item) => item.path !== ADMIN_BASE && normalized.startsWith(item.path),
    )
  )
}

/* ------------------------------- form schema ------------------------------ */

export type AdminFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'month'
  | 'year'
  | 'list'
  | 'tags'
  | 'image'
  | 'url'

export interface AdminField {
  name: string
  label: string
  type: AdminFieldType
  hint?: string
  placeholder?: string
  required?: boolean
  /** Field lebar penuh (2 kolom saat layar lebar). */
  full?: boolean
  rows?: number
}

export interface AdminCollectionConfig {
  name: CollectionName
  /** Judul panel daftar. */
  label: string
  singular: string
  description: string
  icon: LucideIcon
  fields: AdminField[]
}

export const collectionConfigs: Record<CollectionName, AdminCollectionConfig> = {
  /**
   * Catatan: halaman Experience memakai form khusus (`AdminExperience`) karena
   * punya perilaku antar-field (opsi "Currently Working Here"). Skema di bawah
   * tetap dipertahankan sebagai dokumentasi bentuk field-nya.
   */
  experience: {
    name: 'experience',
    label: 'Experience',
    singular: 'pengalaman',
    description:
      'Urutan di sini menentukan urutan tampil di halaman publik. Gunakan tombol panah untuk menyusun.',
    icon: Briefcase,
    fields: [
      {
        name: 'position',
        label: 'Posisi',
        type: 'text',
        required: true,
        placeholder: 'mis. Web Developer Intern',
      },
      {
        name: 'company',
        label: 'Institusi',
        type: 'text',
        required: true,
        placeholder: 'mis. PT Contoh Digital',
      },
      {
        name: 'type',
        label: 'Tipe',
        type: 'text',
        required: true,
        hint: 'Bebas, mis. Work Experience / Organization Experience.',
        placeholder: 'Work Experience',
      },
      { name: 'start_date', label: 'Mulai', type: 'month', placeholder: '2025-02' },
      {
        name: 'end_date',
        label: 'Selesai',
        type: 'month',
        placeholder: '2025-08',
        hint: 'Kosongkan bila masih berjalan.',
      },
      {
        name: 'description',
        label: 'Deskripsi',
        type: 'textarea',
        full: true,
        rows: 4,
        placeholder: 'Ringkasan pekerjaan dan pencapaian.',
      },
      {
        name: 'skills',
        label: 'Skill yang dipakai',
        type: 'list',
        full: true,
        hint: 'Pisahkan dengan koma, mis. React, Figma, SQL.',
      },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
    ],
  },
  skills: {
    name: 'skills',
    label: 'Skills',
    singular: 'skill',
    description:
      'Skill dengan kategori yang sama otomatis dikelompokkan pada satu kartu di halaman publik.',
    icon: Sparkles,
    fields: [
      {
        name: 'name',
        label: 'Nama skill',
        type: 'text',
        required: true,
        placeholder: 'mis. Figma',
      },
      {
        name: 'category',
        label: 'Kategori',
        type: 'text',
        required: true,
        hint: 'mis. UI/UX Design, Web Development, Data & Database.',
        placeholder: 'UI/UX Design',
      },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
    ],
  },
  /**
   * Catatan: halaman Projects memakai form khusus (`AdminProjects`) karena ada
   * thumbnail, kategori terpilih, status publish, dan project unggulan.
   * Skema di bawah dipertahankan sebagai dokumentasi bentuk field-nya.
   */
  projects: {
    name: 'projects',
    label: 'Projects',
    singular: 'project',
    description:
      'Project unggulan yang tampil sebagai kartu di halaman publik, lengkap dengan thumbnail dan filter kategori.',
    icon: FolderKanban,
    fields: [
      {
        name: 'title',
        label: 'Judul project',
        type: 'text',
        required: true,
        full: true,
        placeholder: 'mis. Website Presensi PKL & Magang',
      },
      {
        name: 'category',
        label: 'Kategori',
        type: 'text',
        hint: 'Label kecil yang menempel di thumbnail.',
        placeholder: 'Web Application',
      },
      { name: 'url', label: 'Tautan project', type: 'url', placeholder: 'https://…' },
      {
        name: 'description',
        label: 'Deskripsi singkat',
        type: 'textarea',
        full: true,
        rows: 4,
        placeholder: 'Satu sampai tiga kalimat tentang project ini.',
      },
      {
        name: 'thumbnail_url',
        label: 'Thumbnail',
        type: 'image',
        full: true,
        hint: 'Rasio 4:3 paling pas. Format JPG, PNG, atau WebP.',
      },
      {
        name: 'tools',
        label: 'Tools',
        type: 'list',
        full: true,
        hint: 'Pisahkan dengan koma, mis. React, TypeScript, Tailwind CSS.',
      },
      {
        name: 'tags',
        label: 'Filter kategori',
        type: 'tags',
        full: true,
        hint: 'Menentukan project ini muncul di filter mana pada section Projects.',
      },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
    ],
  },
  project_filters: {
    name: 'project_filters',
    label: 'Filter Projects',
    singular: 'filter',
    description: 'Tombol filter pada section Projects.',
    icon: FolderKanban,
    fields: [
      { name: 'key', label: 'Key', type: 'text', required: true },
      { name: 'label', label: 'Label', type: 'text', required: true },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
    ],
  },
  education: {
    name: 'education',
    label: 'Education',
    singular: 'pendidikan',
    description: 'Riwayat pendidikan yang tampil secara kronologis.',
    icon: GraduationCap,
    fields: [
      {
        name: 'institution',
        label: 'Institusi',
        type: 'text',
        required: true,
        full: true,
        placeholder: 'mis. Universitas Contoh',
      },
      {
        name: 'degree',
        label: 'Jenjang',
        type: 'text',
        placeholder: 'mis. S1',
      },
      { name: 'major', label: 'Jurusan', type: 'text', placeholder: 'Sistem Informasi' },
      { name: 'start_year', label: 'Tahun mulai', type: 'year', placeholder: '2023' },
      {
        name: 'end_year',
        label: 'Tahun selesai',
        type: 'year',
        hint: 'Kosongkan bila masih berjalan.',
      },
      {
        name: 'description',
        label: 'Deskripsi',
        type: 'textarea',
        full: true,
        rows: 3,
      },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
    ],
  },
  contacts: {
    name: 'contacts',
    label: 'Contact',
    singular: 'kontak',
    description:
      'Jenis kontak menentukan ikonnya: email, linkedin, github, instagram, whatsapp (jenis lain memakai ikon generik).',
    icon: Mail,
    fields: [
      {
        name: 'kind',
        label: 'Jenis',
        type: 'text',
        required: true,
        placeholder: 'email',
      },
      { name: 'label', label: 'Label', type: 'text', placeholder: 'Email' },
      {
        name: 'value',
        label: 'Nilai tampil',
        type: 'text',
        full: true,
        placeholder: 'mis. nama@email.com',
      },
      {
        name: 'url',
        label: 'Tautan',
        type: 'url',
        full: true,
        placeholder: 'mailto:nama@email.com',
      },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
    ],
  },
}

/** Urutan tampil section pada halaman Settings (tanpa project_filters). */
export const collectionSections: Array<{
  page: AdminPageId
  collection: CollectionName
}> = [
  { page: 'experience', collection: 'experience' },
  { page: 'skills', collection: 'skills' },
  { page: 'projects', collection: 'projects' },
  { page: 'education', collection: 'education' },
  { page: 'contact', collection: 'contacts' },
]

/* ------------------------------- section text ----------------------------- */

export interface SectionTextGroup {
  label: string
  keys: SectionTextKey[]
}

/** Teks section dikelompokkan agar mudah dicari di halaman Settings. */
export const sectionTextGroups: SectionTextGroup[] = [
  { label: 'Navbar', keys: ['nav.cta_label'] },
  {
    label: 'Hero',
    keys: ['hero.primary_cta_label', 'hero.secondary_cta_label'],
  },
  {
    label: 'About',
    keys: ['about.eyebrow', 'about.title', 'about.cta_label'],
  },
  {
    label: 'Experience',
    keys: ['experience.eyebrow', 'experience.title', 'experience.subtitle'],
  },
  {
    label: 'Skills',
    keys: ['skills.eyebrow', 'skills.title', 'skills.subtitle'],
  },
  {
    label: 'Projects',
    keys: ['projects.eyebrow', 'projects.title', 'projects.subtitle'],
  },
  {
    label: 'Education',
    keys: ['education.eyebrow', 'education.title', 'education.subtitle'],
  },
  {
    label: 'Contact',
    keys: [
      'contact.eyebrow',
      'contact.title',
      'contact.description',
      'contact.form_note',
    ],
  },
  { label: 'Footer', keys: ['footer.tagline'] },
]
