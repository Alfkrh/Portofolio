import { useMemo, useState } from 'react'
import { Building2, Calendar } from 'lucide-react'
import type { Experience as ExperienceItem, SectionTexts } from '../types/portfolio'
import { useReveal } from '../hooks/useReveal'
import { uiCopy, sectionText } from '../config/siteCopy'
import { formatPeriod } from '../lib/formatDate'
import Container from './ui/Container'
import FilterTabs, { type FilterOption } from './ui/FilterTabs'
import PlaceholderNote from './ui/PlaceholderNote'
import Section from './ui/Section'
import SectionHeading from './ui/SectionHeading'
import Tag from './ui/Tag'
import { cn } from '../lib/cn'

interface TimelineItemProps {
  item: ExperienceItem
  isLast: boolean
  delay: number
}

/** Satu entri pengalaman — dirender sebagai `<li>` agar markup list valid. */
function TimelineItem({ item, isLast, delay }: TimelineItemProps) {
  const { ref, isVisible } = useReveal<HTMLLIElement>()
  const period = formatPeriod(item.start_date, item.end_date)
  const skills = item.skills.filter((skill) => skill.trim().length > 0)

  return (
    <li
      ref={ref}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'reveal group grid grid-cols-[auto_1fr] gap-3 sm:gap-6',
        isVisible && 'reveal-visible',
      )}
    >
      <div className="flex flex-col items-center pt-6 sm:pt-7">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border-2 border-brand-600 bg-white ring-4 ring-brand-50 transition duration-300 group-hover:bg-brand-600"
        />
        <span
          aria-hidden="true"
          className={cn('mt-2 w-px flex-1 bg-line', isLast && 'hidden')}
        />
      </div>

      <article className="mb-6 rounded-card border border-line bg-white p-5 shadow-soft transition duration-300 ease-out group-hover:border-brand-200 group-hover:shadow-lift motion-safe:group-hover:-translate-y-1 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <Tag tone="brand">{item.type}</Tag>
          {period ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
              {period}
            </span>
          ) : null}
        </div>

        <h4 className="mt-4 text-base font-bold text-navy sm:text-lg">
          {item.position}
        </h4>

        <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
          <Building2 aria-hidden="true" className="h-4 w-4" />
          {item.company}
        </p>

        {item.description ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          {item.description}
        </p>
        ) : null}

        {skills.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li key={skill}>
                <Tag tone="neutral">{skill}</Tag>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </li>
  )
}

interface ExperienceProps {
  items: ExperienceItem[]
  sections: SectionTexts
}

export default function Experience({ items, sections }: ExperienceProps) {
  const [filter, setFilter] = useState<string>('all')

  const types = useMemo(() => {
    const seen: string[] = []
    for (const item of items) {
      if (item.type && !seen.includes(item.type)) seen.push(item.type)
    }
    return seen
  }, [items])

  const options = useMemo<FilterOption<string>[]>(
    () => [
      { id: 'all', label: uiCopy.allFilter, count: items.length },
      ...types.map((type) => ({
        id: type,
        label: type,
        count: items.filter((item) => item.type === type).length,
      })),
    ],
    [items, types],
  )

  const visibleTypes = filter === 'all' ? types : [filter]
  const grouped = visibleTypes.map((type) => ({
    type,
    items: items.filter((item) => item.type === type),
  }))

  const isEmpty = items.length === 0

  return (
    <Section id="experience">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={sectionText(sections, 'experience.eyebrow')}
            title={sectionText(sections, 'experience.title')}
            subtitle={sectionText(sections, 'experience.subtitle') || undefined}
          />
          {types.length > 0 ? (
            <FilterTabs
              options={options}
              value={filter}
              onChange={setFilter}
              ariaLabel="Filter tipe pengalaman"
              className="self-start lg:self-auto"
            />
          ) : null}
        </div>

        {isEmpty ? (
          <div className="mt-12 rounded-card border border-dashed border-line bg-white/60 p-8 text-center">
            <PlaceholderNote>
              Belum ada pengalaman yang ditambahkan
            </PlaceholderNote>
            <p className="mt-3 text-sm text-slate-400">
              Data pengalaman dapat ditambahkan melalui admin dashboard atau
              langsung ke database.
            </p>
          </div>
        ) : (
          <div className="mt-12 space-y-12">
            {grouped.map((group) => {
              if (group.items.length === 0) return null

              return (
                <div key={group.type}>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-400 uppercase">
                      {group.type}
                    </h3>
                    <span aria-hidden="true" className="h-px flex-1 bg-line" />
                    <span className="text-xs font-medium text-slate-400 tabular-nums">
                      {group.items.length}
                    </span>
                  </div>

                  <ol className="mt-5">
                    {group.items.map((item, index) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isLast={index === group.items.length - 1}
                        delay={index * 80}
                      />
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </Section>
  )
}
