import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react'
import type { Contact, Profile, SectionTexts } from '../types/portfolio'
import { anchors, sectionText } from '../config/siteCopy'
import Button from './ui/Button'
import Container from './ui/Container'
import ProfilePhoto from './ProfilePhoto'
import Section from './ui/Section'
import SocialLinks from './SocialLinks'
import Tag from './ui/Tag'

interface HeroProps {
  profile: Profile
  contacts: Contact[]
  sections: SectionTexts
  onPhotoChanged: () => Promise<void> | void
}

export default function Hero({
  profile,
  contacts,
  sections,
  onPhotoChanged,
}: HeroProps) {
  const focusAreas = profile.focus.filter((area) => area.trim().length > 0)

  return (
    <Section
      id="home"
      className="relative overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28"
    >
      {/* Dekorasi latar — non-interaktif. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-brand-100/70 blur-3xl dark:bg-brand-500/20" />
        <div className="absolute top-40 left-[-8rem] h-64 w-64 rounded-full bg-brand-50 blur-3xl dark:bg-brand-900/70" />
      </div>

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            {profile.greeting ? (
              <span className="inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-white px-3.5 py-1.5 text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase shadow-soft dark:border-brand-900/70 dark:bg-slate-800 dark:text-brand-300">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                {profile.greeting}
              </span>
            ) : null}

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-navy dark:text-slate-50 sm:text-5xl lg:text-6xl">
              {profile.name}
            </h1>

            {profile.headline ? (
              <p className="mt-4 font-display text-lg font-semibold text-brand-700 dark:text-brand-400 sm:text-xl">
                {profile.headline}
              </p>
            ) : null}

            {profile.short_description ? (
              <p className="mt-6 text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
                {profile.short_description}
              </p>
            ) : null}

            {profile.availability ? (
              <p className="mt-6 inline-flex items-center gap-2 rounded-pill border border-emerald-100 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-300">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                {profile.availability}
              </p>
            ) : null}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href={anchors.projects} size="lg" icon={ArrowRight}>
                {sectionText(sections, 'hero.primary_cta_label')}
              </Button>
              <Button href={anchors.contact} size="lg" variant="secondary">
                {sectionText(sections, 'hero.secondary_cta_label')}
              </Button>
            </div>

            {contacts.length > 0 || focusAreas.length > 0 ? (
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <SocialLinks contacts={contacts} />

                {contacts.length > 0 && focusAreas.length > 0 ? (
                  <span
                    aria-hidden="true"
                    className="hidden h-6 w-px bg-line sm:block dark:bg-slate-700"
                  />
                ) : null}

                {focusAreas.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {focusAreas.map((area) => (
                      <li key={area}>
                        <Tag tone="neutral">{area}</Tag>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <ProfilePhoto
            profile={profile}
            institution={profile.education ?? undefined}
            onPhotoChanged={onPhotoChanged}
          />
        </div>
      </Container>
    </Section>
  )
}
