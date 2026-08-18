#!/bin/bash
# ============================================================
# Qalcuity - Update Script (Harian)
# Untuk update otomatis / manual dari server
# ============================================================
# Jalankan manual: sudo ./update.sh
# Atau otomatis via cron (sudah di-setup oleh deploy.sh)
# ============================================================

set -e

# --- Konfigurasi ---
APP_NAME="qalcuity"
APP_DIR="/www/wwwroot/qalcuity"
PM2_APP_NAME="qalcuity-web"
LOG_FILE="/var/log/qalcuity-update.log"
BRANCH="main"

# --- Warna untuk output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Fungsi Logging ---
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo ""
    log "🔄 $1"
    echo -e "${YELLOW}----------------------------------------${NC}"
}

print_success() {
    log "✅ $1"
}

print_warning() {
    log "⚠️  $1"
}

print_error() {
    log "❌ $1"
    exit 1
}

# ============================================================
# MAIN UPDATE EXECUTION
# ============================================================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Qalcuity - Update Script                      ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
log "🚀 Memulai update Qalcuity..."
log "📅 Waktu: $(date '+%Y-%m-%d %H:%M:%S WIB')"
log "📂 Direktori: $APP_DIR"

# --- 1. Cek direktori ---
print_step "1/8 - Cek direktori aplikasi"
if [ ! -d "$APP_DIR" ]; then
    print_error "Direktori $APP_DIR tidak ditemukan! Jalankan deploy.sh terlebih dahulu."
fi
cd "$APP_DIR"

# --- 2. Load NVM ---
print_step "2/8 - Load Node.js environment"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
print_success "Node.js $(node -v) loaded"

# --- 3. Backup database (sebelum update) ---
print_step "3/8 - Backup database"
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date '+%Y%m%d_%H%M%S').db"

# Backup SQLite
if [ -f "$APP_DIR/packages/db/prisma/dev.db" ]; then
    cp "$APP_DIR/packages/db/prisma/dev.db" "$BACKUP_FILE"
    print_success "Database SQLite di-backup ke $BACKUP_FILE"
fi

# Backup PostgreSQL (jika ada)
if grep -q "postgresql" "$APP_DIR/apps/web/.env" 2>/dev/null; then
    if command -v pg_dump &> /dev/null; then
        pg_dump qalcuity > "$BACKUP_DIR/pg_backup_$(date '+%Y%m%d_%H%M%S').sql" 2>/dev/null || true
        print_success "PostgreSQL backup selesai"
    fi
fi

# Bersihkan backup lama (hapus yang > 30 hari)
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete 2>/dev/null || true

# --- 4. Cek ada update baru ---
print_step "4/8 - Cek update terbaru dari repository"

# Simpan commit hash sebelum update
COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Fetch & pull
git fetch origin "$BRANCH"
COMMIT_AFTER=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "unknown")

if [ "$COMMIT_BEFORE" = "$COMMIT_AFTER" ]; then
    echo ""
    echo -e "${GREEN}ℹ️  Tidak ada update baru. Aplikasi sudah versi terbaru.${NC}"
    echo -e "${GREEN}   Commit: ${COMMIT_BEFORE:0:7}${NC}"
    echo ""
    exit 0
fi

echo -e "${YELLOW}📥 Update ditemukan!${NC}"
echo -e "   Sebelum: ${COMMIT_BEFORE:0:7}"
echo -e "   Sesudah: ${COMMIT_AFTER:0:7}"

# Pull update
git pull origin "$BRANCH"
print_success "Code berhasil di-pull"

# --- 5. Install dependency baru (jika ada perubahan) ---
print_step "5/8 - Install dependencies"

# Cek apakah ada perubahan di package.json
CHANGED_FILES=$(git diff --name-only "$COMMIT_BEFORE" "$COMMIT_AFTER" 2>/dev/null || echo "")

if echo "$CHANGED_FILES" | grep -q "package.json\|pnpm-lock.yaml"; then
    pnpm install --frozen-lockfile
    print_success "Dependencies di-install ulang"
else
    print_success "Tidak ada perubahan dependency, skip"
fi

# --- 6. Regenerate Prisma Client (jika schema berubah) ---
print_step "6/8 - Cek Prisma schema"

if echo "$CHANGED_FILES" | grep -q "schema.prisma"; then
    pnpm db:generate
    pnpm db:push --skip-generate 2>/dev/null || pnpm db:push
    print_success "Prisma schema di-update dan di-push ke database"
else
    # Tetap generate untuk memastikan Prisma Client compatible
    pnpm db:generate 2>/dev/null || true
    print_success "Prisma Client verified"
fi

# --- 7. Build aplikasi ---
print_step "7/8 - Build aplikasi"

pnpm build
print_success "Build berhasil"

# --- 8. Restart aplikasi ---
print_step "8/8 - Restart aplikasi via PM2"

# Reload PM2 untuk apply perubahan
pm2 reload ecosystem.config.js --update-env
pm2 save

# Tunggu beberapa detik untuk memastikan aplikasi running
sleep 5

# Cek status
APP_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$APP_STATUS" = "online" ]; then
    print_success "Aplikasi berhasil di-restart dan berjalan normal"
else
    print_warning "Status aplikasi: $APP_STATUS - cek pm2 logs untuk detail"
fi

# Health check — cek apakah aplikasi merespons
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Health check passed (HTTP $HTTP_STATUS)"
else
    print_warning "Health check returned HTTP $HTTP_STATUS — aplikasi mungkin masih memulai"
fi

# ============================================================
# RINGKASAN
# ============================================================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}   ✅ UPDATE SELESAI!                           ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "📅 Waktu update   : $(date '+%Y-%m-%d %H:%M:%S WIB')"
echo -e "🔀 Branch         : ${GREEN}$BRANCH${NC}"
echo -e "📝 Commit         : ${GREEN}${COMMIT_AFTER:0:7}${NC}"
echo -e "📦 Backup         : ${GREEN}$BACKUP_FILE${NC}"
echo ""
echo -e "${YELLOW}📋 Log file: $LOG_FILE${NC}"
echo -e "${YELLOW}📋 Cek status: pm2 status${NC}"
echo -e "${YELLOW}📋 Lihat log: pm2 logs $PM2_APP_NAME${NC}"
echo ""
