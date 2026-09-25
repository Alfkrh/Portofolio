import { ArrowUp } from 'lucide-react'
import type { Contact } from '../types/portfolio'
import { uiCopy } from '../config/siteCopy'
import Container from './ui/Container'
import SocialLinks from './SocialLinks'

interface FooterProps {
  name: string
  logo: string | null
  tagline: string
  contacts: Contact[]
}

export default function Footer({
  name,
  logo,
  tagline,
  contacts,
}: FooterProps) {
  const wordmark = (logo?.trim() || name).replace(/\.$/, '')
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white">
      <Container className="flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
        <div className="text-center sm:text-left">
          <span className="font-display text-lg font-extrabold tracking-tight text-navy">
            {wordmark}
            <span className="text-brand-600">.</span>
          </span>
          {tagline ? (
            <p className="mt-1 text-sm text-slate-500">{tagline}</p>
          ) : null}
        </div>

        <SocialLinks
          contacts={contacts}
          showLabels
          className="justify-center sm:justify-end"
        />
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-3 py-5 text-xs text-slate-400 sm:flex-row">
          <p>
            © {year} {name}. {uiCopy.copyrightSuffix}
          </p>
          <a
            href="#home"
            className="inline-flex items-center gap-1.5 rounded-sm font-medium transition duration-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            {uiCopy.backToTop}
            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </Container>
      </div>
    </footer>
  )
}
