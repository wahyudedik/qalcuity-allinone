#!/bin/bash
# ============================================================
# Qalcuity - Database Manager Script
# Setara Laravel's artisan migrate commands
# ============================================================
# Usage:
#   ./db-manager.sh status     — Cek status migrations
#   ./db-manager.sh migrate    — Jalankan pending migrations
#   ./db-manager.sh reset      — Drop semua + migrate + seed
#   ./db-manager.sh seed       — Jalankan seeders
#   ./db-manager.sh backup     — Backup database
#   ./db-manager.sh restore <file> — Restore dari backup
#   ./db-manager.sh fresh      — Reset + seed (alias)
#   ./db-manager.sh refresh    — Reset + migrate + seed
# ============================================================

set -e
export PRISMA_QUERY_ENGINE_TYPE=library

# Configuration
APP_DIR="/www/wwwroot/qalcuity"
PG_BIN="/www/server/pgsql/bin"
DB_NAME="qalcuity"
DB_USER="qalcuity"
BACKUP_DIR="$APP_DIR/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

cd "$APP_DIR"

case "$1" in
    status)
        echo "📊 Migration Status"
        echo "==================="
        pnpm db:migrate:status
        ;;
    
    migrate|deploy)
        echo "🔄 Running pending migrations..."
        pnpm db:generate
        pnpm db:migrate
        print_success "Migrations applied successfully"
        ;;
    
    reset|fresh)
        echo "⚠️  WARNING: This will DROP ALL TABLES and re-migrate!"
        echo "Database: $DB_NAME"
        read -p "Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            # Backup first
            mkdir -p "$BACKUP_DIR"
            BACKUP_FILE="$BACKUP_DIR/pre_reset_$(date '+%Y%m%d_%H%M%S').sql"
            $PG_BIN/pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || true
            print_info "Backup saved: $BACKUP_FILE"
            
            # Reset
            pnpm db:migrate:reset
            pnpm db:seed
            print_success "Database reset + seed completed"
        else
            print_error "Cancelled"
            exit 1
        fi
        ;;
    
    refresh)
        echo "🔄 Refresh: Reset + Migrate + Seed"
        read -p "Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            pnpm db:migrate:reset
            pnpm db:migrate
            pnpm db:seed
            print_success "Database refreshed successfully"
        else
            print_error "Cancelled"
            exit 1
        fi
        ;;
    
    seed)
        echo "🌱 Running seeders..."
        pnpm db:seed
        print_success "Seed completed"
        ;;
    
    backup)
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/pg_backup_$(date '+%Y%m%d_%H%M%S').sql"
        $PG_BIN/pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
        print_success "Backup saved: $BACKUP_FILE"
        echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        ;;
    
    restore)
        if [ -z "$2" ]; then
            echo "Usage: ./db-manager.sh restore <backup-file.sql>"
            echo ""
            echo "Available backups:"
            ls -la "$BACKUP_DIR"/*.sql 2>/dev/null || echo "  No backups found"
            exit 1
        fi
        
        if [ ! -f "$2" ]; then
            print_error "File not found: $2"
            exit 1
        fi
        
        echo "⚠️  WARNING: This will OVERWRITE the current database!"
        echo "Restore from: $2"
        read -p "Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            # Backup current first
            mkdir -p "$BACKUP_DIR"
            BACKUP_FILE="$BACKUP_DIR/pre_restore_$(date '+%Y%m%d_%H%M%S').sql"
            $PG_BIN/pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || true
            print_info "Current state backed up: $BACKUP_FILE"
            
            # Restore
            $PG_BIN/psql -U "$DB_USER" "$DB_NAME" < "$2"
            pnpm db:generate 2>/dev/null || true
            print_success "Database restored from: $2"
        else
            print_error "Cancelled"
            exit 1
        fi
        ;;
    
    push)
        echo "⚡ Push schema changes (dev only — no migration history)..."
        print_warning "Consider using 'migrate' instead for production"
        pnpm db:generate
        pnpm db:push
        print_success "Schema pushed to database"
        ;;
    
    *)
        echo "Qalcuity Database Manager"
        echo "========================"
        echo ""
        echo "Usage: ./db-manager.sh <command>"
        echo ""
        echo "Commands:"
        echo "  status     Cek status migrations"
        echo "  migrate    Jalankan pending migrations"
        echo "  deploy     Jalankan pending migrations (alias)"
        echo "  reset      Drop semua + migrate + seed (⚠️ DESTRUCTIVE)"
        echo "  fresh      Reset + seed (alias)"
        echo "  refresh    Reset + migrate + seed"
        echo "  seed       Jalankan seeders"
        echo "  backup     Backup database"
        echo "  restore    Restore dari backup"
        echo "  push       Push schema (dev only)"
        echo ""
        echo "Examples:"
        echo "  ./db-manager.sh status"
        echo "  ./db-manager.sh migrate"
        echo "  ./db-manager.sh backup"
        echo "  ./db-manager.sh restore backups/pg_backup_20260901.sql"
        exit 1
        ;;
esac
