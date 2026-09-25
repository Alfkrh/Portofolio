import { GraduationCap } from 'lucide-react'
import type { Education as EducationItem, SectionTexts } from '../types/portfolio'
import { sectionText } from '../config/siteCopy'
import { formatYearRange } from '../lib/formatDate'
import Container from './ui/Container'
import IconTile from './ui/IconTile'
import PlaceholderNote from './ui/PlaceholderNote'
import Reveal from './ui/Reveal'
import Section from './ui/Section'
import SectionHeading from './ui/SectionHeading'
import Tag from './ui/Tag'

interface EducationProps {
  items: EducationItem[]
  sections: SectionTexts
}

export default function Education({ items, sections }: EducationProps) {
  return (
    <Section id="education" className="border-y border-line bg-white">
      <Container>
        <SectionHeading
          eyebrow={sectionText(sections, 'education.eyebrow')}
          title={sectionText(sections, 'education.title')}
          subtitle={sectionText(sections, 'education.subtitle') || undefined}
        />

        {items.length === 0 ? (
          <div className="mt-12 rounded-card border border-dashed border-line bg-surface/60 p-8 text-center">
            <PlaceholderNote>Belum ada data pendidikan</PlaceholderNote>
          </div>
        ) : (
          <ol className="mt-12 space-y-6">
            {items.map((item, index) => {
              const yearRange = formatYearRange(item.start_year, item.end_year)
              const degreeLabel = [item.degree, item.major]
                .filter((value) => Boolean(value && value.trim()))
                .join(' ')

              return (
                <li key={item.id}>
                  <Reveal delay={index * 80} className="block">
                    <div className="relative overflow-hidden rounded-card border border-line bg-surface/60 p-6 shadow-soft transition duration-300 ease-out hover:border-brand-200 hover:bg-white hover:shadow-lift motion-safe:hover:-translate-y-1 sm:p-7">
                      <div
                        aria-hidden="true"
                        className="absolute top-0 right-0 h-32 w-32 rounded-full bg-brand-50 blur-2xl"
                      />

                      <div className="relative flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <IconTile
                            icon={GraduationCap}
                            size="lg"
                            tone="solid"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-navy sm:text-xl">
                              {item.institution}
                            </h3>
                            {degreeLabel ? (
                              <p className="mt-1 text-sm font-semibold text-brand-700">
                                {degreeLabel}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {yearRange ? (
                          <Tag tone="neutral">{yearRange}</Tag>
                        ) : (
                          <PlaceholderNote>
                            Tahun pendidikan belum ditambahkan
                          </PlaceholderNote>
                        )}
                      </div>

                      <div className="relative mt-6 sm:mt-8">
                        <h4 className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                          Deskripsi
                        </h4>
                        {item.description ? (
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            Deskripsi pendidikan belum ditambahkan.
                          </p>
                        )}
                      </div>
                    </div>
                  </Reveal>
                </li>
              )
            })}
          </ol>
        )}
      </Container>
    </Section>
  )
}
