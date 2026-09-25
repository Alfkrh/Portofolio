/**
 * Teks antarmuka (UI chrome) dan fallback untuk teks section.
 *
 * Sumber utama seluruh teks section adalah tabel `sections` di database.
 * Konstanta di file ini hanya dipakai sebagai nilai cadangan supaya halaman
 * tetap rapi bila ada key yang belum diisi, serta untuk label antarmuka yang
 * bukan konten portfolio (nama menu, label form, tombol).
 */

import type { SectionId, SectionTexts } from '../types/portfolio'

export const sectionFallbacks = {
  'nav.cta_label': "Let's Talk",
  'hero.primary_cta_label': 'View My Work',
  'hero.secondary_cta_label': 'Contact Me',
  'about.eyebrow': 'Get to know me',
  'about.title': 'About Me',
  'about.cta_label': 'More About Me',
  'experience.eyebrow': 'My journey',
  'experience.title': 'Experience',
  'experience.subtitle': '',
  'skills.eyebrow': 'What I do',
  'skills.title': 'Skills & Expertise',
  'skills.subtitle': '',
  'projects.eyebrow': 'Portfolio',
  'projects.title': 'Selected Projects',
  'projects.subtitle': '',
  'education.eyebrow': 'Academic background',
  'education.title': 'Education',
  'education.subtitle': '',
  'contact.eyebrow': 'Contact',
  'contact.title': "Let's Work Together",
  'contact.description': '',
  'contact.form_note': '',
  'footer.tagline': '',
} as const

export type SectionTextKey = keyof typeof sectionFallbacks

/** Ambil teks section dari database, dengan fallback bawaan. */
export function sectionText(
  sections: SectionTexts,
  key: SectionTextKey,
): string {
  const value = sections[key]
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : sectionFallbacks[key]
}

export const navItems: Array<{ id: SectionId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
]

/** ID anchor tujuan tombol CTA di navbar & hero. */
export const anchors = {
  projects: '#projects',
  contact: '#contact',
  experience: '#experience',
}

export const uiCopy = {
  allFilter: 'All',
  viewProject: 'View Project',
  sendMessage: 'Send Message',
  backToTop: 'Back to top',
  copyrightSuffix: 'All rights reserved.',
  uploadPhoto: 'Upload Photo',
  changePhoto: 'Change Photo',
  removePhoto: 'Remove Photo',
  previewPhoto: 'Preview foto',
  formLabels: {
    name: 'Name',
    email: 'Email',
    message: 'Message',
  },
}
