/**
 * Kontrak data portfolio — dipakai bersama oleh server (`server/`) dan frontend
 * (`src/`). Field mengikuti nama kolom database supaya tidak ada mapping yang
 * tidak perlu, dan API bisa langsung dipakai oleh admin dashboard nanti.
 */

import type { SiteSettings } from '../config/siteSettings.ts'

export type { SiteSettingKey, SiteSettings } from '../config/siteSettings.ts'

export type SectionId =
  | 'home'
  | 'about'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'education'
  | 'contact'

/** Kategori / tipe pengalaman. Bebas diisi dari database. */
export type ExperienceType = string

export interface Profile {
  id: number
  name: string
  logo: string | null
  greeting: string | null
  /** Headline / role, mis. "Information Systems Student & Digital Creative". */
  headline: string | null
  short_description: string | null
  /** Status ketersediaan, mis. "Open to internship". */
  availability: string | null
  /** Bio panjang untuk section About (paragraf dipisahkan baris kosong). */
  bio: string | null
  /** About → Education. */
  education: string | null
  /** About → Major. */
  major: string | null
  /** About → Focus (daftar area fokus). */
  focus: string[]
  /** About → Status. */
  status: string | null
  /** URL foto profil (hasil upload ke storage server). */
  photo_url: string | null
  updated_at: string | null
}

export interface Experience {
  id: number
  position: string
  company: string
  /** Work Experience / Organization Experience / Academic Experience / lainnya. */
  type: ExperienceType
  /** Format `YYYY-MM`. */
  start_date: string | null
  /** Format `YYYY-MM`, `null` berarti masih berjalan. */
  end_date: string | null
  description: string | null
  skills: string[]
  sort_order: number
}

export interface Skill {
  id: number
  name: string
  category: string
  sort_order: number
}

export interface Project {
  id: number
  title: string
  /** Deskripsi singkat yang tampil di kartu. */
  description: string | null
  /** Deskripsi lengkap (boleh lebih panjang dari `description`). */
  full_description: string | null
  /** Kategori project, mis. UI/UX, Web Development, Academic, Other. */
  category: string | null
  thumbnail_url: string | null
  tools: string[]
  /** Tautan demo / project. */
  url: string | null
  /** Tautan repositori GitHub. */
  github_url: string | null
  /** Key filter yang cocok dengan `ProjectFilter.key`. */
  tags: string[]
  /** Project unggulan — diberi penanda di halaman publik. */
  featured: boolean
  /** `false` = tidak ditampilkan di halaman publik. */
  published: boolean
  sort_order: number
}

/** Satu filter pada section Projects, mis. "UI/UX" atau "Web Development". */
export interface ProjectFilter {
  id: number
  /** Key stabil yang dipakai di `Project.tags`. */
  key: string
  label: string
  sort_order: number
}

export interface Education {
  id: number
  institution: string
  degree: string | null
  major: string | null
  /** Tahun mulai, mis. `2023`. */
  start_year: string | null
  /** Tahun selesai, `null` berarti masih berjalan. */
  end_year: string | null
  description: string | null
  sort_order: number
}

export interface Contact {
  id: number
  /** email | linkedin | github | instagram | bebas (ikon generik dipakai). */
  kind: string
  label: string | null
  /** Nilai yang ditampilkan, mis. alamat email atau username. */
  value: string | null
  url: string | null
  sort_order: number
}

/**
 * Teks section (judul, eyebrow, subtitle, label CTA) disimpan di tabel
 * `sections` supaya bisa diubah tanpa menyentuh kode.
 * Frontend tetap punya fallback bila sebuah key belum ada di database.
 */
export type SectionTexts = Record<string, string>

export interface PortfolioData {
  profile: Profile | null
  experience: Experience[]
  skills: Skill[]
  projects: Project[]
  /** Filter yang ditampilkan di section Projects ("All" selalu ada di UI). */
  project_filters: ProjectFilter[]
  education: Education[]
  contacts: Contact[]
  sections: SectionTexts
  /** Pengaturan situs (nama, judul, deskripsi, favicon) dari tabel `settings`. */
  settings: SiteSettings
}

/** Koleksi yang bisa ditulis lewat API (dipakai admin dashboard). */
export type CollectionName =
  | 'experience'
  | 'skills'
  | 'projects'
  | 'project_filters'
  | 'education'
  | 'contacts'

export interface CollectionItemMap {
  experience: Experience
  skills: Skill
  projects: Project
  project_filters: ProjectFilter
  education: Education
  contacts: Contact
}
