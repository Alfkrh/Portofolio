import { useMemo } from 'react'
import { Code, Database, Palette, PenTool, Sparkles, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SectionTexts, Skill } from '../types/portfolio'
import { sectionText } from '../config/siteCopy'
import Container from './ui/Container'
import IconTile from './ui/IconTile'
import PlaceholderNote from './ui/PlaceholderNote'
import Reveal from './ui/Reveal'
import Section from './ui/Section'
import SectionHeading from './ui/SectionHeading'
import Tag from './ui/Tag'
import { cn } from '../lib/cn'

/** Ikon berdasarkan nama kategori; kategori baru memakai ikon generik. */
const ICONS_BY_CATEGORY: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /ui|ux|design/i, icon: PenTool },
  { match: /web|front|back|program|develop/i, icon: Code },
  { match: /data|sql|db/i, icon: Database },
  { match: /creative|visual|video|content/i, icon: Palette },
  { match: /tool|device|software/i, icon: Wrench },
]

function iconForCategory(category: string): LucideIcon {
  return (
    ICONS_BY_CATEGORY.find((entry) => entry.match.test(category))?.icon ??
    Sparkles
  )
}

interface SkillsProps {
  skills: Skill[]
  sections: SectionTexts
}

export default function Skills({ skills, sections }: SkillsProps) {
  const groups = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const skill of skills) {
      const category = skill.category.trim() || 'Other'
      const names = map.get(category) ?? []
      names.push(skill.name)
      map.set(category, names)
    }

    return Array.from(map, ([category, names]) => ({ category, names }))
  }, [skills])

  return (
    <Section id="skills" className="border-y border-line bg-white">
      <Container>
        <SectionHeading
          eyebrow={sectionText(sections, 'skills.eyebrow')}
          title={sectionText(sections, 'skills.title')}
          subtitle={sectionText(sections, 'skills.subtitle') || undefined}
        />

        {groups.length === 0 ? (
          <div className="mt-12 rounded-card border border-dashed border-line bg-surface/60 p-8 text-center">
            <PlaceholderNote>Belum ada skill yang ditambahkan</PlaceholderNote>
          </div>
        ) : (
          /* Baris pertama: tiga kartu, baris kedua: dua kartu lebih lebar. */
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
            {groups.map((group, index) => {
              const Icon = iconForCategory(group.category)

              return (
                <Reveal
                  key={group.category}
                  delay={index * 70}
                  className={cn(
                    'h-full',
                    index < 3 ? 'lg:col-span-2' : 'lg:col-span-3',
                  )}
                >
                  <article className="flex h-full flex-col rounded-card border border-line bg-surface/60 p-6 transition duration-300 ease-out hover:border-brand-200 hover:bg-white hover:shadow-lift motion-safe:hover:-translate-y-1 sm:p-7">
                    <IconTile icon={Icon} size="md" tone="solid" />

                    <h3 className="mt-5 text-lg font-bold text-navy">
                      {group.category}
                    </h3>

                    <p className="mt-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                      {group.names.length} skills
                    </p>

                    <ul className="mt-5 flex flex-wrap gap-2">
                      {group.names.map((name) => (
                        <li key={name}>
                          <Tag tone="brand">{name}</Tag>
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              )
            })}
          </div>
        )}
      </Container>
    </Section>
  )
}
