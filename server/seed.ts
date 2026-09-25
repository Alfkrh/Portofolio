/**
 * Konten awal portfolio (dipakai sekali saat database masih kosong).
 *
 * Sejak konten dipindahkan ke database, file ini HANYA berisi data seed — bukan
 * sumber data yang dibaca oleh website. Website selalu membaca dari API
 * (`/api/portfolio`) yang mengambil data dari SQLite.
 *
 * Hapus `server/data/portfolio.db` lalu jalankan ulang server untuk mengisi
 * ulang database dengan data ini.
 */

export interface SeedData {
  profile: {
    name: string
    logo: string
    greeting: string
    headline: string
    short_description: string
    availability: string | null
    bio: string
    education: string
    major: string
    focus: string[]
    status: string
    photo_url: string | null
  }
  experience: Array<{
    position: string
    company: string
    type: string
    start_date: string | null
    end_date: string | null
    description: string
    skills: string[]
  }>
  skills: Array<{ name: string; category: string }>
  projects: Array<{
    title: string
    description: string
    /** Deskripsi panjang (opsional) untuk halaman detail project. */
    full_description: string | null
    category: string
    thumbnail_url: string | null
    tools: string[]
    url: string | null
    github_url: string | null
    /** Key filter yang cocok dengan `projectFilters[].key`. */
    tags: string[]
    /** Project unggulan (mendapat penanda di halaman publik). */
    featured: boolean
    /** `false` = tidak tampil di halaman publik. */
    published: boolean
  }>
  /** Daftar filter section Projects (label bisa diubah dari database). */
  projectFilters: Array<{ key: string; label: string }>
  education: Array<{
    institution: string
    degree: string
    major: string
    start_year: string | null
    end_year: string | null
    description: string | null
  }>
  contacts: Array<{
    kind: string
    label: string
    value: string | null
    url: string | null
  }>
  sections: Record<string, string>
}

export const seedData: SeedData = {
  profile: {
    name: 'Alif Fikri',
    logo: 'ALIF.',
    greeting: "Hello, I'm",
    headline: 'Information Systems Student & Digital Creative',
    short_description:
      'Saya adalah mahasiswa Sistem Informasi yang tertarik pada UI/UX Design, Web Development, dan teknologi digital. Saya senang mengubah ide menjadi desain dan solusi digital yang sederhana, fungsional, dan mudah digunakan.',
    // TODO(konten): isi status ketersediaan, mis. "Open to internship".
    availability: null,
    bio: [
      'Saya menggabungkan sisi desain dan teknologi untuk membangun produk digital yang terasa sederhana saat digunakan.',
      'Saya Alif Fikri, mahasiswa S1 Sistem Informasi di Universitas Nusa Mandiri. Saya menikmati proses memahami kebutuhan pengguna, menyusun alur yang jelas, lalu menerjemahkannya menjadi antarmuka yang rapi dan mudah dipahami.',
      'Ketertarikan saya berada di antara desain dan pengembangan: mulai dari merancang UI di Figma, membangun halaman web, sampai mengolah konten video untuk kebutuhan branding digital.',
    ].join('\n\n'),
    education: 'Universitas Nusa Mandiri',
    major: 'S1 Sistem Informasi',
    focus: ['UI/UX Design', 'Web Development', 'Digital Technology'],
    status: 'Information Systems Student',
    photo_url: null,
  },
  experience: [
    {
      position: 'Video Editor',
      company: 'Sahabat Merantau',
      type: 'Work Experience',
      start_date: '2025-02',
      end_date: '2025-08',
      description:
        'Mengelola dan mengembangkan konten video untuk media sosial dengan menggabungkan storytelling, visual branding, dan editing yang sesuai dengan karakter audiens.',
      // TODO(konten): tambahkan skill yang benar-benar dipakai, mis. ['Video Editing'].
      skills: [],
    },
  ],
  skills: [
    { name: 'Figma', category: 'UI/UX Design' },
    { name: 'Design Thinking', category: 'UI/UX Design' },
    { name: 'Wireframing', category: 'UI/UX Design' },
    { name: 'Prototyping', category: 'UI/UX Design' },
    { name: 'User Interface Design', category: 'UI/UX Design' },
    { name: 'HTML', category: 'Web Development' },
    { name: 'CSS', category: 'Web Development' },
    { name: 'PHP', category: 'Web Development' },
    { name: 'JavaScript', category: 'Web Development' },
    { name: 'MySQL', category: 'Database' },
    { name: 'Video Editing', category: 'Creative' },
    { name: 'Visual Design', category: 'Creative' },
    { name: 'Git', category: 'Tools' },
    { name: 'GitHub', category: 'Tools' },
    { name: 'Canva', category: 'Tools' },
  ],
  projectFilters: [
    { key: 'ui-ux', label: 'UI/UX' },
    { key: 'web-development', label: 'Web Development' },
    { key: 'academic', label: 'Academic' },
  ],
  projects: [
    {
      title: 'Website Presensi PKL & Magang',
      category: 'Web Development',
      description:
        'Web application untuk membantu proses presensi peserta PKL dan Magang dengan fitur monitoring, pengajuan izin, dan laporan presensi.',
      // TODO(konten): isi deskripsi lengkap, tools, URL, dan thumbnail project.
      full_description: null,
      tools: [],
      url: null,
      github_url: null,
      thumbnail_url: null,
      tags: ['web-development'],
      featured: false,
      published: true,
    },
    {
      title: 'Prime Fit Gym',
      category: 'UI/UX',
      description:
        'Perancangan UI/UX website membership gym dengan fokus pada pengalaman pengguna yang sederhana dan modern.',
      full_description: null,
      tools: [],
      url: null,
      github_url: null,
      thumbnail_url: null,
      tags: ['ui-ux'],
      featured: false,
      published: true,
    },
    {
      title: 'Yoehan Fitness',
      category: 'UI/UX',
      description:
        'Perancangan sistem membership gym untuk membantu digitalisasi proses pendaftaran dan pengelolaan member.',
      full_description: null,
      tools: [],
      url: null,
      github_url: null,
      thumbnail_url: null,
      tags: ['ui-ux'],
      featured: false,
      published: true,
    },
  ],
  education: [
    {
      institution: 'Universitas Nusa Mandiri',
      degree: 'S1',
      major: 'Sistem Informasi',
      // TODO(konten): isi tahun pendidikan, mis. '2023' dan 'Sekarang'.
      start_year: null,
      end_year: null,
      description: null,
    },
  ],
  contacts: [
    // TODO(kontak): isi `value` dan `url` agar tampil sebagai tautan aktif.
    { kind: 'email', label: 'Email', value: null, url: null },
    { kind: 'linkedin', label: 'LinkedIn', value: null, url: null },
    { kind: 'github', label: 'GitHub', value: null, url: null },
    { kind: 'instagram', label: 'Instagram', value: null, url: null },
  ],
  sections: {
    'hero.primary_cta_label': 'View My Work',
    'hero.secondary_cta_label': 'Contact Me',
    'nav.cta_label': "Let's Talk",
    'about.eyebrow': 'Get to know me',
    'about.title': 'About Me',
    'about.cta_label': 'More About Me',
    'experience.eyebrow': 'My journey',
    'experience.title': 'Experience',
    'experience.subtitle':
      'Experiences that have helped me grow and develop my skills.',
    'skills.eyebrow': 'What I do',
    'skills.title': 'Skills & Expertise',
    'skills.subtitle':
      'Kemampuan yang saya gunakan sehari-hari untuk merancang, membangun, dan menyajikan produk digital.',
    'projects.eyebrow': 'Portfolio',
    'projects.title': 'Selected Projects',
    'projects.subtitle': "Some of the projects I've worked on.",
    'education.eyebrow': 'Academic background',
    'education.title': 'Education',
    'education.subtitle':
      'Latar belakang pendidikan yang menjadi dasar cara saya belajar dan bekerja.',
    'contact.eyebrow': 'Contact',
    'contact.title': "Let's Work Together",
    'contact.description':
      'Have a project, opportunity, or just want to say hello? Feel free to reach out.',
    'contact.form_note':
      'Form ini masih demo (belum terhubung ke backend). Hubungkan ke API/database pada tahap berikutnya.',
    'footer.tagline': 'Information Systems Student & Digital Creative',
  },
}
