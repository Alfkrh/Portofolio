import { ArrowUpRight } from 'lucide-react'
import type { Contact as ContactChannel, SectionTexts } from '../types/portfolio'
import { sectionText } from '../config/siteCopy'
import ContactForm from './ContactForm'
import Container from './ui/Container'
import IconTile from './ui/IconTile'
import Section from './ui/Section'
import SectionHeading from './ui/SectionHeading'
import { getContactIcon } from '../lib/contactIcons'

interface ContactProps {
  contacts: ContactChannel[]
  sections: SectionTexts
}

export default function Contact({ contacts, sections }: ContactProps) {
  const hasAnyLink = contacts.some((contact) => Boolean(contact.url))

  return (
    <Section id="contact" className="relative overflow-hidden bg-navy">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-4rem] h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-6rem] h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      </div>

      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={sectionText(sections, 'contact.eyebrow')}
              title={sectionText(sections, 'contact.title')}
              subtitle={sectionText(sections, 'contact.description') || undefined}
              tone="dark"
            />

            {contacts.length > 0 ? (
              <ul className="mt-9 space-y-3">
                {contacts.map((contact) => {
                  const label = contact.label ?? contact.kind

                  const inner = (
                    <>
                      <IconTile
                        icon={getContactIcon(contact.kind)}
                        size="md"
                        tone="onDark"
                        className="group-hover:border-brand-400/40 group-hover:text-white"
                      />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate text-sm font-semibold text-white">
                          {contact.value ?? 'Belum ditambahkan'}
                        </span>
                      </span>
                      {contact.url ? (
                        <ArrowUpRight
                          aria-hidden="true"
                          className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-300"
                        />
                      ) : null}
                    </>
                  )

                  return (
                    <li key={contact.id}>
                      {contact.url ? (
                        <a
                          href={contact.url}
                          target={
                            contact.url.startsWith('http') ? '_blank' : undefined
                          }
                          rel={
                            contact.url.startsWith('http')
                              ? 'noreferrer'
                              : undefined
                          }
                          className="group flex items-center gap-4 rounded-card border border-white/10 bg-white/5 p-4 transition duration-200 ease-out hover:border-brand-400/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy sm:p-5"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div
                          title={`${label} belum ditambahkan`}
                          className="group flex items-center gap-4 rounded-card border border-dashed border-white/10 bg-white/[0.02] p-4 opacity-80 sm:p-5"
                        >
                          {inner}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-9 text-sm text-slate-400">
                Belum ada kanal kontak yang ditambahkan.
              </p>
            )}

            {!hasAnyLink && contacts.length > 0 ? (
              <p className="mt-5 text-xs leading-relaxed text-slate-400">
                Detail kontak akan muncul sebagai tautan aktif setelah datanya
                ditambahkan.
              </p>
            ) : null}
          </div>

          <ContactForm note={sectionText(sections, 'contact.form_note')} />
        </div>
      </Container>
    </Section>
  )
}
