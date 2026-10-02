/**
 * Migrasi data dari database lama (SQLite) ke database baru (PostgreSQL).
 *
 * Memindahkan seluruh konten apa adanya — id dipertahankan, jadi `Project.tags`
 * yang merujuk `ProjectFilter.key` tetap cocok dan URL foto lama tetap valid.
 *
 * Yang dipindahkan:
 *   profile, experience, skills, projects, project_filters, education,
 *   contacts → social_links, sections, settings, contact_messages, admin_users
 *
 * Yang TIDAK dipindahkan:
 *   admin_sessions — sesi login lama dibuang; token hash-nya memakai encoding
 *   berbeda dan sesi login memang sebaiknya dibuat ulang setelah pindah server.
 *   Admin cukup login sekali dengan password lamanya (format hash scrypt-nya
 *   sama persis, jadi password tidak perlu diganti).
 *
 * Pakai:
 *   npm run db:migrate-data              # dari ../server/data/portfolio.db
 *   npm run db:migrate-data -- --dry-run # lihat dulu, tanpa menulis
 *   npm run db:migrate-data -- --force   # timpa isi database tujuan
 *
 * Prasyarat: `DATABASE_URL` sudah menunjuk database tujuan yang sudah dimigrasi
 * (`npm run db:deploy`).
 */

import { existsSync, readdirSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { prisma } from '../src/lib/prisma.js'
import { env } from '../src/config/env.js'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

const dryRun = args.includes('--dry-run')
const force = args.includes('--force')

function argValue(name, fallback) {
  const index = args.indexOf(name)
  if (index === -1) return fallback
  return args[index + 1] ?? fallback
}

const sqlitePath = resolve(
  here,
  '..',
  argValue('--from', process.env.SQLITE_PATH ?? '../server/data/portfolio.db'),
)

/* --------------------------------- helper --------------------------------- */

/** Kolom JSON di SQLite disimpan sebagai teks, mis. `["a","b"]`. */
function jsonList(value) {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string' || value.trim().length === 0) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toBool(value) {
  return value === 1 || value === true || value === '1'
}

function optionalText(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/* --------------------------------- pindahan -------------------------------- */

async function migrateTable(label, rows, insert) {
  const found = rows.length

  if (dryRun) {
    console.log(`  ${label}: ${found} baris (dry-run, tidak ditulis)`)
    return
  }

  if (found === 0) {
    console.log(`  ${label}: 0 baris, dilewati`)
    return
  }

  const result = await insert()
  const written = typeof result?.count === 'number' ? result.count : found
  console.log(`  ${label}: ${written} baris dipindahkan`)
}

/** Salin berkas upload supaya foto profil & thumbnail project tetap tampil. */
function migrateUploads() {
  const source = join(dirname(sqlitePath), 'uploads')

  if (!existsSync(source)) {
    console.log('  uploads: folder sumber tidak ada, dilewati')
    return
  }

  const files = readdirSync(source)
  if (files.length === 0) {
    console.log('  uploads: tidak ada berkas, dilewati')
    return
  }

  const target = resolve(process.cwd(), env.uploadDir)

  if (dryRun) {
    console.log(`  uploads: ${files.length} berkas → ${target} (dry-run)`)
    return
  }

  mkdirSync(target, { recursive: true })

  let copied = 0
  for (const file of files) {
    const destination = join(target, file)
    // Berkas yang sudah ada tidak ditimpa — upload baru di server tujuan lebih
    // penting daripada versi lama.
    if (existsSync(destination)) continue
    copyFileSync(join(source, file), destination)
    copied += 1
  }

  console.log(`  uploads: ${copied} berkas disalin, ${files.length - copied} dilewati`)
}

/* ---------------------------------- jalur ---------------------------------- */

if (!existsSync(sqlitePath)) {
  console.error(
    `\nBerkas SQLite tidak ditemukan: ${sqlitePath}\n` +
      'Tentukan lokasinya dengan --from, mis.:\n' +
      '  npm run db:migrate-data -- --from C:/Portofolio/server/data/portfolio.db\n',
  )
  process.exit(1)
}

const source = new DatabaseSync(sqlitePath, { readOnly: true })
const table = (name) => {
  const exists = source
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name)
  return exists ? source.prepare(`SELECT * FROM ${name}`).all() : []
}

console.log(`\nMigrasi data SQLite → PostgreSQL`)
console.log(`  sumber : ${sqlitePath}`)
console.log(`  tujuan : ${env.databaseUrl?.replace(/:[^:@/]+@/, ':***@') ?? '(DATABASE_URL kosong)'}`)
console.log(`  mode   : ${dryRun ? 'dry-run' : force ? 'timpa isi tujuan' : 'tambah ke tujuan'}\n`)

// Isi database tujuan yang sudah ada akan ditimpa, jadi harus disengaja.
if (!dryRun && !force) {
  const [existing] = await Promise.all([prisma.project.count()])
  if (existing > 0) {
    console.error(
      'Database tujuan sudah berisi data. Jalankan ulang dengan --force bila\n' +
        'memang ingin menimpanya (isi tabel akan dikosongkan lebih dulu):\n' +
        '  npm run db:migrate-data -- --force\n',
    )
    process.exit(1)
  }
}

const rows = {
  profile: table('profile'),
  experience: table('experience'),
  skills: table('skills'),
  projects: table('projects'),
  projectFilters: table('project_filters'),
  education: table('education'),
  contacts: table('contacts'),
  sections: table('sections'),
  settings: table('settings'),
  messages: table('contact_messages'),
  admins: table('admin_users'),
}

async function run() {
  if (!dryRun && force) {
    console.log('Mengosongkan tabel tujuan...')
    // Urutan ini menghormati foreign key (sesi dulu, baru pemiliknya).
    await prisma.adminSession.deleteMany()
    await prisma.adminUser.deleteMany()
    await prisma.contactMessage.deleteMany()
    await prisma.section.deleteMany()
    await prisma.setting.deleteMany()
    await prisma.socialLink.deleteMany()
    await prisma.certificate.deleteMany()
    await prisma.education.deleteMany()
    await prisma.projectFilter.deleteMany()
    await prisma.project.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.experience.deleteMany()
    await prisma.profile.deleteMany()
    console.log('')
  }

  console.log('Konten:')

  await migrateTable('profile', rows.profile, () =>
    prisma.profile.create({
      data: {
        id: 1,
        name: rows.profile[0].name,
        logo: optionalText(rows.profile[0].logo),
        greeting: optionalText(rows.profile[0].greeting),
        headline: optionalText(rows.profile[0].headline),
        short_description: optionalText(rows.profile[0].short_description),
        availability: optionalText(rows.profile[0].availability),
        bio: optionalText(rows.profile[0].bio),
        education: optionalText(rows.profile[0].education),
        major: optionalText(rows.profile[0].major),
        focus: jsonList(rows.profile[0].focus),
        status: optionalText(rows.profile[0].status),
        photo_url: optionalText(rows.profile[0].photo_url),
      },
    }),
  )

  await migrateTable('experience', rows.experience, () =>
    prisma.experience.createMany({
      data: rows.experience.map((row) => ({
        id: row.id,
        position: row.position,
        company: row.company,
        type: row.type ?? 'Work Experience',
        start_date: optionalText(row.start_date),
        end_date: optionalText(row.end_date),
        // Data lama menandai "masih berjalan" lewat end_date yang kosong.
        is_current: !row.end_date,
        description: optionalText(row.description),
        skills: jsonList(row.skills),
        sort_order: row.sort_order ?? 0,
      })),
    }),
  )

  await migrateTable('skills', rows.skills, () =>
    prisma.skill.createMany({
      data: rows.skills.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        sort_order: row.sort_order ?? 0,
      })),
    }),
  )

  await migrateTable('projects', rows.projects, () =>
    prisma.project.createMany({
      data: rows.projects.map((row) => ({
        id: row.id,
        title: row.title,
        description: optionalText(row.description),
        full_description: optionalText(row.full_description),
        category: optionalText(row.category),
        thumbnail_url: optionalText(row.thumbnail_url),
        tools: jsonList(row.tools),
        url: optionalText(row.url),
        github_url: optionalText(row.github_url),
        tags: jsonList(row.tags),
        featured: toBool(row.featured),
        published: row.published === undefined ? true : toBool(row.published),
        sort_order: row.sort_order ?? 0,
      })),
    }),
  )

  await migrateTable('project_filters', rows.projectFilters, () =>
    prisma.projectFilter.createMany({
      data: rows.projectFilters.map((row) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        sort_order: row.sort_order ?? 0,
      })),
    }),
  )

  await migrateTable('education', rows.education, () =>
    prisma.education.createMany({
      data: rows.education.map((row) => ({
        id: row.id,
        institution: row.institution,
        degree: optionalText(row.degree),
        major: optionalText(row.major),
        start_year: optionalText(row.start_year),
        end_year: optionalText(row.end_year),
        description: optionalText(row.description),
        sort_order: row.sort_order ?? 0,
      })),
    }),
  )

  // Tabel `contacts` lama menjadi `social_links`: kolom `kind` → `platform`.
  await migrateTable('contacts → social_links', rows.contacts, () =>
    prisma.socialLink.createMany({
      data: rows.contacts.map((row) => ({
        id: row.id,
        platform: row.kind,
        label: optionalText(row.label),
        value: optionalText(row.value),
        url: optionalText(row.url),
        is_active: true,
        sort_order: row.sort_order ?? 0,
      })),
    }),
  )

  console.log('\nTeks & pesan:')

  await migrateTable('sections', rows.sections, () =>
    prisma.section.createMany({
      data: rows.sections.map((row) => ({ key: row.key, value: row.value ?? '' })),
    }),
  )

  await migrateTable('settings', rows.settings, () =>
    prisma.setting.createMany({
      data: rows.settings.map((row) => ({ key: row.key, value: row.value ?? '' })),
    }),
  )

  await migrateTable('contact_messages', rows.messages, () =>
    prisma.contactMessage.createMany({
      data: rows.messages.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        is_read: toBool(row.is_read),
        created_at: toDate(row.created_at) ?? new Date(),
      })),
    }),
  )

  console.log('\nAkun admin:')

  await migrateTable('admin_users', rows.admins, () =>
    prisma.adminUser.createMany({
      data: rows.admins.map((row) => ({
        id: row.id,
        email: row.email.toLowerCase(),
        // Format hash scrypt lama sama persis dengan yang baru, jadi password
        // admin tetap berlaku dan tidak perlu direset.
        password_hash: row.password_hash,
        role: row.role ?? 'admin',
      })),
    }),
  )

  console.log('\nBerkas upload:')
  migrateUploads()

  if (!dryRun) {
    // Urutan auto-increment di Postgres tidak ikut naik saat id ditulis manual,
    // jadi tanpa langkah ini baris baru bisa bentrok id dengan data lama.
    console.log('\nMenyelaraskan urutan id otomatis...')
    const sequences = [
      'experience',
      'skills',
      'projects',
      'project_filters',
      'education',
      'social_links',
      'contact_messages',
      'admin_users',
    ]

    for (const name of sequences) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${name}', 'id'), COALESCE((SELECT MAX(id) FROM ${name}), 0) + 1, false)`,
      )
    }
    console.log(`  ${sequences.length} urutan diselaraskan`)
  }
}

await run()

const counts = dryRun
  ? null
  : {
      profile: await prisma.profile.count(),
      experience: await prisma.experience.count(),
      skills: await prisma.skill.count(),
      projects: await prisma.project.count(),
      project_filters: await prisma.projectFilter.count(),
      education: await prisma.education.count(),
      social_links: await prisma.socialLink.count(),
      sections: await prisma.section.count(),
      settings: await prisma.setting.count(),
      contact_messages: await prisma.contactMessage.count(),
      admin_users: await prisma.adminUser.count(),
    }

if (counts) {
  console.log('\nIsi database tujuan sekarang:')
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count}`)
  }
}

console.log('\nSelesai.\n')
source.close()
await prisma.$disconnect()
