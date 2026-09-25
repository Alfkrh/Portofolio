import { BadgeCheck, BookOpen, GraduationCap, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Profile, SectionTexts } from '../types/portfolio'
import { anchors, sectionText } from '../config/siteCopy'
import Button from './ui/Button'
import Container from './ui/Container'
import IconTile from './ui/IconTile'
import PlaceholderNote from './ui/PlaceholderNote'
import Reveal from './ui/Reveal'
import Section from './ui/Section'
import SectionHeading from './ui/SectionHeading'

const FACT_ICONS: Record<string, LucideIcon> = {
  education: GraduationCap,
  major: BookOpen,
  focus: Target,
  status: BadgeCheck,
}

interface AboutProps {
  profile: Profile
  sections: SectionTexts
}

export default function About({ profile, sections }: AboutProps) {
  const paragraphs = (profile.bio ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const focusLabel = profile.focus.filter(Boolean).join(', ')

  const facts = [
    { id: 'education', label: 'Education', value: profile.education },
    { id: 'major', label: 'Major', value: profile.major },
    { id: 'focus', label: 'Focus', value: focusLabel },
    { id: 'status', label: 'Status', value: profile.status },
  ].filter((fact) => Boolean(fact.value && fact.value.trim().length > 0))

  return (
    <Section id="about" className="border-y border-line bg-white">
      <Container>
        <SectionHeading
          eyebrow={sectionText(sections, 'about.eyebrow')}
          title={sectionText(sections, 'about.title')}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-5 lg:gap-14">
          <div className="lg:col-span-3">
            {paragraphs.length > 0 ? (
              <>
                <p className="font-display text-lg leading-relaxed font-semibold text-navy sm:text-xl">
                  {paragraphs[0]}
                </p>

                {paragraphs.length > 1 ? (
                  <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-500">
                    {paragraphs.slice(1).map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <PlaceholderNote>Bio belum ditambahkan</PlaceholderNote>
            )}

            <Button
              href={anchors.experience}
              variant="secondary"
              className="mt-8"
            >
              {sectionText(sections, 'about.cta_label')}
            </Button>
          </div>

          <Reveal className="lg:col-span-2" delay={100}>
            {facts.length > 0 ? (
              <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-2 lg:grid-cols-1">
                {facts.map((fact) => {
                  const Icon = FACT_ICONS[fact.id] ?? BookOpen

                  return (
                    <li
                      key={fact.id}
                      className="flex items-start gap-4 bg-white p-4 transition duration-200 hover:bg-brand-50/40 sm:p-5"
                    >
                      <IconTile icon={Icon} size="md" tone="soft" />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                          {fact.label}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-navy">
                          {fact.value}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <PlaceholderNote>Detail profil belum ditambahkan</PlaceholderNote>
            )}
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
