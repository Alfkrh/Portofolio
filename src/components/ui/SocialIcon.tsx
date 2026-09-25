import { contactIcons, fallbackContactIcon } from '../../lib/contactIcons'

interface SocialIconProps {
  kind: string
  className?: string
}

/** Ikon untuk satu jenis kontak (jenis tak dikenal memakai ikon generik). */
export default function SocialIcon({ kind, className }: SocialIconProps) {
  const Icon = contactIcons[kind.trim().toLowerCase()] ?? fallbackContactIcon

  return <Icon aria-hidden="true" className={className} />
}
