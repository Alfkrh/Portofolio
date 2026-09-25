# Alif Fikri — Personal Portfolio

Portfolio publik yang sepenuhnya **dynamic**: seluruh konten (profil, about,
pengalaman, skill, project, pendidikan, kontak) dibaca dari **database SQLite**
lewat REST API. Tidak ada konten portfolio yang di-hardcode di frontend.

## Stack

- **Frontend**: React 19 + TypeScript (Vite), Tailwind CSS v4, Lucide React
- **Backend**: Node.js (`node:http`) + **`node:sqlite`** — database SQLite bawaan
  Node 24, jadi tanpa dependency native tambahan dan tanpa langkah build server
- **Database**: SQLite (`server/data/portfolio.db`), otomatis dibuat dan diisi
  konten awal saat pertama dijalankan
- Font: Inter + Plus Jakarta Sans (Google Fonts)

## Menjalankan

```bash
npm install
npm run dev      # dev: frontend + API + database dalam satu perintah
npm run build    # typecheck + build frontend ke dist/
npm run start    # produksi: server API + serve dist/ (PORT default 3000)
npm run lint     # eslint
```

`npm run dev` sudah termasuk backend: API dipasang sebagai middleware di dev
server Vite, jadi tidak perlu menjalankan proses kedua.

## Arsitektur

```
server/                     # backend (dijalankan langsung oleh Node, tanpa build)
  index.ts                  # server produksi: API + file upload + serve dist/
  vitePlugin.ts             # memasang API di dev server Vite
  api.ts                    # routing REST + validasi upload
  db.ts                     # schema SQLite, query, dan operasi tulis
  seed.ts                   # konten awal (hanya dipakai saat database kosong)
  data/                     # runtime: portfolio.db + uploads/ (gitignored)

src/
  App.tsx                   # membaca store, merender state loading/error/siap
  services/
    portfolioApi.ts         # klien REST API
    portfolioStore.ts       # sumber data eksternal + auto refresh
    adminToken.ts           # token admin (sessionStorage) untuk request tulis
  hooks/                    # usePortfolio, useProfilePhoto, useReveal, dll
  config/siteCopy.ts        # label UI + fallback teks section
  components/               # satu komponen per section + primitive di ui/
  types/portfolio.ts        # kontrak data (dipakai server & frontend)
```

Alur data: **SQLite → `GET /api/portfolio` → `portfolioStore` → komponen section**.
Tidak ada teks konten yang ditulis di dalam komponen.

### Update otomatis

Halaman memuat ulang konten saat tab kembali aktif/fokus
(`watchPortfolioRefresh` di `portfolioStore`), sehingga perubahan yang dilakukan
admin langsung terlihat tanpa reload manual. Setiap perubahan dari halaman ini
(mis. upload foto) juga langsung menyegarkan data.

## API

| Method | Endpoint                    | Keterangan                              |
| ------ | --------------------------- | --------------------------------------- |
| GET    | `/api/portfolio`            | Seluruh konten (dipakai halaman publik)  |
| GET    | `/api/profile`              | Profil saja                             |
| PUT    | `/api/profile`              | Ubah profil (partial)                   |
| POST   | `/api/profile/photo`        | Upload foto profil (raw image body)     |
| DELETE | `/api/profile/photo`        | Hapus foto profil                       |
| GET    | `/api/sections`             | Teks section (judul, eyebrow, CTA)      |
| PUT    | `/api/sections`             | Ubah teks section                       |
| POST   | `/api/uploads`              | Upload gambar → `{ url }` (thumbnail)   |
| GET    | `/uploads/:file`            | File hasil upload                       |
| GET    | `/api/:collection`          | `experience`, `skills`, `projects`,     |
| POST   | `/api/:collection`          | `project_filters`, `education`,         |
| GET    | `/api/:collection/:id`      | Detail satu item                        |
| PUT    | `/api/:collection/:id`      | Ubah satu item                          |
| DELETE | `/api/:collection/:id`      | Hapus satu item                         |

Contoh:

```bash
curl http://localhost:5173/api/portfolio

curl -X PUT http://localhost:5173/api/profile \
  -H 'content-type: application/json' \
  -d '{"availability":"Open to internship","photo_url":null}'

curl -X POST http://localhost:5173/api/experience \
  -H 'content-type: application/json' \
  -d '{"position":"Video Editor","company":"Sahabat Merantau","type":"Work Experience","start_date":"2025-02","end_date":"2025-08","skills":["Video Editing"]}'
```

### Proteksi endpoint tulis

Set `PORTFOLIO_ADMIN_TOKEN` sebelum menjalankan server, lalu kirim header
`Authorization: Bearer <token>` pada POST/PUT/DELETE. Bila token tidak di-set,
endpoint tulis terbuka (mode pengembangan lokal).

Token di sisi browser disimpan di `sessionStorage` melalui
`src/services/adminToken.ts` — **tidak** di-bake ke bundle. Admin dashboard nanti
cukup memanggil `setAdminToken()`.

### Environment

| Variabel                 | Default              | Keterangan                        |
| ------------------------ | -------------------- | --------------------------------- |
| `PORT`                   | `3000`               | Port `npm run start`              |
| `HOST`                   | `127.0.0.1`          | Host `npm run start`              |
| `PORTFOLIO_DATA_DIR`     | `server/data`        | Folder database + upload          |
| `PORTFOLIO_DB_PATH`      | `<data>/portfolio.db`| Path file SQLite                  |
| `PORTFOLIO_ADMIN_TOKEN`  | _(kosong)_           | Token wajib untuk request tulis   |
| `VITE_API_BASE`          | `/api`               | Base URL API di frontend          |

## Data yang ditampilkan

| Section    | Field                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| Profile    | name, photo (`photo_url`), headline, short description, availability, logo, greeting, focus   |
| About      | bio (paragraf dipisahkan baris kosong), education, major, focus, status                        |
| Experience | position, company, type, start date, end date, description, skills                             |
| Skills     | name, category (dikelompokkan otomatis per kategori)                                          |
| Projects   | title, description, category, thumbnail, tools, project URL, tags (filter)                    |
| Education  | institution, degree, major, start year, end year, description                                  |
| Contact    | email, LinkedIn, GitHub, Instagram (atau jenis lain — ikon generik dipakai)                    |

Nilai yang belum tersedia disimpan `NULL`/array kosong dan UI menampilkan
placeholder yang rapi, bukan informasi karangan. Yang saat ini masih kosong:
`availability`, tools/URL project, thumbnail project, tahun & deskripsi
pendidikan, serta nilai/URL kontak.

### Filter section Projects

Filter **All, UI/UX, Web Development, Academic** juga berasal dari database:

- tabel `project_filters` menyimpan daftar filter (`key`, `label`, `sort_order`) —
  labelnya bisa diubah tanpa menyentuh kode;
- kolom `projects.tags` (JSON array berisi `key` filter) menentukan project mana
  yang muncul di tiap filter;
- "All" adalah filter bawaan di UI (menampilkan semua project).

Menambah filter baru cukup dengan `POST /api/project_filters`, lalu isi
`tags` pada project terkait:

```bash
curl -X POST http://localhost:5173/api/projects \
  -H 'content-type: application/json' \
  -d '{"title":"Project Baru","category":"Web Application","tags":["web-development","academic"]}'
```

Section Projects ditampilkan sebagai bagian utama portfolio: band berwarna biru
muda, kartu lebih besar (thumbnail 4:3, deskripsi maksimal 3 baris, chip tools,
kategori, dan tombol *View Project*), grid **3 kolom di desktop → 2 di tablet →
1 di mobile**, plus hover lift + zoom thumbnail yang halus.

### Foto profil

Foto disimpan di **storage server** (`server/data/uploads/profile-*.webp`) dan
`profile.photo_url` menyimpan path-nya, sehingga **semua pengunjung melihat foto
yang sama**. Di Hero tersedia: placeholder, Upload, Preview (klik ikon mata),
Change, dan Remove — semuanya tanpa mengubah source code. Foto dikecilkan dulu di
browser (sisi terpanjang maks 1024px, WebP) dan divalidasi (JPG/PNG/WebP/AVIF/GIF,
maks 8 MB di klien dan 10 MB di server).

Thumbnail project memakai endpoint yang sama (`POST /api/uploads` → isi
`thumbnail_url`).

## Mengubah konten

1. **Lewat API** (dipakai admin dashboard nanti) — lihat tabel endpoint di atas.
2. **Lewat database** — `server/data/portfolio.db` (SQLite). Bisa dibuka dengan
   `sqlite3` atau aplikasi GUI seperti DB Browser for SQLite.
3. **Mengisi ulang data awal** — hapus `server/data/portfolio.db`, lalu jalankan
   server lagi; konten dari `server/seed.ts` akan dimuat kembali.

Database yang dibuat versi sebelumnya otomatis di-upgrade saat server dijalankan
(mis. penambahan kolom `projects.tags` dan tabel `project_filters`), tanpa
menghapus data yang sudah ada.

`server/seed.ts` bukan sumber data website: file itu hanya konten awal untuk
database yang masih kosong.

## Tahap berikutnya (Admin Dashboard)

Backend sudah siap: endpoint tulis + upload + proteksi token tersedia, dan
`src/services/portfolioApi.ts` sudah menyediakan `createItem`, `updateItem`,
`deleteItem`, `updateProfile`, `updateSections`, `uploadImage`. Dashboard cukup
memakainya dan memanggil `reload()` dari store untuk menyegarkan halaman publik.

Catatan: form kontak masih demo (validasi di klien); belum mengirim email.
#   P o r t o f o l i o  
 