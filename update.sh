#!/bin/bash
# ============================================================================
# Qalcuity All-in-One — VPS Update Script
# ============================================================================
# Deployment: aaPanel Node.js Project Manager
# Process Manager: aaPanel + PM2 (fallback)
# App Port: 3000
# App URL: https://qalcuity.com
# ============================================================================
# Jalankan manual: sudo ./update.sh
# Atau otomatis via cron (sudah di-setup oleh deploy.sh)
# ============================================================================

set -e

# --- Prisma Engine Configuration ---
export PRISMA_QUERY_ENGINE_TYPE=library

# --- Konfigurasi ---
APP_NAME="qalcuity"
APP_DIR="/www/wwwroot/qalcuity"
APP_PORT=3000
LOG_FILE="/var/log/qalcuity-update.log"
BRANCH="main"

# --- PostgreSQL (aaPanel) ---
PG_BIN="/www/server/pgsql/bin"
DB_NAME="qalcuity"
DB_USER="qalcuity"

# --- Warna untuk output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Re-exec Guard ---
# Re-exec mechanism: jika update.sh berubah setelah git pull,
# script akan re-exec dirinya sendiri agar versi baru ter-load.
# Gunakan UPDATE_REEXEC env var untuk mencegah infinite loop.
if [ "$UPDATE_REEXEC" = "1" ]; then
    echo -e "${GREEN}ℹ️  Re-exec successful — menjalankan versi baru update.sh${NC}"
fi

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

# --- Re-exec: Simpan hash script sebelum git pull ---
# Digunakan di Step 4 untuk mendeteksi apakah update.sh berubah setelah pull.
# Jika berubah, script akan re-exec dirinya sendiri dengan versi baru.
SCRIPT_HASH_BEFORE=$(md5sum "$0" 2>/dev/null | awk '{print $1}' || echo "unknown")

# --- 1. Cek direktori ---
print_step "1/8 - Cek direktori aplikasi"
if [ ! -d "$APP_DIR" ]; then
    print_error "Direktori $APP_DIR tidak ditemukan! Jalankan deploy.sh terlebih dahulu."
fi
cd "$APP_DIR"

# --- 2. Cek Node.js ---
print_step "2/8 - Cek Node.js environment"
if ! command -v node &> /dev/null; then
    print_error "Node.js tidak ditemukan!"
fi
print_success "Node.js $(node -v) | pnpm $(pnpm -v)"

# --- 3. Backup database PostgreSQL ---
print_step "3/8 - Backup database"
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pg_backup_$(date '+%Y%m%d_%H%M%S').sql"

# Backup PostgreSQL via aaPanel path
if [ -x "$PG_BIN/pg_dump" ]; then
    $PG_BIN/pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || true
    if [ -s "$BACKUP_FILE" ]; then
        print_success "PostgreSQL backup: $BACKUP_FILE"
    else
        print_warning "Backup kosong (database mungkin belum ada)"
        rm -f "$BACKUP_FILE"
    fi
else
    print_warning "pg_dump tidak ditemukan di $PG_BIN, skip backup"
fi

# Bersihkan backup lama (>30 hari)
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete 2>/dev/null || true

# --- 4. Cek ada update baru ---
print_step "4/8 - Cek update terbaru dari repository"

# Simpan commit hash sebelum update
COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Fetch & cek
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

# Pull update — stash local changes dulu jika ada
STASHED=false
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
    echo -e "${YELLOW}📋 Local changes terdeteksi, stashing sebelum pull...${NC}"
    git stash push -m "auto-stash before update $(date +%Y%m%d_%H%M%S)" && STASHED=true
fi

git pull origin "$BRANCH"
print_success "Code berhasil di-pull"

# --- Re-exec: Cek apakah update.sh berubah setelah git pull ---
# Jika script berubah, re-exec dengan versi baru agar Step 5-8 menggunakan kode terbaru.
# Guard: UPDATE_REEXEC=1 mencegah infinite loop (hanya max 1 re-exec).
if [ "$UPDATE_REEXEC" != "1" ]; then
    CURRENT_SCRIPT_HASH=$(md5sum "$0" 2>/dev/null | awk '{print $1}' || echo "unknown")
    if [ "$SCRIPT_HASH_BEFORE" != "$CURRENT_SCRIPT_HASH" ]; then
        echo -e "${YELLOW}⚠️  update.sh berubah setelah git pull. Re-exec dengan versi baru...${NC}"
        export UPDATE_REEXEC=1
        exec bash "$0" "$@"
    fi
fi

# Restore stashed changes
if [ "$STASHED" = true ] && git stash list | grep -q "auto-stash"; then
    echo -e "${YELLOW}📋 Restoring stashed changes...${NC}"
    if ! git stash pop; then
        print_warning "Stash conflict — dropping stash (remote version kept)"
        git stash drop
    fi
fi

# --- 5. Install dependency baru (jika ada perubahan) ---
print_step "5/8 - Install dependencies"

CHANGED_FILES=$(git diff --name-only "$COMMIT_BEFORE" "$COMMIT_AFTER" 2>/dev/null || echo "")

if echo "$CHANGED_FILES" | grep -q "package.json\|pnpm-lock.yaml"; then
    if ! pnpm install --frozen-lockfile; then
        print_warning "frozen-lockfile gagal — menjalankan pnpm install biasa untuk regenerate lockfile"
        pnpm install
    fi
    print_success "Dependencies di-install ulang"
else
    print_success "Tidak ada perubahan dependency, skip"
fi

# --- 6. Prisma generate + migrate (SELALU sebelum build) ---
print_step "6/8 - Prisma generate & migrate"
echo -e "${YELLOW}----------------------------------------${NC}"

cd "$APP_DIR/packages/db"

# Generate Prisma Client
if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client di-generate${NC}"
else
    echo -e "${RED}❌ Prisma generate gagal${NC}"
    cd "$APP_DIR"
    exit 1
fi

# Deploy migrations dengan retry untuk failed migrations (handle P3009)
echo "  Running prisma migrate deploy..."
MIGRATE_EXIT=0
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1) || MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ]; then
    # Check if it's a P3009 error (failed migrations blocking new ones)
    if echo "$MIGRATE_OUTPUT" | grep -q "P3009"; then
        echo -e "${YELLOW}⚠️ Ditemukan migration yang gagal sebelumnya, mencoba resolve...${NC}"
        echo "$MIGRATE_OUTPUT" | head -5

        # Extract failed migration names and resolve them
        # P3009 message format: "The `migration_name` migration ..."
        FAILED_MIGRATIONS=$(echo "$MIGRATE_OUTPUT" | grep -oP 'The `\K[^`]+(?=` migration)' || true)

        for MIGRATION in $FAILED_MIGRATIONS; do
            echo -e "${YELLOW}   Resolving: $MIGRATION${NC}"
            npx prisma migrate resolve --rolled-back "$MIGRATION" 2>&1 || true
        done

        # Retry migration
        echo -e "${YELLOW}   Retrying migration deploy...${NC}"
        RETRY_EXIT=0
        RETRY_OUTPUT=$(npx prisma migrate deploy 2>&1) || RETRY_EXIT=$?
        if [ $RETRY_EXIT -eq 0 ]; then
            echo -e "${GREEN}✅ Migration berhasil setelah resolve${NC}"
        else
            echo -e "${RED}❌ Migration masih gagal setelah resolve:${NC}"
            echo "$RETRY_OUTPUT" | head -10
            echo -e "${RED}   Cek manual: cd packages/db && npx prisma migrate status${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Prisma migrate deploy error (bukan P3009):${NC}"
        echo "$MIGRATE_OUTPUT" | head -10
        echo -e "${YELLOW}ℹ️ Melanjutkan — mungkin migration sudah apply atau conflict${NC}"
    fi
else
    echo -e "${GREEN}✅ Migrations berhasil di-deploy ke database${NC}"
fi

cd "$APP_DIR"

# --- 7. Build aplikasi ---
print_step "7/8 - Build aplikasi"

# Bersihkan .next cache untuk memaksa fresh build
# Ini mencegah crash karena middleware.js lama masih ter-cache
rm -rf apps/web/.next
print_success "Cache .next dibersihkan"

pnpm build
print_success "Build berhasil"

# --- 8. Signal aaPanel to Restart ---
print_step "8/8 - Signaling aaPanel to restart..."

# Kill any process still lingering on the port
if command -v fuser &> /dev/null; then
    fuser -k $APP_PORT/tcp 2>/dev/null || true
    log "Killed existing process on port $APP_PORT"
    sleep 2
fi

# Signal aaPanel to restart the project
# aaPanel watches for changes and auto-restarts via PM2/start.sh
echo -e "${GREEN}✅ Build selesai. aaPanel akan auto-restart project.${NC}"
echo -e "${YELLOW}ℹ️  Jika app belum restart otomatis, klik 'Restart' di aaPanel dashboard.${NC}"

# Health check dengan retry
MAX_RETRIES=5
RETRY_COUNT=0
HTTP_STATUS="000"

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$HTTP_STATUS" != "200" ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 3
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$APP_PORT/api/health 2>/dev/null || echo "000")
    echo "  Health check attempt $RETRY_COUNT/$MAX_RETRIES: HTTP $HTTP_STATUS"
done

if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Health check passed (HTTP $HTTP_STATUS) — Service running!"
else
    print_error "Health check FAILED after $MAX_RETRIES attempts!"
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
echo -e "🌐 URL            : ${GREEN}https://qalcuity.com${NC}"
echo ""
echo -e "${YELLOW}📋 Log file: $LOG_FILE${NC}"
echo -e "${YELLOW}📋 Cek status: lsof -i:$APP_PORT${NC}"
echo ""
