# Deploy Qalcuity ke aaPanel dengan PostgreSQL

> **Panduan lengkap deploy Qalcuity menggunakan PostgreSQL di aaPanel**
>
> Last Updated: 2026-08-29

---

## Prerequisites

- VPS dengan aaPanel terinstall
- Node.js 18+ terinstall (via aaPanel App Store atau NVM)
- PostgreSQL terinstall (via aaPanel App Store)
- Domain sudah di-point ke IP VPS
- Akses SSH ke VPS

---

## Step 1: Setup PostgreSQL di aaPanel

### 1.1 Install PostgreSQL

1. Login ke aaPanel Dashboard
2. Buka menu **App Store**
3. Cari **PostgreSQL**
4. Klik **Install**
5. Pilih versi terbaru (14+ atau 16+)
6. Tunggu proses install selesai

### 1.2 Buat Database

Setelah PostgreSQL terinstall, buat database baru:

**Via aaPanel PostgreSQL Manager:**
1. Klik **PostgreSQL** di sidebar (atau di App Store > Installed)
2. Buka **phpPgAdmin** atau gunakan command line
3. Buat database baru:
   ```
   CREATE DATABASE qalcuity;
   ```

**Via SSH (alternatif):**
```bash
# Login ke PostgreSQL
sudo -u postgres psql

# Buat user
CREATE USER qalcuity_user WITH PASSWORD 'your_strong_password_here';

# Buat database
CREATE DATABASE qalcuity OWNER qalcuity_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE qalcuity TO qalcuity_user;

# Exit
\q
```

### 1.3 Catat Credentials

| Field | Value |
|-------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `qalcuity` |
| **Username** | `qalcuity_user` |
| **Password** | `(password yang sudah dibuat)` |

---

## Step 2: Setup Environment

### 2.1 SSH ke VPS

```bash
ssh root@IP_VPS_ANDA
```

### 2.2 Clone Repository

```bash
# Buat direktori
mkdir -p /www/wwwroot

# Clone repository
git clone https://github.com/username/qalcuity-allinone.git /www/wwwroot/qalcuity

# Masuk ke direktori
cd /www/wwwroot/qalcuity
```

> Ganti `username` dengan username GitHub Anda.

### 2.3 Setup Environment Variables

```bash
# Copy .env.example ke .env
cp apps/web/.env.example apps/web/.env

# Edit .env
nano apps/web/.env
```

Update isi file `.env`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://qalcuity_user:your_strong_password_here@localhost:5432/qalcuity?schema=public"

# Auth - Ganti dengan secret yang random dan panjang
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_URL="https://domain-anda.com"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_NAME="Qalcuity"
NEXT_PUBLIC_APP_URL="https://domain-anda.com"
```

Tekan `Ctrl + X`, lalu `Y`, lalu `Enter` untuk menyimpan.

### 2.4 Generate NEXTAUTH_SECRET

```bash
# Generate secret random
openssl rand -hex 32
```

Copy output dan paste sebagai value `NEXTAUTH_SECRET`.

---

## Step 3: Install Dependencies

```bash
cd /www/wwwroot/qalcuity

# Install pnpm (jika belum ada)
npm install -g pnpm@9

# Install dependencies
pnpm install
```

---

## Step 4: Generate Prisma Client

```bash
cd /www/wwwroot/qalcuity

# Generate Prisma Client untuk PostgreSQL
npx prisma generate
```

---

## Step 5: Push Schema to Database

```bash
# Push schema ke PostgreSQL (create tables)
npx prisma db push
```

> ⚠️ **Catatan:** `prisma db push` akan membuat tabel baru. Jika sudah ada tabel dari SQLite, tabel lama tidak akan terpengaruh.

### Alternatif: Gunakan Migrations

```bash
# Buat migration baru
npx prisma migrate dev --name init_postgresql

# Deploy migration ke production
npx prisma migrate deploy
```

---

## Step 6: Seed Database

```bash
# Jalankan seed script untuk insert demo data
npx prisma db seed
```

Seed akan membuat:
- 1 Tenant (PT Qalcuity Demo)
- 5 Users (SuperAdmin, Admin, Member, Viewer, User)
- 7 Contacts
- 5 Products, 4 Categories, 3 Suppliers
- 6 Invoices dengan items
- 5 Payments
- 3 Quotations
- 2 Purchase Orders
- 8 Leads, 6 Deals
- 5 Employees, Attendance Records, Leaves, Payroll
- Subscription Plans + Billing Payments
- Audit Logs

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | info@qalcuity.com | Wahyu123456789@ |
| Admin | admin@qalcuity.com | admin123 |
| Member | member@qalcuity.com | member123 |
| Viewer | viewer@qalcuity.com | viewer123 |
| User | user@qalcuity.com | user123 |

---

## Step 7: Build Application

```bash
cd /www/wwwroot/qalcuity

# Build Next.js application
pnpm build
```

> ⏱️ Proses build memakan waktu 2-5 menit tergantung spesifikasi server.

---

## Step 8: Setup PM2

### 8.1 Install PM2 (jika belum ada)

```bash
npm install -g pm2
```

### 8.2 Start Application

```bash
cd /www/wwwroot/qalcuity

# Start dengan PM2
pm2 start npm --name "qalcuity-web" -- start --prefix apps/web

# Simpan PM2 config (agar auto-start saat server restart)
pm2 save

# Setup auto-start
pm2 startup
```

### 8.3 Verifikasi

```bash
# Cek status
pm2 status

# Cek log
pm2 logs qalcuity-web --lines 50
```

---

## Step 9: Setup Nginx Reverse Proxy di aaPanel

Karena Next.js berjalan sendiri (port 3000), kita perlu reverse proxy agar Nginx meneruskan request ke Next.js.

### 9.1 Tambah Website

1. Login ke aaPanel: `http://IP_VPS_ANDA:8888/random_string`
2. Klik menu **Website** di sidebar
3. Klik tombol **Add Site**

| Field | Nilai |
|-------|-------|
| **Domain** | `domain-anda.com` (dan `www.domain-anda.com` jika mau) |
| **Note** | `Qalcuity` |
| **Root Directory** | `/www/wwwroot/qalcuity/apps/web` |
| **PHP Version** | **Pure Static** (pilih ini!) |
| **SSL** | Jangan dulu, setup nanti |
| **FTP** | Jangan dicentang |
| **Database** | **Tidak perlu** — kita pakai PostgreSQL standalone |

Klik **Submit**.

> ⚠️ **PENTING:** Pastikan Root Directory mengarah ke folder `apps/web`, bukan root project!

### 9.2 Setup Reverse Proxy

1. Di aaPanel, klik **Website**
2. Klik **domain-anda.com**
3. Klik tab **Reverse Proxy**
4. Klik **Add Reverse Proxy**

| Field | Nilai |
|-------|-------|
| **Proxy Name** | `qalcuity` |
| **Target URL** | `http://127.0.0.1:3000` |

5. Klik **Submit**

### 9.3 Edit Konfigurasi Proxy

Klik tombol **Config** di reverse proxy yang baru dibuat, paste konfigurasi berikut:

```nginx
# Proxy untuk Next.js
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# WebSocket support (untuk hot reload & live updates)
location /_next/webpack-hmr {
    proxy_pass http://127.0.0.1:3000/_next/webpack-hmr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Static files caching
location /_next/static {
    proxy_pass http://127.0.0.1:3000/_next/static;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Favicon & assets
location /favicon.ico {
    proxy_pass http://127.0.0.1:3000/favicon.ico;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Klik **Save**.

### 9.4 Test Akses

Buka browser, akses `http://domain-anda.com`

Jika berhasil, Anda akan melihat halaman login Qalcuity! 🎉

---

## Step 10: Setup SSL (HTTPS)

### 10.1 Install SSL Let's Encrypt

1. Di aaPanel, klik **Website**
2. Klik **domain-anda.com**
3. Klik tab **SSL**
4. Pilih **Let's Encrypt**
5. Centang domain Anda
6. Klik **Apply**

> ⚠️ **Pastikan DNS sudah benar** dan domain sudah mengarah ke IP VPS sebelum apply SSL.

### 10.2 Force HTTPS

Setelah SSL terinstall:

1. Di tab **SSL**, aktifkan **HTTPS Force**
2. Klik **Save**

### 10.3 Update Environment Variables

Setelah SSL aktif, update `.env`:

```bash
nano /www/wwwroot/qalcuity/apps/web/.env
```

Ubah:
```env
NEXTAUTH_URL="https://domain-anda.com"
NEXT_PUBLIC_APP_URL="https://domain-anda.com"
```

Rebuild & restart:
```bash
cd /www/wwwroot/qalcuity
pnpm build
pm2 restart qalcuity-web
```

---

## Step 11: Backup Database

### 11.1 Backup Manual

```bash
# Backup PostgreSQL
pg_dump -U qalcuity_user -h localhost qalcuity > /www/wwwroot/qalcuity/backups/pg_$(date '+%Y%m%d_%H%M%S').sql
```

### 11.2 Backup Otomatis (Cron)

1. Login ke aaPanel
2. Klik **Cron** (Scheduled Tasks) di sidebar
3. Klik **Add Task**

| Field | Nilai |
|-------|-------|
| **Task Type** | `Shell` |
| **Name** | `Qalcuity PostgreSQL Backup` |
| **Cycle** | `Daily` |
| **Time** | `02:00` |
| **Script** | `/bin/bash -c 'mkdir -p /www/wwwroot/qalcuity/backups && pg_dump -U qalcuity_user -h localhost qalcuity > /www/wwwroot/qalcuity/backups/pg_$(date +\%Y\%m\%d).sql && find /www/wwwroot/qalcuity/backups -name "pg_*.sql" -mtime +30 -delete'` |

### 11.3 Restore Database

```bash
# Restore dari backup
psql -U qalcuity_user -h localhost qalcuity < /www/wwwroot/qalcuity/backups/pg_20260829.sql
```

---

## Troubleshooting

### Connection refused

```
Error: Can't reach database server at localhost:5432
```

**Solusi:**
1. Pastikan PostgreSQL running: `systemctl status postgresql`
2. Cek port: `netstat -tlnp | grep 5432`
3. Restart PostgreSQL: `systemctl restart postgresql`

### Authentication failed

```
Error: Authentication failed against database
```

**Solusi:**
1. Cek credentials di `.env`
2. Pastikan user ada: `sudo -u postgres psql -c "\du"`
3. Reset password: `sudo -u postgres psql -c "ALTER USER qalcuity_user PASSWORD 'new_password';"`
4. Cek `pg_hba.conf` — pastikan ada baris:
   ```
   host    all    qalcuity_user    127.0.0.1/32    md5
   ```

### Permission denied

```
Error: permission denied for database qalcuity
```

**Solusi:**
```sql
-- Login sebagai postgres
sudo -u postgres psql

-- Grant semua privileges
GRANT ALL PRIVILEGES ON DATABASE qalcuity TO qalcuity_user;
GRANT ALL ON SCHEMA public TO qalcuity_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO qalcuity_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO qalcuity_user;
```

### Prisma Schema Push Error

```
Error: Foreign key constraint would cause a cycle
```

**Solusi:**
1. Cek schema untuk circular dependencies
2. Gunakan `prisma migrate dev` untuk generated migration
3. Jika perlu, drop tabel lama: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`

### Build Error

```
Error: Prisma Client not generated
```

**Solusi:**
```bash
npx prisma generate
pnpm build
```

### PM2 Application Crashes

```bash
# Cek log error
pm2 logs qalcuity-web --err --lines 100

# Restart
pm2 restart qalcuity-web

# Jika masih crash, rebuild
cd /www/wwwroot/qalcuity
npx prisma generate
pnpm build
pm2 restart qalcuity-web
```

### Seed Script Error (Unique Constraint)

```
Error: Unique constraint failed
```

**Solusi:**
Seed script menggunakan `upsert` dan `findFirst` sehingga aman dijalankan berulang kali. Jika masih error:
```bash
# Reset database
npx prisma db push --force-reset

# Seed ulang
npx prisma db seed
```

---

## Perintah Penting

```bash
# Status PM2
pm2 status

# Log realtime
pm2 logs qalcuity-web

# Restart
pm2 restart qalcuity-web

# Stop
pm2 stop qalcuity-web

# Prisma
npx prisma generate          # Generate client
npx prisma db push           # Push schema
npx prisma migrate deploy    # Deploy migrations
npx prisma db seed           # Seed data
npx prisma studio            # Open Prisma Studio (visual DB)
npx prisma validate          # Validate schema

# PostgreSQL
psql -U qalcuity_user -h localhost qalcuity    # Connect to DB
pg_dump -U qalcuity_user -h localhost qalcuity > backup.sql  # Backup
psql -U qalcuity_user -h localhost qalcuity < backup.sql     # Restore

# Build
pnpm build                   # Build Next.js
pnpm install                 # Install dependencies
```

---

## Checklist Deployment

- [ ] PostgreSQL installed via aaPanel
- [ ] Database `qalcuity` created
- [ ] User `qalcuity_user` with privileges
- [ ] `.env` configured with PostgreSQL URL
- [ ] `pnpm install` completed
- [ ] `npx prisma generate` completed
- [ ] `npx prisma db push` completed
- [ ] `npx prisma db seed` completed
- [ ] `pnpm build` completed
- [ ] PM2 running (`pm2 status`)
- [ ] Nginx reverse proxy configured
- [ ] SSL installed (Let's Encrypt)
- [ ] Application accessible via HTTPS
- [ ] Login test successful
- [ ] CRUD operations working
- [ ] Backup cron configured

---

**Last Updated:** 2026-08-29
**Maintainer:** Qalcuity Team
