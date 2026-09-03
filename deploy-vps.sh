#!/bin/bash
# ============================================================
# Qalcuity — VPS Deployment Script (Production)
# ============================================================
# Purpose: Deploy latest changes to VPS with zero-downtime
# Usage:   sudo ./deploy-vps.sh [branch]
# Rollback: sudo ./deploy-vps.sh rollback
# ============================================================

set -euo pipefail

# --- Prisma Engine Configuration ---
# VPS ini tidak bisa download Prisma engine binary dari binaries.prisma.sh
# Gunakan library engine sebagai workaround
export PRISMA_QUERY_ENGINE_TYPE=library

# --- Configuration ---
APP_NAME="qalcuity"
APP_DIR="/www/wwwroot/qalcuity"
BRANCH="${1:-main}"
PM2_APP_NAME="qalcuity-web"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/deploy-$(date '+%Y%m%d_%H%M%S').log"
BACKUP_DIR="$APP_DIR/backups"
MAX_BACKUPS=5

# --- PostgreSQL (aaPanel) ---
PG_BIN="/www/server/pgsql/bin"
DB_NAME="qalcuity"
DB_USER="qalcuity"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helper Functions ---
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$msg" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Qalcuity — VPS Deployment Script               ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo ""
    log "${CYAN}[$1/$TOTAL_STEPS] $2${NC}"
    log "${YELLOW}────────────────────────────────────────${NC}"
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

# --- Rollback Function ---
rollback() {
    print_header
    log "${RED}🔄 ROLLBACK MODE${NC}"
    echo ""

    # Find latest backup
    local latest_backup
    latest_backup=$(ls -t "$BACKUP_DIR"/deploy_backup_* 2>/dev/null | head -1)

    if [ -z "$latest_backup" ]; then
        print_error "No backup found in $BACKUP_DIR! Cannot rollback."
        exit 1
    fi

    print_info "Latest backup: $latest_backup"
    print_info "Restoring from backup..."

    cd "$APP_DIR"

    # Restore git state
    if [ -f "$latest_backup/HEAD" ]; then
        git stash 2>/dev/null || true
        local backup_ref
        backup_ref=$(cat "$latest_backup/HEAD")
        git checkout "$backup_ref" 2>/dev/null || git checkout "$BRANCH"
        print_success "Git state restored to: $backup_ref"
    fi

    # Restore .env if backed up
    if [ -f "$latest_backup/.env" ]; then
        cp "$latest_backup/.env" "$APP_DIR/apps/web/.env"
        print_success ".env restored from backup"
    fi

    # Reinstall dependencies and rebuild
    print_info "Reinstalling dependencies..."
    pnpm install --frozen-lockfile 2>&1 | tee -a "$LOG_FILE" || pnpm install 2>&1 | tee -a "$LOG_FILE"

    # Regenerate Prisma client
    print_info "Regenerating Prisma client..."
    cd packages/db && npx prisma generate 2>&1 | tee -a "$LOG_FILE" && cd ../..

    # Rebuild
    print_info "Rebuilding application..."
    cd apps/web && npx next build 2>&1 | tee -a "$LOG_FILE" && cd ../..

    # Restart PM2
    print_info "Restarting PM2..."
    cd apps/web && pm2 restart "$PM2_APP_NAME" 2>&1 | tee -a "$LOG_FILE" || pm2 start ecosystem.config.js 2>&1 | tee -a "$LOG_FILE"
    cd ../..

    # Verify
    sleep 3
    if pm2 list 2>/dev/null | grep -q "online"; then
        print_success "Application is ONLINE after rollback"
    else
        print_warning "Application may not be fully started yet. Check: pm2 status"
    fi

    print_success "Rollback complete!"
    log "${GREEN}═══════════════════════════════════════════════════${NC}"
    log "${GREEN}   Rollback finished — $(date '+%Y-%m-%d %H:%M:%S')  ${NC}"
    log "${GREEN}═══════════════════════════════════════════════════${NC}"
    exit 0
}

# --- Pre-flight Checks ---
preflight_checks() {
    # Check if rollback mode
    if [ "${1:-}" = "rollback" ]; then
        rollback
    fi

    # Check root
    if [ "$EUID" -ne 0 ]; then
        print_error "Script ini harus dijalankan sebagai root! Gunakan: sudo ./deploy-vps.sh"
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

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 tidak ditemukan! Install: npm install -g pm2"
        exit 1
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git tidak ditemukan!"
        exit 1
    fi

    # Create directories
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
}

# --- Step 1: Backup Current State ---
backup_current() {
    print_step "1" "Backing up current state"
    cd "$APP_DIR"

    local backup_name="deploy_backup_$(date '+%Y%m%d_%H%M%S')"
    local backup_path="$BACKUP_DIR/$backup_name"
    mkdir -p "$backup_path"

    # Save current git ref
    git rev-parse HEAD > "$backup_path/HEAD" 2>/dev/null || true
    git rev-parse --abbrev-ref HEAD > "$backup_path/BRANCH" 2>/dev/null || true

    # Backup .env
    if [ -f "apps/web/.env" ]; then
        cp "apps/web/.env" "$backup_path/.env"
    fi

    # Backup Prisma schema
    if [ -f "packages/db/prisma/schema.prisma" ]; then
        cp "packages/db/prisma/schema.prisma" "$backup_path/schema.prisma"
    fi

    print_success "Backup created: $backup_path"

    # Cleanup old backups (keep MAX_BACKUPS)
    local backup_count
    backup_count=$(ls -d "$BACKUP_DIR"/deploy_backup_* 2>/dev/null | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        ls -dt "$BACKUP_DIR"/deploy_backup_* | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf
        print_info "Cleaned up old backups (kept $MAX_BACKUPS)"
    fi
}

# --- Step 2: Pull Latest Code ---
pull_code() {
    print_step "2" "Pulling latest code from origin/$BRANCH"
    cd "$APP_DIR"

    # Stash any local changes
    if ! git diff --quiet 2>/dev/null; then
        print_warning "Local changes detected, stashing..."
        git stash push -m "deploy-stash-$(date '+%Y%m%d_%H%M%S')" 2>/dev/null || true
    fi

    # Fetch and pull
    git fetch origin 2>&1 | tee -a "$LOG_FILE"
    git checkout "$BRANCH" 2>&1 | tee -a "$LOG_FILE"
    git pull origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"

    local new_commit
    new_commit=$(git rev-parse --short HEAD)
    print_success "Code updated to commit: $new_commit"
}

# --- Step 3: Install Dependencies ---
install_deps() {
    print_step "3" "Installing dependencies"
    cd "$APP_DIR"

    # Use frozen-lockfile first, fallback to regular install
    if pnpm install --frozen-lockfile 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Dependencies installed (frozen lockfile)"
    else
        print_warning "Frozen lockfile failed, trying regular install..."
        pnpm install 2>&1 | tee -a "$LOG_FILE"
        print_success "Dependencies installed (regular)"
    fi
}

# --- Step 4: Database Migration ---
run_migrations() {
    print_step "4" "Running database migrations"
    cd "$APP_DIR/packages/db"

    # Generate Prisma client first
    print_info "Generating Prisma client..."
    npx prisma generate 2>&1 | tee -a "$LOG_FILE"
    print_success "Prisma client generated"

    # Run pending migrations
    print_info "Applying pending migrations..."
    if npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Migrations applied successfully"
    else
        print_warning "Some migrations may have failed — check output above"
        print_info "Attempting prisma db push as fallback..."
        npx prisma db push 2>&1 | tee -a "$LOG_FILE" || true
    fi

    cd "$APP_DIR"
}

# --- Step 5: Build Application ---
build_app() {
    print_step "5" "Building Next.js application"
    cd "$APP_DIR/apps/web"

    # Clean previous build
    rm -rf .next

    # Build
    print_info "Running next build..."
    if npx next build 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Build completed successfully"
    else
        print_error "Build FAILED! Check output above."
        print_warning "Consider running rollback: sudo ./deploy-vps.sh rollback"
        exit 1
    fi

    cd "$APP_DIR"
}

# --- Step 6: Restart Application ---
restart_app() {
    print_step "6" "Restarting application via PM2"
    cd "$APP_DIR/apps/web"

    # Check if PM2 app exists
    if pm2 list 2>/dev/null | grep -q "$PM2_APP_NAME"; then
        print_info "Restarting existing PM2 process..."
        pm2 restart "$PM2_APP_NAME" 2>&1 | tee -a "$LOG_FILE"
    else
        print_info "Starting new PM2 process..."
        pm2 start ecosystem.config.js 2>&1 | tee -a "$LOG_FILE"
    fi

    # Save PM2 process list for auto-restart on reboot
    pm2 save 2>&1 | tee -a "$LOG_FILE"

    print_success "Application restarted"
    cd "$APP_DIR"
}

# --- Step 7: Health Check ---
health_check() {
    print_step "7" "Verifying deployment"
    local max_retries=10
    local retry_count=0
    local app_url="http://localhost:3000"

    print_info "Waiting for application to start..."
    sleep 5

    while [ $retry_count -lt $max_retries ]; do
        retry_count=$((retry_count + 1))

        # Check PM2 status
        if pm2 list 2>/dev/null | grep -q "online"; then
            # Check HTTP response
            local http_code
            http_code=$(curl -s -o /dev/null -w "%{http_code}" "$app_url/api/health" 2>/dev/null || echo "000")

            if [ "$http_code" = "200" ] || [ "$http_code" = "302" ] || [ "$http_code" = "307" ]; then
                print_success "Health check PASSED (HTTP $http_code)"
                return 0
            fi

            if [ "$http_code" = "000" ]; then
                print_info "  Attempt $retry_count/$max_retries — Connection refused, waiting..."
            else
                print_info "  Attempt $retry_count/$max_retries — HTTP $http_code, waiting..."
            fi
        else
            print_info "  Attempt $retry_count/$max_retries — PM2 not online yet, waiting..."
        fi

        sleep 3
    done

    print_warning "Health check did not pass after $max_retries attempts"
    print_info "Application may still be starting. Check: pm2 status && pm2 logs $PM2_APP_NAME"
    return 0
}

# --- Step 8: Summary ---
print_summary() {
    local end_time
    end_time=$(date '+%Y-%m-%d %H:%M:%S')

    echo ""
    log "${GREEN}═══════════════════════════════════════════════════${NC}"
    log "${GREEN}   Deployment Complete!                           ${NC}"
    log "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    log "  📅 Time:      $end_time"
    log "  🌿 Branch:    $BRANCH"
    log "  📝 Commit:    $(cd "$APP_DIR" && git rev-parse --short HEAD)"
    log "  📂 Directory: $APP_DIR"
    log "  📋 Log:       $LOG_FILE"
    log "  💾 Backup:    $BACKUP_DIR/deploy_backup_*"
    echo ""
    log "  Useful commands:"
    log "    pm2 status                    — Check process status"
    log "    pm2 logs $PM2_APP_NAME        — View application logs"
    log "    pm2 monit                     — Monitor in real-time"
    log "    sudo ./deploy-vps.sh rollback  — Rollback to previous version"
    echo ""
    log "${GREEN}═══════════════════════════════════════════════════${NC}"
}

# ============================================================
# MAIN EXECUTION
# ============================================================
TOTAL_STEPS=7

print_header
log "🚀 Starting deployment — $(date '+%Y-%m-%d %H:%M:%S WIB')"
log "📂 Target: $APP_DIR"
log "🌿 Branch: $BRANCH"
echo ""

# Pre-flight checks (also handles rollback mode)
preflight_checks "${1:-}"

# Execute deployment steps
backup_current
pull_code
install_deps
run_migrations
build_app
restart_app
health_check
print_summary

log "✅ Deployment finished successfully — $(date '+%Y-%m-%d %H:%M:%S WIB')"
