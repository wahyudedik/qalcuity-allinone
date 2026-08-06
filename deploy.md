# 🚀 Deploy Qalcuity ke Server - Panduan Lengkap

> **Panduan step-by-step deploy Qalcuity ke VPS Ubuntu dengan aaPanel**
> 
> Terakhir diperbarui: Agustus 2026

---

## 📋 Daftar Isi

1. [Persiapan VPS](#1-persiapan-vps)
2. [Install aaPanel](#2-install-aapanel)
3. [Install Node.js & pnpm](#3-install-nodejs--pnpm)
4. [Clone Repository & Deploy](#4-clone-repository--deploy)
5. [Setup Website di aaPanel](#5-setup-website-di-aapanel)
6. [Setup SSL (HTTPS)](#6-setup-ssl-https)
7. [Setup Auto-Update (Cron)](#7-setup-auto-update-cron)
8. [Monitoring & Maintenance](#8-monitoring--maintenance)
9. [Troubleshooting](#9-troubleshooting)
10. [Perintah Penting](#10-perintah-penting)

---

## 1. Persiapan VPS

### 1.1 Spesifikasi Minimum

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 2 GB | 4 GB |
| **Storage** | 20 GB SSD | 40 GB SSD |
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **Bandwidth** | 1 TB | Unlimited |

### 1.2 Beli VPS

Beberapa rekomendasi provider VPS:

| Provider | Mulai dari | Catatan |
|----------|-----------|---------|
| **DigitalOcean** | $6/bulan | Sangat mudah untuk pemula |
| **Vultr** | $3.50/bulan | Banyak pilihan lokasi |
| **Linode (Akamai)** | $5/bulan | Stabil & handal |
| **AWS EC2** | Free tier 12 bulan | Untuk yang ingin coba AWS |
| **Hetzner** | €4.5/bulan | Murah & performa tinggi (Jerman) |

> 💡 **Tips:** Pilih lokasi server yang dekat dengan target user (Singapura atau Indonesia).

### 1.3 Point Domain ke VPS

1. Beli domain (contoh: dari **Niagahoster**, **Domainesia**, **Cloudflare Registrar**)
2. Buka panel DNS domain Anda
3. Tambahkan record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `IP_VPS_ANDA` | Auto |
| **A** | `www` | `IP_VPS_ANDA` | Auto |
| **A** | `*` | `IP_VPS_ANDA` | Auto |

4. Tunggu propagasi DNS (biasanya 5-30 menit, max 24 jam)

---

## 2. Install aaPanel

### 2.1 SSH ke VPS

Buka **Terminal** (Linux/Mac) atau **PuTTY** (Windows), lalu:

```bash
ssh root@IP_VPS_ANDA
```

Masukkan password root VPS Anda.

### 2.2 Install aaPanel

Paste command berikut ke terminal:

```bash
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh
```

Saat ditanya:

```
Do you want to install aaPanel to the /www directory now?(y/n):
```

Ketik `y` dan tekan **Enter**.

> ⏱️ Proses install sekitar 3-5 menit.

### 2.3 Simpan Informasi Login

Setelah install selesai, Anda akan melihat:

```
=================================================================
Congratulations! Installed successfully!
=================================================================

aaPanel Internet:  http://IP_VPS_ANDA:8888/random_string
aaPanel Internal:  http://IP_VPS_ANDA:8888/random_string

username: xxxxxxx
password: xxxxxxx

=================================================================
```

> ⚠️ **PENTING:** Screenshot atau catat informasi login ini! Anda akan membutuhkannya untuk login ke aaPanel.

### 2.4 Buka aaPanel di Browser

1. Buka browser di komputer Anda
2. Akses: `http://IP_VPS_ANDA:8888/random_string`
3. Login dengan username & password yang tadi

### 2.5 Install Web Server (NaaPanel)

Setelah login pertama kali, aaPanel akan menawarkan instalasi web server:

1. Pilih **LNMP (Recommended)**:
   - Nginx: **1.24** (atau versi terbaru)
   - MySQL: **8.0** (atau versi terbaru)
   - PHP: **8.1** (atau versi terbaru)
   - phpMyAdmin: **Latest**
   
2. Klik **One-Click Install**

3. Tunggu proses install selesai (bisa 5-15 menit tergantung server)

> 💡 Anda bisa memilih versi lain, yang penting **Nginx** harus terinstall.

---

## 3. Install Node.js & pnpm

### 3.1 Install Node.js via NVM

SSH ke VPS, lalu jalankan:

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verifikasi
node -v   # Harus v18.x.x atau lebih tinggi
npm -v    # Harus v9.x.x atau lebih tinggi
```

### 3.2 Install pnpm

```bash
# Install pnpm
npm install -g pnpm@9

# Verifikasi
pnpm -v   # Harus v9.x.x atau lebih tinggi
```

### 3.3 Install Build Dependencies

```bash
apt-get update
apt-get install -y git build-essential python3 make gcc g++ autoconf automake zlib1g-dev libpng-dev nasm libtool openssl libssl-dev curl
```

---

## 4. Clone Repository & Deploy

### 4.1 Clone Repository

```bash
# Buat direktori
mkdir -p /www/wwwroot

# Clone repository
git clone https://github.com/username/qalcuity-allinone.git /www/wwwroot/qalcuity

# Masuk ke direktori
cd /www/wwwroot/qalcuity
```

> Ganti `username` dengan username GitHub Anda.

### 4.2 Jalankan Deploy Script

```bash
# Beri executable permission
chmod +x deploy.sh

# Jalankan deploy script
sudo ./deploy.sh
```

Script ini akan:
1. ✅ Install Node.js (jika belum ada)
2. ✅ Install pnpm (jika belum ada)
3. ✅ Install build dependencies
4. ✅ Clone repository
5. ✅ Install npm dependencies
6. ✅ Setup environment variables (.env)
7. ✅ Setup database (Prisma)
8. ✅ Build aplikasi Next.js
9. ✅ Setup PM2 process manager
10. ✅ Setup log rotation & cron job

### 4.3 Edit Environment Variables

```bash
# Buka file .env
nano /www/wwwroot/qalcuity/apps/web/.env
```

Update isi file `.env`:

```env
# Database (SQLite sudah di-setup otomatis)
DATABASE_URL="file:./dev.db"

# Auth - Ganti dengan domain Anda
NEXTAUTH_SECRET="ganti-dengan-secret-yang-panjang-dan-random"
NEXTAUTH_URL="https://domain-anda.com"

# App
NEXT_PUBLIC_APP_NAME="Qalcuity"
NEXT_PUBLIC_APP_URL="https://domain-anda.com"
```

Tekan `Ctrl + X`, lalu `Y`, lalu `Enter` untuk menyimpan.

### 4.4 Rebuild Jika .env Diubah

```bash
cd /www/wwwroot/qalcuity
pnpm build
pm2 restart qalcuity-web
```

---

## 5. Setup Website di aaPanel

### 5.1 Tambah Website

1. Login ke aaPanel: `http://IP_VPS_ANDA:8888/random_string`
2. Klik menu **Website** di sidebar
3. Klik tombol **Add Site**

### 5.2 Isi Form Add Site

| Field | Nilai |
|-------|-------|
| **Domain** | `domain-anda.com` (dan `www.domain-anda.com` jika mau) |
| **Note** | `Qalcuity` |
| **Root Directory** | `/www/wwwroot/qalcuity/apps/web` |
| **PHP Version** | **Pure Static** (pilih ini!) |
| **SSL** | Jangan dulu, setup nanti |
| **FTP** | Jangan dicentang |
| **Database** | Jangan dulu, pakai SQLite |

Klik **Submit**.

> ⚠️ **PENTING:** Pastikan Root Directory mengarah ke folder `apps/web`, bukan root project!

### 5.3 Setup Reverse Proxy

Karena Next.js berjalan sendiri (port 3000), kita perlu setup reverse proxy agar Nginx meneruskan request ke Next.js.

1. Di aaPanel, klik **Website**
2. Klik **domain-anda.com**
3. Klik tab **Reverse Proxy**
4. Klik **Add Reverse Proxy**

| Field | Nilai |
|-------|-------|
| **Proxy Name** | `qalcuity` |
| **Target URL** | `http://127.0.0.1:3000` |

5. Klik **Submit**

### 5.4 Edit Konfigurasi Proxy

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

### 5.5 Test Akses

Buka browser, akses `http://domain-anda.com`

Jika berhasil, Anda akan melihat halaman login Qalcuity! 🎉

---

## 6. Setup SSL (HTTPS)

### 6.1 Install SSL Let's Encrypt di aaPanel

1. Di aaPanel, klik **Website**
2. Klik **domain-anda.com**
3. Klik tab **SSL**
4. Pilih **Let's Encrypt**
5. Centang domain Anda
6. Klik **Apply**

> ⚠️ **Pastikan DNS sudah benar** dan domain sudah mengarah ke IP VPS sebelum apply SSL.

### 6.2 Force HTTPS

Setelah SSL terinstall:

1. Di tab **SSL**, aktifkan **HTTPS Force**
2. Klik **Save**

### 6.3 Update NEXTAUTH_URL

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

## 7. Setup Auto-Update (Cron)

### 7.1 Via aaPanel

1. Login ke aaPanel
2. Klik **Cron** (Scheduled Tasks) di sidebar
3. Klik **Add Task**

| Field | Nilai |
|-------|-------|
| **Task Type** | `Shell` |
| **Name** | `Qalcuity Auto Update` |
| **Cycle** | `Daily` |
| **Time** | `03:00` |
| **Script** | `/www/wwwroot/qalcuity/update.sh` |

4. Klik **Submit**

### 7.2 Via Command Line (Alternatif)

```bash
# Edit crontab
crontab -e

# Tambahkan baris berikut (jam 3 pagi setiap hari):
0 3 * * * /bin/bash /www/wwwroot/qalcuity/update.sh >> /var/log/qalcuity-update.log 2>&1
```

### 7.3 Update Manual

Kapanpun Anda ingin update manual:

```bash
cd /www/wwwroot/qalcuity
sudo ./update.sh
```

Script update akan:
1. ✅ Backup database otomatis
2. ✅ Pull code terbaru dari GitHub
3. ✅ Install dependency baru (jika ada)
4. ✅ Regenerate Prisma Client (jika schema berubah)
5. ✅ Build ulang aplikasi
6. ✅ Restart aplikasi via PM2
7. ✅ Bersihkan backup lama (> 30 hari)

---

## 8. Monitoring & Maintenance

### 8.1 Cek Status Aplikasi

```bash
# Status PM2
pm2 status

# Lihat log realtime
pm2 logs qalcuity-web

# Lihat log error
pm2 logs qalcuity-web --err

# Lihat log output
pm2 logs qalcuity-web --out
```

### 8.2 Restart Aplikasi

```bash
# Restart biasa
pm2 restart qalcuity-web

# Reload (zero-downtime)
pm2 reload qalcuity-web

# Stop
pm2 stop qalcuity-web

# Start
pm2 start qalcuity-web
```

### 8.3 Monitor Server

Di aaPanel, Anda bisa monitor:
- **CPU Usage** - Dashboard utama
- **RAM Usage** - Dashboard utama
- **Disk Usage** - Menu Files
- **Network** - Menu Monitoring
- **Nginx Status** - Menu App Store > Nginx

### 8.4 Backup Database Manual

```bash
# Backup SQLite
cp /www/wwwroot/qalcuity/packages/db/prisma/dev.db \
   /www/wwwroot/qalcuity/backups/manual_backup_$(date '+%Y%m%d').db

# Backup PostgreSQL (jika menggunakan)
pg_dump qalcuity > /www/wwwroot/qalcuity/backups/pg_manual_$(date '+%Y%m%d').sql
```

### 8.5 Lihat Log Update

```bash
# Lihat log update terakhir
tail -100 /var/log/qalcuity-update.log

# Lihat log update dengan timestamp
cat /var/log/qalcuity-update.log
```

---

## 9. Troubleshooting

### 9.1 Aplikasi Tidak Bisa Diakses

**Cek 1: PM2 Status**
```bash
pm2 status
```
Jika status `errored`:
```bash
pm2 logs qalcuity-web --err
```

**Cek 2: Port 3000 Aktif**
```bash
netstat -tlnp | grep 3000
```
Jika port tidak aktif, restart:
```bash
pm2 restart qalcuity-web
```

**Cek 3: Nginx Config**
```bash
nginx -t
```
Jika ada error, periksa konfigurasi di aaPanel > Website > domain > Config.

### 9.2 Error 502 Bad Gateway

Penyebab umum:
1. **Next.js belum running** → `pm2 restart qalcuity-web`
2. **Port salah** → Pastikan reverse proxy mengarah ke `127.0.0.1:3000`
3. **Memory habis** → Cek RAM di aaPanel Dashboard, restart jika perlu

```bash
# Force restart
pm2 delete qalcuity-web
pm2 start ecosystem.config.js
```

### 9.3 Error "NEXTAUTH_SECRET undefined"

```bash
# Buka .env
nano /www/wwwroot/qalcuity/apps/web/.env

# Tambahkan:
NEXTAUTH_SECRET="buat-secret-random-disini"

# Generate random secret:
openssl rand -hex 32
```

### 9.4 Build Gagal

```bash
cd /www/wwwroot/qalcuity

# Bersihkan cache
pnpm clean

# Install ulang
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Build ulang
pnpm build
```

### 9.5 Database Error

```bash
cd /www/wwwroot/qalcuity

# Regenerate Prisma Client
pnpm db:generate

# Push schema
pnpm db:push

# Jika masih error, seed ulang
pnpm db:seed
```

### 9.6 SSL Tidak Bisa Apply

Pastikan:
1. DNS sudah propagate (cek di [dnschecker.org](https://dnschecker.org))
2. Port 80 dan 443 terbuka di firewall/VPS provider
3. Domain sudah benar di aaPanel

```bash
# Cek apakah port 80 & 443 terbuka
ufw status
# Jika aktif, buka port:
ufw allow 80
ufw allow 443
ufw reload
```

---

## 10. Perintah Penting

### 🔧 Perintah Harian

| Perintah | Fungsi |
|----------|--------|
| `pm2 status` | Cek status aplikasi |
| `pm2 logs qalcuity-web` | Lihat log realtime |
| `pm2 restart qalcuity-web` | Restart aplikasi |
| `sudo ./update.sh` | Update manual |

### 🗄️ Perintah Database

| Perintah | Fungsi |
|----------|--------|
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:push` | Push schema ke DB |
| `pnpm db:seed` | Seed data awal |
| `pnpm db:studio` | Buka Prisma Studio (dev) |

### 📁 Lokasi Penting

| Path | Fungsi |
|------|--------|
| `/www/wwwroot/qalcuity/` | Root project |
| `/www/wwwroot/qalcuity/apps/web/` | Next.js app |
| `/www/wwwroot/qalcuity/apps/web/.env` | Environment variables |
| `/www/wwwroot/qalcuity/packages/db/prisma/dev.db` | Database SQLite |
| `/www/wwwroot/qalcuity/ecosystem.config.js` | PM2 config |
| `/var/log/qalcuity-update.log` | Log update |

### 🔑 Perintah aaPanel

| Perintah | Fungsi |
|----------|--------|
| `bt` | Buka menu aaPanel di terminal |
| `bt default` | Tampilkan login URL & password |
| `bt restart` | Restart aaPanel |
| `bt stop` | Stop aaPanel |
| `bt start` | Start aaPanel |

---

## 📞 Bantuan

Jika mengalami kendala:

1. Cek [Troubleshooting](#9-troubleshooting) di atas
2. Lihat log error: `pm2 logs qalcuity-web --err`
3. Cek log update: `tail -100 /var/log/qalcuity-update.log`
4. Buka GitHub Issues di repository Anda

---

## 📊 Arsitektur Deployment

```
User Browser
     │
     ▼
┌─────────────────────┐
│   DNS (Cloudflare)  │
│   domain-anda.com   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   aaPanel Dashboard  │
│   (Port 8888)       │
└─────────────────────┘

┌─────────────────────┐
│      Nginx          │
│   (Port 80/443)     │──── SSL/TLS (Let's Encrypt)
│   Reverse Proxy     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    Next.js App      │
│   (Port 3000)       │──── PM2 Process Manager
│   Qalcuity Web      │     (Cluster Mode)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    SQLite / PG      │
│    Database         │
└─────────────────────┘
```

---

> **Catatan:** Script `deploy.sh` dan `update.sh` sudah termasuk di repository. Pastikan file-file ini executable sebelum dijalankan:
> ```bash
> chmod +x deploy.sh update.sh
> ```
