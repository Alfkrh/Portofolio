# Image backend portfolio: API Express + Prisma + PostgreSQL.
#
# Dipakai kalau Anda men-deploy di tempat yang menjalankan Docker (Railway, Fly,
# VPS, atau Render dengan `runtime: docker`). Di Render, blueprint render.yaml
# memakai `runtime: node` dan mengabaikan file ini — itu jalur yang
# direkomendasikan karena `preDeployCommand` menjalankan migrasi terpisah dari
# proses server.
#
# Build dari root repo:
#   docker build -t portofolio-api .
#
# Jalankan (butuh PostgreSQL terpisah — lihat DATABASE_URL):
#   docker run -p 3000:3000 \
#     -e DATABASE_URL=postgresql://user:pass@host:5432/portofolio \
#     -e SESSION_SECRET=<32 byte acak> \
#     -v portofolio-uploads:/var/data \
#     portofolio-api
#
# Frontend TIDAK ikut di image ini: halaman statisnya di-deploy ke Vercel
# (atau host statis lain) dan menunjuk ke API ini lewat VITE_API_BASE.

FROM node:24-bookworm-slim
WORKDIR /app

COPY backend/package.json backend/package-lock.json backend/prisma.config.js ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/server.js ./

# `npm ci` menjalankan `postinstall` → `prisma generate`, sehingga Prisma Client
# ada di `src/generated/prisma` tanpa perlu ikut masuk repo.
RUN npm ci && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/var/data/uploads

# File upload HARUS berada di volume permanen, kalau tidak isinya hilang setiap
# container dibuat ulang. Database tidak perlu disk: datanya di PostgreSQL.
VOLUME /var/data
EXPOSE 3000

# Migrasi dijalankan sebelum server menerima request — sama seperti
# `preDeployCommand` di Render, supaya skema database selalu selaras.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
