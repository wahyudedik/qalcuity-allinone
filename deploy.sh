#!/bin/bash
# ============================================================
# Qalcuity - Deploy Script (Pertama Kali)
# Untuk Ubuntu VPS dengan aaPanel
# ============================================================
# Jalankan script ini SETELAH aaPanel terinstall
# chmod +x deploy.sh && sudo ./deploy.sh
# ============================================================

set -e

# --- Konfigurasi ---
APP_NAME="qalcuity"
APP_DIR="/www/wwwroot/qalcuity"
REPO_URL="https://github.com/username/qalcuity-allinone.git"  # GANTI dengan repo GitHub Anda
NODE_VERSION="18"  # Minimum Node.js 18
PM2_APP_NAME="qalcuity-web"
DOMAIN=""  # Isi domain Anda, contoh: qalcuity.com (opsional)
APP_PORT=3000
DB_TYPE="sqlite"  # sqlite atau postgresql

# --- Warna untuk output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}   Qalcuity - Deploy Script (Pertama Kali)     ${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${GREEN}[$1] $2${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# --- Cek apakah root ---
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Script ini harus dijalankan sebagai root! Gunakan: sudo ./deploy.sh"
    fi
}

# --- Cek apakah aaPanel terinstall ---
check_aapanel() {
    if [ ! -d "/www/server/panel" ]; then
        print_warning "aaPanel tidak terinstall. Install aaPanel terlebih dahulu:"
        echo "wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && bash install.sh"
        exit 1
    fi
    print_success "aaPanel terdeteksi"
}

# --- Step 1: Install Node.js via NVM ---
install_nodejs() {
    print_step "1/10" "Install Node.js v${NODE_VERSION}"

    # Install NVM jika belum ada
    if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Install & gunakan Node.js
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION

    print_success "Node.js $(node -v) terinstall"
    print_success "npm v$(npm -v)"
}

# --- Step 2: Install pnpm ---
install_pnpm() {
    print_step "2/10" "Install pnpm"

    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm@9
    fi

    print_success "pnpm $(pnpm -v) terinstall"
}

# --- Step 3: Install build dependencies ---
install_build_deps() {
    print_step "3/10" "Install build dependencies"

    apt-get update
    apt-get install -y \
        git \
        build-essential \
        python3 \
        make \
        gcc \
        g++ \
        autoconf \
        automake \
        zlib1g-dev \
        libpng-dev \
        nasm \
        libtool \
        openssl \
        libssl-dev \
        curl

    print_success "Build dependencies terinstall"
}

# --- Step 4: Clone repository ---
clone_repo() {
    print_step "4/10" "Clone repository"

    if [ -d "$APP_DIR" ]; then
        print_warning "Directory $APP_DIR sudah ada, pull update saja..."
        cd "$APP_DIR"
        git pull origin main
    else
        mkdir -p /www/wwwroot
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi

    print_success "Repository berhasil di-clone ke $APP_DIR"
}

# --- Step 5: Install dependencies ---
install_deps() {
    print_step "5/10" "Install dependencies"

    cd "$APP_DIR"
    pnpm install --frozen-lockfile

    print_success "Dependencies terinstall"
}

# --- Step 6: Setup Environment Variables ---
setup_env() {
    print_step "6/10" "Setup Environment Variables"

    WEB_ENV_FILE="$APP_DIR/apps/web/.env"
    WEB_ENV_EXAMPLE="$APP_DIR/apps/web/.env.example"
    DB_ENV_FILE="$APP_DIR/packages/db/.env"

    # Generate random secrets
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)

    # Buat .env untuk web app
    if [ ! -f "$WEB_ENV_FILE" ]; then
        if [ -f "$WEB_ENV_EXAMPLE" ]; then
            cp "$WEB_ENV_EXAMPLE" "$WEB_ENV_FILE"
        else
            touch "$WEB_ENV_FILE"
        fi

        # Konfigurasi berdasarkan domain
        if [ -n "$DOMAIN" ]; then
            BASE_URL="https://$DOMAIN"
        else
            BASE_URL="http://$(curl -s ifconfig.me):$APP_PORT"
        fi

        # Update atau tambah environment variables
        sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|g" "$WEB_ENV_FILE"
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$BASE_URL|g" "$WEB_ENV_FILE"
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$BASE_URL|g" "$WEB_ENV_FILE"

        # Pastikan ada newline di akhir file
        echo "" >> "$WEB_ENV_FILE"

        print_success "File .env untuk web app berhasil dibuat"
    else
        print_warning "File .env sudah ada, skip pembuatan"
    fi

    # Setup database .env
    if [ "$DB_TYPE" = "postgresql" ]; then
        DB_PASS=$(openssl rand -hex 16)
        DB_URL="postgresql://qalcuity:$DB_PASS@localhost:5432/qalcuity"
        echo "DATABASE_URL=\"$DB_URL\"" > "$DB_ENV_FILE"
        echo "DATABASE_URL=\"$DB_URL\"" >> "$WEB_ENV_FILE"
        print_success "PostgreSQL configuration ready"
        print_warning "Catatan: Buat database 'qalcuity' di aaPanel > Database, lalu update password di .env"
    else
        echo 'DATABASE_URL="file:./dev.db"' > "$DB_ENV_FILE"
        echo 'DATABASE_URL="file:./dev.db"' >> "$WEB_ENV_FILE"
        print_success "SQLite configuration ready"
    fi

    # Tambahkan vars tambahan jika belum ada
    grep -q "NEXT_PUBLIC_APP_NAME" "$WEB_ENV_FILE" || echo 'NEXT_PUBLIC_APP_NAME="Qalcuity"' >> "$WEB_ENV_FILE"

    print_success "Environment variables berhasil di-setup"
}

# --- Step 7: Setup Database ---
setup_database() {
    print_step "7/10" "Setup Database"

    cd "$APP_DIR"

    # Generate Prisma Client
    pnpm db:generate
    print_success "Prisma Client berhasil di-generate"

    # Push schema ke database
    pnpm db:push
    print_success "Schema berhasil di-push ke database"

    # Seed database
    print_warning "Menjalankan seed database..."
    pnpm db:seed || print_warning "Seed dilewati (mungkin sudah ada data)"
    print_success "Database setup selesai"
}

# --- Step 8: Build aplikasi ---
build_app() {
    print_step "8/10" "Build aplikasi"

    cd "$APP_DIR"
    pnpm build

    print_success "Build berhasil"
}

# --- Step 9: Setup PM2 ---
setup_pm2() {
    print_step "9/10" "Setup PM2 Process Manager"

    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi

    # Buat ecosystem file
    cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'qalcuity-web',
    cwd: './apps/web',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true
  }]
};
EOF

    # Buat direktori logs
    mkdir -p "$APP_DIR/apps/web/logs"

    # Stop process lama jika ada
    pm2 delete qalcuity-web 2>/dev/null || true

    # Start aplikasi
    cd "$APP_DIR"
    pm2 start ecosystem.config.js
    pm2 save

    # Setup PM2 startup
    env PATH=$PATH:/root/.nvm/versions/node/v$NODE_VERSION/bin pm2 startup systemd -u root --hp /root

    print_success "PM2 berhasil dikonfigurasi"
    print_success "Aplikasi berjalan di port $APP_PORT"
}

# --- Step 10: Setup log rotation & cron ---
setup_maintenance() {
    print_step "10/10" "Setup Maintenance & Log Rotation"

    # Log rotation
    cat > /etc/logrotate.d/qalcuity << 'EOF'
/www/wwwroot/qalcuity/apps/web/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

    # Setup cron untuk update harian (jam 3 pagi)
    (crontab -l 2>/dev/null; echo "0 3 * * * /bin/bash $APP_DIR/update.sh >> /var/log/qalcuity-update.log 2>&1") | crontab -

    print_success "Log rotation & cron job berhasil di-setup"
}

# --- Ringkasan Akhir ---
print_summary() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}   🎉 DEPLOYMENT BERHASIL!                     ${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "📁 Direktori aplikasi : ${GREEN}$APP_DIR${NC}"
    echo -e "🌐 Port               : ${GREEN}$APP_PORT${NC}"
    echo -e "📦 PM2 Process        : ${GREEN}$PM2_APP_NAME${NC}"
    echo -e "🔑 NEXTAUTH_SECRET    : ${GREEN}sudah di-generate${NC}"
    echo ""
    echo -e "${YELLOW}📋 Langkah Selanjutnya:${NC}"
    echo -e "1. Buka aaPanel > Website > Add Site"
    echo -e "2. Masukkan domain Anda"
    echo -e "3. Set PHP Version ke 'Pure Static'"
    echo -e "4. Set Root Directory ke: ${GREEN}/www/wwwroot/qalcuity/apps/web${NC}"
    echo -e "5. Di tab Reverse Proxy, tambahkan:"
    echo -e "   - Nama: ${GREEN}qalcuity${NC}"
    echo -e "   - Target URL: ${GREEN}http://127.0.0.1:3000${NC}"
    echo -e "6. (Opsional) Setup SSL Let's Encrypt di aaPanel"
    echo ""
    echo -e "${YELLOW}🔧 Perintah Berguna:${NC}"
    echo -e "   Lihat log        : ${GREEN}pm2 logs qalcuity-web${NC}"
    echo -e "   Restart aplikasi : ${GREEN}pm2 restart qalcuity-web${NC}"
    echo -e "   Status PM2       : ${GREEN}pm2 status${NC}"
    echo -e "   Update aplikasi  : ${GREEN}$APP_DIR/update.sh${NC}"
    echo ""
    echo -e "${GREEN}Cek dokumentasi lengkap di: $APP_DIR/deploy.md${NC}"
    echo ""
}

# ============================================================
# MAIN EXECUTION
# ============================================================
print_header
check_root
check_aapanel
install_nodejs
install_pnpm
install_build_deps
clone_repo
install_deps
setup_env
setup_database
build_app
setup_pm2
setup_maintenance
print_summary
