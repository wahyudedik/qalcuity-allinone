#!/bin/bash
# ============================================================
# Qalcuity — Update Script (Production VPS)
# ============================================================
# Purpose: Pull latest code, run migrations, build, and restart
# Usage:   sudo bash update.sh [--force]
# VPS:     /www/wwwroot/qalcuity (aaPanel Node.js Project Manager)
#
# Flow:
#   1. Pre-flight checks (directory, Node.js, PostgreSQL)
#   2. Backup database
#   3. Git pull latest code
#   4. Install dependencies
#   5. Prisma generate (always)
#   6. Prisma migrate deploy (if schema or migration files changed)
#   7. Build Next.js
#   8. Restart app (aaPanel auto-restart)
#   9. Health check
# ============================================================

set -e

# --- Prisma Engine Configuration ---
# VPS ini tidak bisa download Prisma engine binary dari binaries.prisma.sh
# Gunakan library engine sebagai workaround
export PRISMA_QUERY_ENGINE_TYPE=library

# --- Configuration ---
APP_DIR="/www/wwwroot/qalcuity"
BRANCH="main"
FORCE_MODE=false

# Parse arguments
if [ "${1:-}" = "--force" ]; then
    FORCE_MODE=true
fi

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helper Functions ---
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Qalcuity — Update Script (Production)          ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo ""
    log "${CYAN}[$1] $2${NC}"
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
}

print_success() {
    log "${GREEN}✅ $1${NC}"
}

print_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    log "${RED}❌ $1${NC}"
}

print_info() {
    log "${CYAN}ℹ️  $1${NC}"
}

# ============================================================
# Step 1: Pre-flight Checks
# ============================================================
preflight_checks() {
    print_step "1/8" "Pre-flight checks"

    # Check root
    if [ "$EUID" -ne 0 ]; then
        print_error "Script ini harus dijalankan sebagai root! Gunakan: sudo bash update.sh"
        exit 1
    fi

    # Check app directory
    if [ ! -d "$APP_DIR" ]; then
        print_error "Direktori $APP_DIR tidak ditemukan! Jalankan deploy.sh terlebih dahulu."
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js tidak ditemukan!"
        exit 1
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm tidak ditemukan! Install: npm install -g pnpm"
        exit 1
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git tidak ditemukan!"
        exit 1
    fi

    # Check PostgreSQL running
    if ! systemctl is-active --quiet postgresql 2>/dev/null; then
        print_warning "PostgreSQL tidak running. Mencoba start..."
        systemctl start postgresql 2>/dev/null || true
        sleep 2
        if ! systemctl is-active --quiet postgresql 2>/dev/null; then
            print_error "PostgreSQL gagal di-start! Jalankan: systemctl start postgresql"
            exit 1
        fi
    fi

    print_success "Pre-flight checks passed"
    print_success "Node.js $(node -v) | pnpm $(pnpm -v) | Git $(git --version | cut -d' ' -f3)"
}

# ============================================================
# Step 2: Backup Database
# ============================================================
backup_database() {
    print_step "2/8" "Backup database"

    local PG_BIN="/www/server/pgsql/bin"
    local DB_NAME="qalcuity"
    local BACKUP_DIR="$APP_DIR/backups"
    local TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    local BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

    mkdir -p "$BACKUP_DIR"

    # Backup using pg_dump
    if command -v pg_dump &> /dev/null; then
        pg_dump -U postgres "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE" || true
    elif [ -f "$PG_BIN/pg_dump" ]; then
        $PG_BIN/pg_dump -U postgres "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE" || true
    else
        print_warning "pg_dump tidak ditemukan, skip backup database"
        return 0
    fi

    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        local SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_success "Database backed up: $BACKUP_FILE ($SIZE)"
    else
        print_warning "Backup file kosong atau gagal dibuat"
    fi

    # Cleanup old backups (keep 7 days)
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
}

# ============================================================
# Step 3: Pull Latest Code
# ============================================================
pull_code() {
    print_step "3/8" "Pulling latest code from origin/$BRANCH"
    cd "$APP_DIR"

    # Save current commit for comparison
    local old_commit
    old_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # Stash any local changes
    if ! git diff --quiet 2>/dev/null; then
        print_warning "Local changes detected, stashing..."
        git stash push -m "update-stash-$(date '+%Y%m%d_%H%M%S')" 2>/dev/null || true
    fi

    # Fetch and pull
    git fetch origin 2>&1
    git checkout "$BRANCH" 2>&1
    git pull origin "$BRANCH" 2>&1

    local new_commit
    new_commit=$(git rev-parse --short HEAD)

    if [ "$old_commit" = "$new_commit" ]; then
        print_warning "No new commits (HEAD is still $new_commit)"
    else
        print_success "Code updated: $old_commit → $new_commit"
    fi
}

# ============================================================
# Step 4: Install Dependencies
# ============================================================
install_deps() {
    print_step "4/8" "Installing dependencies"
    cd "$APP_DIR"

    # Check if package.json or pnpm-lock.yaml changed
    local changes
    changes=$(git diff --name-only HEAD~1 2>/dev/null || echo "")

    if echo "$changes" | grep -qE "(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)" || [ "$FORCE_MODE" = true ]; then
        print_info "Package changes detected, installing..."
        if pnpm install --frozen-lockfile 2>&1; then
            print_success "Dependencies installed (frozen lockfile)"
        else
            print_warning "Frozen lockfile failed, trying regular install..."
            pnpm install 2>&1
            print_success "Dependencies installed (regular)"
        fi
    else
        print_success "No package changes detected, skipping install"
    fi
}

# ============================================================
# Step 5: Prisma Generate
# ============================================================
prisma_generate() {
    print_step "5/8" "Prisma generate"
    cd "$APP_DIR/packages/db"

    # Ensure DATABASE_URL from production env is available for Prisma CLI
    # packages/db/.env may have local dev values — override with production
    local WEB_ENV="$APP_DIR/apps/web/.env"
    if [ -f "$WEB_ENV" ]; then
        local PROD_DB_URL
        PROD_DB_URL=$(grep -E "^DATABASE_URL=" "$WEB_ENV" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$PROD_DB_URL" ]; then
            export DATABASE_URL="$PROD_DB_URL"
            print_info "Using production DATABASE_URL from apps/web/.env"
        fi
    fi

    print_info "Generating Prisma client..."
    npx prisma generate 2>&1

    print_success "Prisma client generated"
    cd "$APP_DIR"
}

# ============================================================
# Step 6: Prisma Migrate Deploy
# ============================================================
prisma_migrate() {
    print_step "6/8" "Prisma migrate deploy"
    cd "$APP_DIR/packages/db"

    # Ensure DATABASE_URL from production env is available for Prisma CLI
    local WEB_ENV="$APP_DIR/apps/web/.env"
    if [ -f "$WEB_ENV" ]; then
        local PROD_DB_URL
        PROD_DB_URL=$(grep -E "^DATABASE_URL=" "$WEB_ENV" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$PROD_DB_URL" ]; then
            export DATABASE_URL="$PROD_DB_URL"
            print_info "Using production DATABASE_URL from apps/web/.env"
        fi
    fi

    # Check if schema or migration files changed
    local changes
    changes=$(git diff --name-only HEAD~1 2>/dev/null || echo "")

    local needs_migration=false

    if [ "$FORCE_MODE" = true ]; then
        needs_migration=true
        print_info "Force mode: running migrations regardless of changes"
    elif echo "$changes" | grep -qE "schema\.prisma"; then
        needs_migration=true
        print_info "Schema changes detected"
    elif echo "$changes" | grep -qE "packages/db/prisma/migrations/"; then
        needs_migration=true
        print_info "Migration file changes detected"
    else
        # Always check for pending migrations (someone might have added migrations without schema diff)
        print_info "Checking for pending migrations..."
    fi

    # Always run migrate deploy to catch any pending migrations
    # This is safe — prisma migrate deploy only applies pending migrations
    print_info "Running prisma migrate deploy..."
    if npx prisma migrate deploy 2>&1; then
        print_success "Migrations applied successfully"
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo -e "${RED}   ❌ PRISMA MIGRATE DEPLOY GAGAL!                ${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}Migrations yang gagal harus diperbaiki SEBELUM lanjut.${NC}"
        echo -e "${YELLOW}Jangan lanjut ke build — aplikasi akan error jika migrations belum applied.${NC}"
        echo ""
        echo -e "${YELLOW}Langkah selanjutnya:${NC}"
        echo -e "  1. Cek error message di atas"
        echo -e "  2. Perbaiki migration SQL jika diperlukan"
        echo -e "  3. Jalankan ulang: ${GREEN}sudo bash update.sh${NC}"
        echo ""
        exit 1
    fi

    cd "$APP_DIR"
}

# ============================================================
# Step 7: Build Application
# ============================================================
build_app() {
    print_step "7/8" "Building Next.js application"
    cd "$APP_DIR/apps/web"

    # Clean previous build cache
    if [ -d ".next" ]; then
        print_warning "Menghapus folder .next cache..."
        rm -rf .next
        print_success "Folder .next cache berhasil dihapus"
    fi

    # Build
    print_info "Running pnpm build..."
    cd "$APP_DIR"
    if pnpm build 2>&1; then
        print_success "Build completed successfully"
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo -e "${RED}   ❌ BUILD GAGAL!                                ${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}Build error harus diperbaiki sebelum restart.${NC}"
        echo -e "${YELLOW}Migrations sudah applied — app bisa di-restart setelah fix build.${NC}"
        echo ""
        exit 1
    fi
}

# ============================================================
# Step 8: Restart Application
# ============================================================
restart_app() {
    print_step "8/8" "Restarting application"

    # aaPanel Node.js Project Manager handles process lifecycle
    # Touch the start.sh to trigger aaPanel's file watcher restart
    # OR send SIGHUP to the running Next.js process

    local START_SCRIPT="$APP_DIR/apps/web/start.sh"

    # Ensure start.sh is executable
    chmod +x "$START_SCRIPT" 2>/dev/null || true

    # Method 1: Send SIGHUP to Next.js process (graceful restart)
    local next_pid
    next_pid=$(pgrep -f "next start" 2>/dev/null | head -1 || echo "")

    if [ -n "$next_pid" ]; then
        print_info "Sending SIGHUP to Next.js process (PID: $next_pid)..."
        kill -HUP "$next_pid" 2>/dev/null || true
        sleep 3
        print_success "Restart signal sent"
    else
        print_warning "Next.js process tidak ditemukan. aaPanel akan auto-restart."
        print_info "Jika app tidak running, restart manual dari aaPanel: Website > Node.js Project > Restart"
    fi

    # Verify app is running
    sleep 3
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ] || [ "$http_code" = "302" ] || [ "$http_code" = "307" ]; then
        print_success "Application is running (HTTP $http_code)"
    else
        print_warning "Application may still be starting (HTTP $http_code). Check aaPanel status."
    fi
}

# ============================================================
# Summary
# ============================================================
print_summary() {
    local commit
    commit=$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   🎉 UPDATE BERHASIL!                            ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  📅 Time:      $(date '+%Y-%m-%d %H:%M:%S WIB')"
    echo -e "  🌿 Branch:    $BRANCH"
    echo -e "  📝 Commit:    $commit"
    echo -e "  📂 Directory: $APP_DIR"
    echo ""
    echo -e "${YELLOW}📋 Useful Commands:${NC}"
    echo -e "  pm2 status (or aaPanel)       — Check process status"
    echo -e "  curl http://localhost:3000/api/health — Health check"
    echo -e "  cd packages/db && npx prisma migrate status — Check migration status"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
}

# ============================================================
# MAIN EXECUTION
# ============================================================
print_header
log "🚀 Starting update — $(date '+%Y-%m-%d %H:%M:%S WIB')"
log "📂 Target: $APP_DIR"
log "🌿 Branch: $BRANCH"
[ "$FORCE_MODE" = true ] && log "⚡ Force mode: ON"
echo ""

preflight_checks
backup_database
pull_code
install_deps
prisma_generate
prisma_migrate
build_app
restart_app
print_summary

log "✅ Update finished successfully — $(date '+%Y-%m-%d %H:%M:%S WIB')"
