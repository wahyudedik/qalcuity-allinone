#!/bin/bash
# ============================================================
# Qalcuity - Deploy Script (Pertama Kali)
# Untuk Ubuntu VPS dengan aaPanel + PostgreSQL
# ============================================================
# Jalankan script ini SETELAH aaPanel terinstall
# chmod +x deploy.sh && sudo ./deploy.sh
# ============================================================

set -e

# --- Prisma Engine Configuration ---
# VPS ini tidak bisa download Prisma engine binary dari binaries.prisma.sh
# Gunakan library engine sebagai workaround
export PRISMA_QUERY_ENGINE_TYPE=library

# --- Konfigurasi ---
APP_NAME="qalcuity"
APP_DIR="/www/wwwroot/qalcuity"
REPO_URL="https://github.com/wahyudedik/qalcuity-allinone.git"
NODE_VERSION="24"
PM2_APP_NAME="qalcuity-web"
DOMAIN=""  # Isi domain Anda, contoh: qalcuity.com (opsional)
APP_PORT=3000

# --- PostgreSQL Configuration (aaPanel) ---
PG_BIN="/www/server/pgsql/bin"
DB_NAME="qalcuity"
DB_USER="qalcuity"
DB_PASS=$(openssl rand -hex 16)

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

# --- Cek apakah Node.js terinstall ---
check_nodejs() {
    print_step "1/9" "Cek Node.js"

    if ! command -v node &> /dev/null; then
        print_error "Node.js tidak ditemukan! Install via aaPanel > App Store > Node.js Manager"
    fi

    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        print_error "Node.js v${NODE_VER} terlalu lama. Minimal v18. Update via aaPanel > Node version manager"
    fi

    print_success "Node.js $(node -v) terdeteksi"
}

# --- Install pnpm ---
install_pnpm() {
    print_step "2/9" "Install pnpm"

    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm@9
    fi

    print_success "pnpm $(pnpm -v) terinstall"
}

# --- Install build dependencies ---
install_build_deps() {
    print_step "3/9" "Install build dependencies"

    apt-get update -qq
    apt-get install -y -qq \
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
        curl > /dev/null 2>&1

    print_success "Build dependencies terinstall"
}

# --- Clone repository ---
clone_repo() {
    print_step "4/9" "Clone repository"

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

# --- Install dependencies ---
install_deps() {
    print_step "5/9" "Install dependencies"

    cd "$APP_DIR"
    pnpm install --frozen-lockfile

    print_success "Dependencies terinstall"
}

# --- Setup Environment Variables ---
setup_env() {
    print_step "6/9" "Setup Environment Variables"

    WEB_ENV_FILE="$APP_DIR/apps/web/.env"
    WEB_ENV_PROD="$APP_DIR/apps/web/.env.production"

    # Generate random secrets
    NEXTAUTH_SECRET=$(openssl rand -hex 32)

    # Konfigurasi berdasarkan domain
    if [ -n "$DOMAIN" ]; then
        BASE_URL="https://$DOMAIN"
    else
        BASE_URL="http://$(curl -s ifconfig.me):$APP_PORT"
    fi

    # Buat .env.production jika belum ada
    if [ ! -f "$WEB_ENV_PROD" ]; then
        cat > "$WEB_ENV_PROD" << EOF
# ===================================
# QALCUITY PRODUCTION ENVIRONMENT
# ===================================

# CORE
NEXTAUTH_URL="$BASE_URL"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

# DATABASE (PostgreSQL via aaPanel)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"

# APP
NODE_ENV="production"
NEXT_PUBLIC_APP_NAME="Qalcuity"
NEXT_PUBLIC_APP_URL="$BASE_URL"

# PRISMA ENGINE (Required — VPS ini tidak bisa download engine binary)
PRISMA_QUERY_ENGINE_TYPE=library

# SMTP (opsional — edit sesuai kebutuhan)
# SMTP_HOST=""
# SMTP_PORT=587
# SMTP_USER=""
# SMTP_PASS=""

# AI
AI_PROVIDER="mock"
EOF
        print_success "File .env.production berhasil dibuat"
    else
        print_warning "File .env.production sudah ada, skip pembuatan"
    }

    # Buat .env untuk local dev reference (copy dari .env.production)
    if [ ! -f "$WEB_ENV_FILE" ]; then
        cp "$WEB_ENV_PROD" "$WEB_ENV_FILE"
        print_success "File .env berhasil dibuat (copy dari .env.production)"
    else
        print_warning "File .env sudah ada, skip"
    fi

    print_success "Environment variables berhasil di-setup"
}

# --- Setup Database PostgreSQL ---
setup_database() {
    print_step "7/9" "Setup Database PostgreSQL"

    # Cek PostgreSQL running
    if ! systemctl is-active --quiet postgresql 2>/dev/null; then
        print_warning "PostgreSQL tidak running. Coba start..."
        systemctl start postgresql 2>/dev/null || true
    fi

    # Cek apakah database sudah ada
    if $PG_BIN/psql -U postgres -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "$DB_NAME"; then
        print_warning "Database '$DB_NAME' sudah ada"
    else
        # Buat database
        $PG_BIN/psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
        $PG_BIN/psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
        $PG_BIN/psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
        print_success "Database '$DB_NAME' berhasil dibuat"
    fi

    # Generate Prisma Client
    cd "$APP_DIR"
    pnpm db:generate
    print_success "Prisma Client berhasil di-generate"

    # Deploy migrations ke database
    pnpm db:migrate
    print_success "Migrations berhasil di-deploy ke database"

    # Seed database (opsional)
    print_warning "Menjalankan seed database..."
    pnpm db:seed 2>/dev/null || print_warning "Seed dilewati (mungkin sudah ada data atau error)"

    print_success "Database setup selesai"
}

# --- Build aplikasi ---
build_app() {
    print_step "8/9" "Build aplikasi"

    cd "$APP_DIR"
    pnpm build

    print_success "Build berhasil"
}

# --- Setup Service (aaPanel + PM2) ---
setup_service() {
    print_step "9/9" "Setup Service"

    # Pastikan start.sh executable
    chmod +x "$APP_DIR/apps/web/start.sh"
    print_success "start.sh siap digunakan"

    # Buat direktori logs
    mkdir -p "$APP_DIR/apps/web/logs"

    # Bersihkan port jika ada process lama
    fuser -k $APP_PORT/tcp 2>/dev/null || true
    sleep 1

    # Start service via bash start.sh (background)
    cd "$APP_DIR/apps/web"
    bash start.sh &
    sleep 3

    # Cek apakah running
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$APP_PORT/api/health 2>/dev/null | grep -q "200"; then
        print_success "Aplikasi berjalan di port $APP_PORT"
    else
        print_warning "Aplikasi mungkin masih memulai. Cek log jika ada error."
    fi

    print_success "Service berhasil di-setup"
    print_warning "DI aaPanel: Website > Node.js Project > Add Project"
    print_warning "  Path: $APP_DIR"
    print_warning "  Run opt: Custom command"
    print_warning "  Command: bash $APP_DIR/apps/web/start.sh"
    print_warning "  Port: $APP_PORT"
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
    echo -e "🗄️  Database           : ${GREEN}$DB_NAME (PostgreSQL)${NC}"
    echo -e "🔑 NEXTAUTH_SECRET    : ${GREEN}sudah di-generate${NC}"
    echo ""
    echo -e "${YELLOW}📋 Langkah Selanjutnya:${NC}"
    echo -e "1. Buka aaPanel > Website > Node.js Project > Add Project"
    echo -e "2. Path: ${GREEN}$APP_DIR${NC}"
    echo -e "3. Run opt: ${GREEN}Custom command${NC}"
    echo -e "4. Command: ${GREEN}bash $APP_DIR/apps/web/start.sh${NC}"
    echo -e "5. Port: ${GREEN}$APP_PORT${NC}"
    echo -e "6. Node: v24+ | Pkg Manager: pnpm"
    echo -e "7. Tab Service status > Start"
    echo -e "8. Tab SSL > Let's Encrypt (opsional)"
    echo -e "9. Setup Nginx reverse proxy: domain:443 → http://127.0.0.1:$APP_PORT"
    echo ""
    echo -e "${YELLOW}🔧 Perintah Berguna:${NC}"
    echo -e "   Lihat log (aaPanel)   : Tab Project log"
    echo -e "   Update aplikasi       : ${GREEN}$APP_DIR/update.sh${NC}"
    echo -e "   Cek status port       : ${GREEN}lsof -i:$APP_PORT${NC}"
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
check_nodejs
install_pnpm
install_build_deps
clone_repo
install_deps
setup_env
setup_database
build_app
setup_service
print_summary
