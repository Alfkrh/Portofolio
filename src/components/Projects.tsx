import { useMemo, useState } from 'react'
import { ArrowUpRight, ImageIcon, Star } from 'lucide-react'
import type { Project, ProjectFilter, SectionTexts } from '../types/portfolio'
import { sectionText, uiCopy } from '../config/siteCopy'
import Container from './ui/Container'
import FilterTabs, { type FilterOption } from './ui/FilterTabs'
import PlaceholderNote from './ui/PlaceholderNote'
import Reveal from './ui/Reveal'
import Section from './ui/Section'
import SectionHeading from './ui/SectionHeading'
import Tag from './ui/Tag'
import { cn } from '../lib/cn'

const ALL_FILTER = 'all'

/** Inisial untuk placeholder thumbnail yang dibuat otomatis. */
function getInitials(title: string) {
  return title
    .split(' ')
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

interface ProjectCardProps {
  project: Project
}

/** Kartu project: thumbnail, judul, deskripsi, kategori, tools, dan CTA. */
function ProjectCard({ project }: ProjectCardProps) {
  const tools = project.tools.filter((tool) => tool.trim().length > 0)
  const category = project.category?.trim()
  const hasUrl = Boolean(project.url)
  const isExternal = project.url?.startsWith('http') ?? false

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-soft transition duration-300 ease-out hover:border-brand-200 hover:shadow-lift motion-safe:hover:-translate-y-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-line bg-surface">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={`Thumbnail project ${project.title}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
          />
        ) : (
          /* Placeholder thumbnail — dibuat dari data project, bukan gambar orang. */
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-50">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,var(--color-brand-100)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-brand-100)_1px,transparent_1px)] [background-size:32px_32px]"
            />
            <span className="relative font-display text-4xl font-extrabold tracking-tight text-brand-200 transition duration-500 ease-out motion-safe:group-hover:scale-105">
              {getInitials(project.title)}
            </span>
            <span className="absolute bottom-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
              Thumbnail belum ditambahkan
            </span>
          </div>
        )}

        {/* Lapisan hover halus di atas thumbnail. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-navy/0 transition duration-300 ease-out group-hover:bg-navy/5"
        />

        {category ? (
          <span className="absolute top-4 left-4">
            <Tag tone="neutral" className="bg-white/95 shadow-soft backdrop-blur-sm">
              {category}
            </Tag>
          </span>
        ) : null}

        {project.featured ? (
          <span className="absolute top-4 right-4">
            <Tag
              tone="brand"
              className="inline-flex items-center gap-1 bg-white/95 shadow-soft backdrop-blur-sm"
            >
              <Star aria-hidden="true" className="h-3 w-3 fill-brand-600 text-brand-600" />
              Featured
            </Tag>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-7">
        <h3 className="text-base font-bold text-navy transition duration-200 group-hover:text-brand-700 sm:text-lg">
          {project.title}
        </h3>

        {project.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">
            {project.description}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Deskripsi project belum ditambahkan.
          </p>
        )}

        <div className="mt-5">
          {tools.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <li key={tool}>
                  <Tag tone="brand">{tool}</Tag>
                </li>
              ))}
            </ul>
          ) : (
            <PlaceholderNote>Tools belum ditambahkan</PlaceholderNote>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5">
          {hasUrl ? (
            <a
              href={project.url ?? '#'}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer' : undefined}
              className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-brand-700 transition duration-200 ease-out hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              {uiCopy.viewProject}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : (
            <span
              title="Tautan project belum ditambahkan"
              className="inline-flex cursor-not-allowed items-center gap-2 text-sm font-semibold text-slate-400"
            >
              {uiCopy.viewProject}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

interface ProjectsProps {
  projects: Project[]
  /** Filter dari database; "All" selalu ditambahkan di UI. */
  filters: ProjectFilter[]
  sections: SectionTexts
}

export default function Projects({ projects, filters, sections }: ProjectsProps) {
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER)

  /* Project yang belum dipublikasikan tidak pernah tampil di halaman publik. */
  const publishedProjects = useMemo(
    () => projects.filter((project) => project.published !== false),
    [projects],
  )

  const options = useMemo<FilterOption<string>[]>(
    () => [
      { id: ALL_FILTER, label: uiCopy.allFilter, count: publishedProjects.length },
      ...filters.map((filter) => ({
        id: filter.key,
        label: filter.label,
        count: publishedProjects.filter((project) =>
          project.tags.includes(filter.key),
        ).length,
      })),
    ],
    [filters, publishedProjects],
  )

  // Jaga-jaga bila filter aktif sudah tidak ada lagi di database.
  const currentFilter =
    activeFilter === ALL_FILTER ||
    filters.some((filter) => filter.key === activeFilter)
      ? activeFilter
      : ALL_FILTER

  const visibleProjects =
    currentFilter === ALL_FILTER
      ? publishedProjects
      : publishedProjects.filter((project) =>
          project.tags.includes(currentFilter),
        )

  return (
    <Section
      id="projects"
      size="large"
      className="relative overflow-hidden border-y border-brand-100/70 bg-brand-50/50"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-8rem] h-72 w-72 rounded-full bg-brand-100/50 blur-3xl"
      />

      <Container className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={sectionText(sections, 'projects.eyebrow')}
            title={sectionText(sections, 'projects.title')}
            subtitle={sectionText(sections, 'projects.subtitle') || undefined}
          />

          {filters.length > 0 ? (
            <FilterTabs
              options={options}
              value={currentFilter}
              onChange={setActiveFilter}
              ariaLabel="Filter kategori project"
              className="self-start bg-white lg:self-auto"
            />
          ) : null}
        </div>

        {visibleProjects.length > 0 ? (
          <div className={cn('mt-12 grid gap-6', 'md:grid-cols-2 lg:grid-cols-3')}>
            {visibleProjects.map((project, index) => (
              <Reveal key={project.id} delay={index * 80} className="h-full">
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-card border border-dashed border-brand-100 bg-white/70 p-10 text-center">
            <PlaceholderNote>
              {publishedProjects.length === 0
                ? 'Belum ada project yang ditambahkan'
                : 'Belum ada project pada kategori ini'}
            </PlaceholderNote>
            <p className="mt-3 text-sm text-slate-400">
              Project dapat ditambahkan melalui admin dashboard atau langsung ke
              database.
            </p>
          </div>
        )}
      </Container>
    </Section>
  )
}
