import {
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Ikon per jenis kontak. `kind` bebas diisi dari database; jenis yang belum
 * dikenal memakai ikon generik supaya kontak baru tetap tampil.
 */
export const contactIcons: Record<string, LucideIcon> = {
  email: Mail,
  mail: Mail,
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
  whatsapp: MessageSquare,
}

/** Ikon cadangan untuk jenis kontak yang belum dikenal. */
export const fallbackContactIcon: LucideIcon = Globe

export function getContactIcon(kind: string): LucideIcon {
  return contactIcons[kind.trim().toLowerCase()] ?? fallbackContactIcon
}
