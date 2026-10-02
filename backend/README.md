# Backend Portfolio (Express + Prisma + PostgreSQL)

REST API untuk konten website portfolio. Frontend React + Vite yang sudah ada
tidak berubah dan tetap di-deploy terpisah; backend ini menggantikan server
Node lama yang memakai `node:sqlite`.

## Menjalankan

Tidak butuh Docker dan tidak butuh PostgreSQL yang dipasang di sistem: skrip
`db:dev` menjalankan cluster PostgreSQL sendiri di dalam `backend/.pgdata`
(paket `embedded-postgres`, binari resmi diunduh saat `npm install`).

```bash
cd backend
npm install          # sekaligus menjalankan `prisma generate`
cp .env.example .env
npm run db:dev       # terminal 1 — hidupkan PostgreSQL lokal (port 55432)
```

Tempel `DATABASE_URL` yang dicetak `db:dev` ke `.env` (bersama
`SESSION_SECRET`), lalu di terminal lain:

```bash
npm run db:deploy    # buat tabel dari folder migrations/
npm run db:seed      # isi pengaturan situs awal
npm run dev          # nodemon, reload otomatis
```

| Perintah | Keterangan |
| -------- | ---------- |
| `npm run dev` | Jalankan server dengan auto-reload (nodemon) |
| `npm start` | Jalankan server produksi |
| `npm run db:dev` | PostgreSQL lokal tanpa Docker (port 55432) |
| `npm run db:deploy` | Terapkan migrasi yang ada (aman diulang) |
| `npm run db:seed` | Isi pengaturan situs awal |
| `npm run db:migrate-data` | Pindahkan data dari database SQLite lama |
| `npm run smoke` | Uji end-to-end seluruh endpoint terhadap server yang jalan |
| `npm run prisma:migrate` | Buat/terapkan migrasi baru saat pengembangan |
| `npm run prisma:studio` | Buka GUI database |
| `npm run prisma:validate` | Periksa schema tanpa menyentuh database |

## Memindahkan data dari server lama

Server lama menyimpan semuanya di `server/data/portfolio.db` (SQLite). Skrip
migrasi memindahkan seluruh konten — termasuk id, agar `Project.tags` yang
merujuk `ProjectFilter.key` tetap cocok — dan ikut menyalin file upload:

```bash
npm run db:migrate-data -- --dry-run   # lihat dulu isinya, tanpa menulis
npm run db:migrate-data                # tulis ke DATABASE_URL, tolak bila tujuan sudah berisi data
npm run db:migrate-data -- --force     # kosongkan tabel tujuan dulu, lalu tulis
```

Lokasi berkas sumber bisa diatur dengan `--from`. Yang **tidak** ikut dipindah
adalah `admin_sessions`: sesi lama dibuang dan admin cukup login sekali lagi.
Akun admin sendiri ikut pindah beserta password-nya — format hash scrypt di
kedua server identik, jadi password lama tetap berlaku.

> Setelah memindahkan data manual seperti ini, auto-increment PostgreSQL sudah
diselaraskan oleh skrip, sehingga menambah baris baru dari dashboard tidak akan
bentrok id dengan data lama.

## Menguji

```bash
npm run smoke                                    # default http://127.0.0.1:5000
API_URL=http://127.0.0.1:5099 npm run smoke      # server di port lain
```

Smoke test membuktikan alur yang paling penting benar-benar jalan terhadap
server dan database sungguhan: konten publik terbaca, endpoint admin tertutup
tanpa token, project draft tidak bocor ke publik, validasi menolak data kosong,
form kontak masuk ke inbox, upload multipart berfungsi, dan logout benar-benar
mencabut token. Data uji yang dibuatnya dihapus lagi di akhir.

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma     # model database
│   └── seed.js           # pengaturan awal + akun admin pertama
├── prisma.config.js      # konfigurasi Prisma CLI (Prisma 7)
├── server.js             # titik masuk: validasi env lalu listen()
└── src/
    ├── config/           # env, konstanta kebijakan
    ├── lib/              # PrismaClient (singleton)
    ├── middleware/       # auth, validasi, upload, error handler, rate limit
    ├── models/           # skema Zod + registry resource
    ├── services/         # logika bisnis & query database
    ├── controllers/      # penerjemah request → service → respons
    ├── routes/           # pemetaan URL
    ├── utils/            # response, asyncHandler, password
    ├── generated/prisma/ # Prisma Client (dibuat otomatis, gitignored)
    └── app.js            # perakitan Express
```

Aliran satu request:

```
Route → middleware (auth/validasi/upload) → Controller → Service → Prisma → PostgreSQL
```

## Format respons

Semua endpoint memakai bentuk yang sama:

```json
{ "success": true,  "message": "Data berhasil diambil", "data": {} }
{ "success": false, "message": "Terjadi kesalahan", "errors": [{ "field": "email", "message": "…" }] }
```

`errors` hanya muncul pada galat validasi.

## Endpoint

### Publik (tanpa login)

| Method | Endpoint | Keterangan |
| ------ | -------- | ---------- |
| GET | `/api/health` | Status API + koneksi database |
| GET | `/api/portfolio` | Seluruh konten publik dalam satu request |
| GET | `/api/profile` | Profil |
| GET | `/api/skills` | Daftar skill |
| GET | `/api/experiences` | Daftar pengalaman |
| GET | `/api/projects` | Project yang `published = true` |
| GET | `/api/project-filters` | Filter kategori project |
| GET | `/api/education` | Riwayat pendidikan |
| GET | `/api/certificates` | Sertifikat yang `published = true` |
| GET | `/api/social-links` | Tautan sosial yang `is_active = true` |
| GET | `/api/sections` | Teks UI yang bisa diedit |
| GET | `/api/settings` | Pengaturan situs |
| POST | `/api/contact` | Kirim pesan dari form Contact (dibatasi 5/jam per IP) |

Penyaringan data draft dilakukan **di database**, bukan di frontend — jadi
project yang belum dipublikasikan tidak pernah ikut terkirim ke pengunjung.

### Autentikasi

| Method | Endpoint | Keterangan |
| ------ | -------- | ---------- |
| POST | `/api/auth/setup` | Buat akun admin pertama (hanya bila belum ada akun) |
| POST | `/api/auth/login` | Login, mengembalikan token sesi |
| GET | `/api/auth/me` | Status sesi (dipakai sebagai gerbang dashboard) |
| POST | `/api/auth/logout` | Cabut sesi ini |
| POST | `/api/auth/logout-all` | Cabut semua sesi akun |
| POST | `/api/auth/password` | Ganti password |
| POST | `/api/auth/email` | Ganti email admin |

Token dikirim sebagai `Authorization: Bearer <token>`. Yang tersimpan di
database hanya hash SHA-256-nya.

### Admin (wajib login)

Semua route di bawah `/api/admin/*` dilindungi `requireAuth` + `requireAdminRole`.

| Method | Endpoint |
| ------ | -------- |
| GET/PUT | `/api/admin/profile` |
| GET/POST | `/api/admin/<resource>` |
| GET/PUT/DELETE | `/api/admin/<resource>/:id` |
| POST | `/api/admin/uploads` |
| GET/PATCH/DELETE | `/api/admin/contact-messages[/:id]` |
| GET/PUT | `/api/admin/sections` |
| GET/PUT | `/api/admin/settings` |

`<resource>` yang tersedia: `skills`, `experiences`, `projects`,
`project-filters`, `education`, `certificates`, `social-links`.

Menambah jenis konten baru cukup menambah satu entri di
`src/models/resources.js` — route, validasi, dan CRUD-nya terbentuk otomatis.

## Deploy ke Render

Repo ini sudah menyertakan `render.yaml` di akar project. Dari Render Dashboard:

> **New +** → **Blueprint** → pilih repo → **Apply**.

Blueprint itu membuat database PostgreSQL, web service-nya, dan disk untuk file
upload sekaligus — `DATABASE_URL` tersambung otomatis, dan `SESSION_SECRET`
dibuat acak oleh Render.

Setelah service-nya hidup, buat akun admin pertama lewat endpoint setup (hanya
berhasil selama belum ada akun sama sekali):

```bash
curl -X POST https://portofolio-api.onrender.com/api/auth/setup \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"kata-sandi-ku1"}'
```

> **Perhatian:** database plan `free` di Render dihapus otomatis 30 hari setelah
dibuat. Untuk jangka panjang, ganti `plan: free` menjadi `plan: 0.1c-256mb`
di `render.yaml` sebelum menekan Apply.

## Catatan teknis

- **Prisma 7**: koneksi database diatur di `prisma.config.js`, bukan di
  `schema.prisma`; dan `PrismaClient` wajib diberi driver adapter
  (`@prisma/adapter-pg`).
- **Generator `prisma-client-js`** dipakai karena ini satu-satunya generator
  Prisma 7 yang menghasilkan JavaScript siap-pakai. Generator baru
  (`prisma-client`) hanya mengeluarkan TypeScript, yang butuh langkah build —
  padahal backend ini JS murni agar `node server.js` bisa langsung jalan.
- **Password** di-hash dengan scrypt (`node:crypto`), tanpa dependency native.
- **Sesi disimpan di database** (bukan JWT stateless) supaya bisa dicabut saat
  logout, logout dari semua perangkat, dan ganti password.
- **Upload** tidak menyimpan file biner di database: hanya URL relatifnya,
  sedangkan filenya ada di `UPLOAD_DIR` dengan nama acak (tidak memakai nama
  dari klien, sehingga tidak bisa path traversal).
