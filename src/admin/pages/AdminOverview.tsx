/**
 * Halaman Dashboard admin: statistik konten, quick actions, informasi
 * "Last Updated", dan ringkasan status tiap section.
 */

import {
  Briefcase,
  Check,
  Clock,
  FolderKanban,
  FolderPlus,
  GraduationCap,
  Pencil,
  Sparkles,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import IconTile from '../../components/ui/IconTile'
import { formatDateTime, formatRelativeTime } from '../../lib/formatDate'
import { cn } from '../../lib/cn'
import type { PortfolioData } from '../../types/portfolio'
import { AdminEmptyState, AdminPanel, AdminStatCard } from '../ui/AdminPanels'

interface AdminOverviewProps {
  data: PortfolioData
  onNavigate: (path: string) => void
}

interface QuickAction {
  label: string
  description: string
  path: string
  icon: LucideIcon
}

const quickActions: QuickAction[] = [
  {
    label: 'Edit Profile',
    description: 'Identitas, headline, dan foto profil',
    path: '/admin/profile',
    icon: UserRound,
  },
  {
    label: 'Add Project',
    description: 'Tambahkan project unggulan baru',
    path: '/admin/projects?new=1',
    icon: FolderPlus,
  },
  {
    label: 'Add Experience',
    description: 'Catat pengalaman kerja atau organisasi',
    path: '/admin/experience?new=1',
    icon: Briefcase,
  },
  {
    label: 'Manage Skills',
    description: 'Atur keahlian dan kategorinya',
    path: '/admin/skills',
    icon: Sparkles,
  },
]

interface ContentRow {
  label: string
  count: number
  detail: string
  path: string
  icon: LucideIcon
}

export default function AdminOverview({ data, onNavigate }: AdminOverviewProps) {
  const profile = data.profile

  const stats = {
    projects: data.projects.length,
    projectsWithThumbnail: data.projects.filter((item) => item.thumbnail_url).length,
    experience: data.experience.length,
    ongoingExperience: data.experience.filter((item) => !item.end_date).length,
    skills: data.skills.length,
    skillCategories: new Set(
      data.skills.map((skill) => skill.category.trim()).filter(Boolean),
    ).size,
    education: data.education.length,
    ongoingEducation: data.education.filter((item) => !item.end_year).length,
  }

  const contentRows: ContentRow[] = [
    {
      label: 'Projects',
      count: data.projects.length,
      detail: data.project_filters.length
        ? `${data.project_filters.length} filter kategori`
        : 'Belum ada filter kategori',
      path: '/admin/projects',
      icon: FolderKanban,
    },
    {
      label: 'Experience',
      count: data.experience.length,
      detail: 'Urutan tampil bisa diatur',
      path: '/admin/experience',
      icon: Briefcase,
    },
    {
      label: 'Skills',
      count: data.skills.length,
      detail: `${stats.skillCategories} kategori skill`,
      path: '/admin/skills',
      icon: Sparkles,
    },
    {
      label: 'Education',
      count: data.education.length,
      detail: 'Riwayat pendidikan',
      path: '/admin/education',
      icon: GraduationCap,
    },
    {
      label: 'Contact',
      count: data.contacts.length,
      detail: 'Email, sosial media, dan tautan lain',
      path: '/admin/contact',
      icon: UserRound,
    },
  ]

  const checklist: Array<{ label: string; done: boolean }> = [
    { label: 'Foto profil terpasang', done: Boolean(profile?.photo_url) },
    { label: 'Bio About sudah diisi', done: Boolean(profile?.bio?.trim()) },
    { label: 'Minimal 3 project di portfolio', done: stats.projects >= 3 },
    {
      label: 'Semua project punya thumbnail',
      done: stats.projects > 0 && stats.projectsWithThumbnail === stats.projects,
    },
    { label: 'Kontak bisa dihubungi', done: data.contacts.length > 0 },
  ]

  const updatedAt = profile?.updated_at ?? null
  const remainingChecks = checklist.filter((item) => !item.done).length

  const totalContent =
    stats.projects +
    stats.experience +
    stats.skills +
    stats.education +
    data.contacts.length

  return (
    <div className="space-y-6">
      {totalContent === 0 ? (
        <AdminPanel
          title="Portfolio masih kosong"
          description="Database belum punya konten apa pun, jadi halaman publik tampil dengan section kosong."
        >
          <AdminEmptyState
            icon={Sparkles}
            title="Mulai isi portfolio dari sini"
            description="Tambahkan project, pengalaman, atau skill pertama. Semua yang kamu simpan langsung tersimpan di database dan muncul di halaman publik."
            action={
              <button
                type="button"
                onClick={() => onNavigate('/admin/projects?new=1')}
                className="inline-flex h-10 items-center gap-2 rounded-pill bg-brand-700 px-5 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <FolderPlus aria-hidden="true" className="h-4 w-4" />
                Tambah Project
              </button>
            }
          />
        </AdminPanel>
      ) : null}

      <AdminPanel
        title="Ringkasan konten portfolio"
        description="Semua angka di bawah diambil langsung dari database portfolio."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={FolderKanban}
            label="Total Projects"
            value={stats.projects}
            hint={`${stats.projectsWithThumbnail} punya thumbnail`}
            tone="solid"
          />
          <AdminStatCard
            icon={Briefcase}
            label="Total Experiences"
            value={stats.experience}
            hint={`${stats.ongoingExperience} masih berjalan`}
          />
          <AdminStatCard
            icon={Sparkles}
            label="Total Skills"
            value={stats.skills}
            hint={`${stats.skillCategories} kategori`}
          />
          <AdminStatCard
            icon={GraduationCap}
            label="Total Education"
            value={stats.education}
            hint={`${stats.ongoingEducation} masih berjalan`}
          />
        </div>
      </AdminPanel>

      <AdminPanel
        title="Quick actions"
        description="Jalan pintas ke pekerjaan yang paling sering dilakukan."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.path)}
                className="group flex items-start gap-3.5 rounded-card border border-line bg-white p-4 text-left transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5"
              >
                <IconTile
                  icon={Icon}
                  size="md"
                  tone="soft"
                  className="group-hover:bg-brand-100"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                    {action.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminPanel
          className="lg:col-span-2"
          title="Status konten"
          description="Jumlah item per section yang tampil di halaman publik."
          bodyClassName="p-0 sm:p-0"
        >
          <ul className="divide-y divide-line">
            {contentRows.map((row) => {
              const Icon = row.icon

              return (
                <li
                  key={row.label}
                  className="flex items-center gap-4 px-5 py-4 transition duration-200 hover:bg-surface/70 sm:px-6"
                >
                  <IconTile icon={Icon} size="md" tone="soft" />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-navy">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                      {row.detail}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg font-extrabold text-navy tabular-nums">
                      {row.count}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate(row.path)}
                    className="hidden h-9 shrink-0 items-center gap-1.5 rounded-pill border border-line bg-white px-3.5 text-xs font-semibold text-slate-600 transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:inline-flex"
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    Kelola
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-line px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => onNavigate('/admin/projects')}
              className="text-xs font-semibold text-brand-700 transition duration-200 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:hidden"
            >
              Kelola Projects
            </button>
          </div>
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="Last Updated">
            <div className="flex items-start gap-4">
              <IconTile icon={Clock} size="md" tone="solid" />
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-navy">
                  {formatDateTime(updatedAt) || 'Belum ada pembaruan'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatRelativeTime(updatedAt) || 'Data profil masih bawaan awal'}
                </p>
              </div>
            </div>

            <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-slate-400">
              Waktu ini diperbarui otomatis setiap kali profil atau foto profil
              disimpan. Total{' '}
              <span className="font-semibold text-slate-500">
                {totalContent}
              </span>{' '}
              item konten dikelola dari dashboard ini.
            </p>
          </AdminPanel>

          <AdminPanel
            title="Kelengkapan konten"
            description={
              remainingChecks === 0
                ? 'Semua bagian penting sudah terisi.'
                : `${remainingChecks} hal masih perlu dilengkapi.`
            }
          >
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                      item.done
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600',
                    )}
                  >
                    {item.done ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-sm leading-relaxed',
                      item.done ? 'text-slate-500' : 'font-medium text-navy',
                    )}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </AdminPanel>
        </div>
      </div>
    </div>
  )
}
