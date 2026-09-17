#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel Node.js Project Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project Manager
# Command: bash /www/wwwroot/qalcuity/apps/web/start.sh
#
# Fungsi:
#   1. Enable TCP socket reuse (net.ipv4.tcp_tw_reuse)
#   2. Kill SEMUA Next.js processes (termasuk zombie port lain)
#   3. Verifikasi port 3000 bebas — HARD STOP jika gagal
#   4. Start Next.js production server di port 3000
#
# v4.0 (2026-09-17): HARD STOP — no fallback, aggressive cleanup
#   Root cause v3.0: check_port_free() false positive dari fuser
#   (TIME_WAIT socket detected sebagai "occupied"), fallback ke
#   port 3001 memecah aaPanel monitoring, menciptakan failure loop.
#   Fix: Hanya ss -tlnp (LISTEN state) yang menentukan port free.
#   3x retry agresif dengan sleep bertahap. HARD STOP jika port
#   3000 tidak bisa dibebaskan. Cleanup semua zombie node processes.
#   Enable net.ipv4.tcp_tw_reuse untuk TIME_WAIT socket reuse.
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library

APP_DIR="/www/wwwroot/qalcuity/apps/web"
APP_PORT=3000
MAX_RETRIES=3
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
DIAG_LOG="/www/wwwroot/qalcuity/apps/web/start-diag.log"

echo "$LOG_PREFIX 🔄 Starting Qalcuity v4.0..."

# ============================================================
# Helper: Log to both stdout AND diagnostic log file
# ============================================================
log() {
    echo "$1"
    echo "$1" >> "$DIAG_LOG"
}

# ============================================================
# STEP 1: Enable TCP socket reuse (TIME_WAIT faster cleanup)
# ============================================================
# net.ipv4.tcp_tw_reuse=1 allows the kernel to reuse sockets
# in TIME_WAIT state for new connections if safe to do so.
# This is critical for fast restart scenarios.

log "$LOG_PREFIX 🔧 [SYSCTL] Enabling tcp_tw_reuse for faster port release..."
if command -v sysctl &> /dev/null; then
    sysctl -w net.ipv4.tcp_tw_reuse=1 2>/dev/null && \
        log "$LOG_PREFIX   [SYSCTL] ✅ net.ipv4.tcp_tw_reuse=1" || \
        log "$LOG_PREFIX   [SYSCTL] ⚠️  Failed to set tcp_tw_reuse (may need root)"
else
    log "$LOG_PREFIX   [SYSCTL] ⚠️  sysctl not available, skipping"
fi

# ============================================================
# STEP 2: DIAGNOSTIC — Who owns port 3000?
# ============================================================
# Log ownership info SEBELUM kill untuk debugging.

log "$LOG_PREFIX 🔍 [PORT CHECK] Scanning port $APP_PORT ownership..."

# lsof: most detailed — shows PID, user, FD, command
if command -v lsof &> /dev/null; then
    LSOF_OUTPUT=$(lsof -i ":$APP_PORT" -nP 2>/dev/null || true)
    if [ -n "$LSOF_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] lsof output:"
        echo "$LSOF_OUTPUT" | while IFS= read -r line; do
            log "$LOG_PREFIX   $line"
        done
    fi
fi

# ss: shows socket state and process info
if command -v ss &> /dev/null; then
    SS_OUTPUT=$(ss -tlnp "sport = :$APP_PORT" 2>/dev/null || true)
    if [ -n "$SS_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] ss -tlnp (LISTEN) output:"
        echo "$SS_OUTPUT" | while IFS= read -r line; do
            log "$LOG_PREFIX   $line"
        done
    fi
    # Also show ALL socket states (not just LISTEN) for diagnostics
    SS_ALL_OUTPUT=$(ss -tnp "sport = :$APP_PORT" 2>/dev/null || true)
    if [ -n "$SS_ALL_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] ss -tnp (ALL states) output:"
        echo "$SS_ALL_OUTPUT" | while IFS= read -r line; do
            log "$LOG_PREFIX   $line"
        done
    fi
fi

# fuser: quick PID lookup (diagnostic only, NOT used for port decision)
if command -v fuser &> /dev/null; then
    FUSER_OUTPUT=$(fuser "$APP_PORT/tcp" 2>/dev/null || true)
    if [ -n "$FUSER_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] fuser output (diagnostic only): $FUSER_OUTPUT"
    fi
fi

# ============================================================
# STEP 3: KILL ALL Next.js processes (port-agnostic cleanup)
# ============================================================
# v4.0 FIX: Kill SEMUA Next.js-related processes, bukan hanya
# yang di port 3000. Ini membersihkan zombie dari fallback
# sebelumnya (port 3001) dan orphaned workers.

log "$LOG_PREFIX 🔨 [KILL] Phase 1: Killing ALL Next.js-related processes..."

# Method 1: fuser -k -9 on target port (kernel-level)
if command -v fuser &> /dev/null; then
    log "$LOG_PREFIX   [KILL] fuser -k -9 on port $APP_PORT..."
    fuser -k -9 "$APP_PORT/tcp" 2>/dev/null && \
        log "$LOG_PREFIX   [KILL] ✅ fuser -k -9 sent on port $APP_PORT" || \
        log "$LOG_PREFIX   [KILL] ℹ️  fuser: no processes on port $APP_PORT"
fi

# Method 2: Also kill anything on fallback port (cleanup old zombies)
if command -v fuser &> /dev/null; then
    log "$LOG_PREFIX   [KILL] fuser -k -9 on port 3001 (cleanup zombie)..."
    fuser -k -9 3001/tcp 2>/dev/null && \
        log "$LOG_PREFIX   [KILL] ✅ fuser -k -9 sent on port 3001" || \
        log "$LOG_PREFIX   [KILL] ℹ️  fuser: no processes on port 3001"
fi

# Method 3: pkill all Next.js-related processes (catch orphans)
log "$LOG_PREFIX   [KILL] pkill all next-server / next start processes..."
pkill -9 -f "next-server" 2>/dev/null && log "$LOG_PREFIX   [KILL] ✅ pkill next-server" || true
pkill -9 -f "next start" 2>/dev/null && log "$LOG_PREFIX   [KILL] ✅ pkill 'next start'" || true
pkill -9 -f "node.*start\.sh" 2>/dev/null && log "$LOG_PREFIX   [KILL] ✅ pkill 'node.*start.sh'" || true
pkill -9 -f "npx.*next" 2>/dev/null && log "$LOG_PREFIX   [KILL] ✅ pkill 'npx.*next'" || true

# Method 4: Collect and kill PIDs via lsof (most reliable)
if command -v lsof &> /dev/null; then
    LSOF_PIDS=$(lsof -t -i ":$APP_PORT" 2>/dev/null || true)
    if [ -n "$LSOF_PIDS" ]; then
        log "$LOG_PREFIX   [KILL] lsof found PIDs on port $APP_PORT: $LSOF_PIDS"
        for PID in $LSOF_PIDS; do
            if kill -0 "$PID" 2>/dev/null; then
                kill -9 "$PID" 2>/dev/null && \
                    log "$LOG_PREFIX   [KILL] ✅ kill -9 sent to PID $PID" || \
                    log "$LOG_PREFIX   [KILL] ⚠️  kill -9 failed for PID $PID"
            fi
        done
    fi
fi

# ============================================================
# STEP 4: AGGRESSIVE RETRY — Verify port 3000 is free
# ============================================================
# v4.0 FIX: Retry loop dengan sleep bertahap (2s → 3s → 5s).
# Hanya ss -tlnp yang menentukan port free (bukan fuser/lsof).
# fuser/lsof hanya untuk logging diagnostik.

check_port_free() {
    local port=$1
    # PRIMARY CHECK: ss -tlnp — only LISTEN state matters
    # If no process is LISTENING on the port, it's free for binding.
    # TIME_WAIT, CLOSE_WAIT, etc. do NOT prevent binding with SO_REUSEADDR.
    if command -v ss &> /dev/null; then
        if ss -tlnp "sport = :$port" 2>/dev/null | grep -q ":$port"; then
            echo "false"
            return
        fi
    fi
    # FALLBACK: if ss not available, use fuser (less accurate)
    if ! command -v ss &> /dev/null && command -v fuser &> /dev/null; then
        if fuser "$port/tcp" &>/dev/null; then
            echo "false"
            return
        fi
    fi
    echo "true"
}

# Diagnostic function: log who still holds the port (for debugging)
log_port_occupants() {
    local port=$1
    log "$LOG_PREFIX 📋 [DIAG] Port $port occupants:"
    if command -v ss &> /dev/null; then
        log "$LOG_PREFIX   [DIAG] ss -tlnp (LISTEN):"
        ss -tlnp "sport = :$port" 2>/dev/null | while IFS= read -r line; do
            log "$LOG_PREFIX     $line"
        done
        log "$LOG_PREFIX   [DIAG] ss -tnp (ALL states):"
        ss -tnp "sport = :$port" 2>/dev/null | while IFS= read -r line; do
            log "$LOG_PREFIX     $line"
        done
    fi
    if command -v lsof &> /dev/null; then
        log "$LOG_PREFIX   [DIAG] lsof:"
        lsof -i ":$port" -nP 2>/dev/null | while IFS= read -r line; do
            log "$LOG_PREFIX     $line"
        done
    fi
    if command -v fuser &> /dev/null; then
        log "$LOG_PREFIX   [DIAG] fuser: $(fuser "$port/tcp" 2>/dev/null || echo 'none')"
    fi
}

# Retry loop with escalating sleep
PORT_FREE=false
RETRY_COUNT=0
SLEEP_TIMES=(2 3 5)

for i in "${!SLEEP_TIMES[@]}"; do
    RETRY_COUNT=$((i + 1))
    SLEEP_SEC=${SLEEP_TIMES[$i]}

    log "$LOG_PREFIX ⏳ [WAIT] Sleeping $SLEEP_SEC seconds (attempt $RETRY_COUNT/$MAX_RETRIES)..."
    sleep "$SLEEP_SEC"

    RESULT=$(check_port_free "$APP_PORT")
    if [ "$RESULT" = "true" ]; then
        log "$LOG_PREFIX ✅ [VERIFY] Port $APP_PORT is FREE (attempt $RETRY_COUNT)"
        PORT_FREE=true
        break
    else
        log "$LOG_PREFIX ❌ [VERIFY] Port $APP_PORT still occupied (attempt $RETRY_COUNT/$MAX_RETRIES)"
        log_port_occupants "$APP_PORT"

        # Additional kill round before next retry
        if [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
            log "$LOG_PREFIX 🔨 [KILL] Retry kill round $RETRY_COUNT..."
            if command -v fuser &> /dev/null; then
                fuser -k -9 "$APP_PORT/tcp" 2>/dev/null || true
            fi
            pkill -9 -f "next-server" 2>/dev/null || true
            pkill -9 -f "next start" 2>/dev/null || true
        fi
    fi
done

# ============================================================
# STEP 5: HARD STOP if port 3000 not free
# ============================================================
# v4.0 CRITICAL: TIDAK ADA FALLBACK ke port lain.
# Jika port 3000 tidak bisa dibebaskan setelah MAX_RETRIES
# attempts, EXIT dengan error code.
# Reason: Fallback ke port 3001 memecah aaPanel monitoring
# dan menciptakan failure loop yang berulang.

if [ "$PORT_FREE" != "true" ]; then
    log "$LOG_PREFIX 🛑 [HARD STOP] Port $APP_PORT tidak bisa dibebaskan setelah $MAX_RETRIES percobaan!"
    log "$LOG_PREFIX 🛑 [HARD STOP] FALLBACK KE PORT LAIN DITIADAKAN — aplikasi TIDAK akan dimulai."
    log "$LOG_PREFIX 🛑 [HARD STOP] aaPanel akan restart otomatis — port mungkin sudah free di percobaan berikutnya."
    log "$LOG_PREFIX 📋 [DIAG] Rekomendasi troubleshooting:"
    log "$LOG_PREFIX 📋 [DIAG]   1. Cek apakah ada service lain yang menggunakan port 3000:"
    log "$LOG_PREFIX 📋 [DIAG]      ss -tlnp | grep :3000"
    log "$LOG_PREFIX 📋 [DIAG]      lsof -i :3000 -nP"
    log "$LOG_PREFIX 📋 [DIAG]   2. Cek apakah ada orphaned node processes:"
    log "$LOG_PREFIX 📋 [DIAG]      ps aux | grep -E 'next|node' | grep -v grep"
    log "$LOG_PREFIX 📋 [DIAG]   3. Manual cleanup:"
    log "$LOG_PREFIX 📋 [DIAG]      fuser -k -9 3000/tcp"
    log "$LOG_PREFIX 📋 [DIAG]      pkill -9 -f next-server"
    log "$LOG_PREFIX 📋 [DIAG]   4. Cek kernel socket state:"
    log "$LOG_PREFIX 📋 [DIAG]      cat /proc/net/tcp | head -20"
    log "$LOG_PREFIX 📋 [DIAG]      sysctl net.ipv4.tcp_tw_reuse"
    log "$LOG_PREFIX 📋 [DIAG]      sysctl net.ipv4.tcp_fin_timeout"

    # Exit dengan error code — aaPanel akan restart otomatis
    # JANGAN exit 0 — biarkan aaPanel tahu ada masalah
    exit 1
fi

# ============================================================
# STEP 6: Start Next.js di port 3000
# ============================================================
# PENTING: JANGAN gunakan `exec` di sini!
# aaPanel Node.js Project Manager membutuhkan shell process tetap hidup
# untuk PID tracking. `exec` menggantikan shell process dengan npx,
# menyebabkan aaPanel kehilangan PID → status "Stopped".
# Tanpa `exec`, shell process tetap hidup sebagai parent process.
# ============================================================
cd "$APP_DIR"
log "$LOG_PREFIX 🚀 Starting Next.js on port $APP_PORT..."
npx next start -p "$APP_PORT"

# ============================================================
# STEP 7: Post-start logging
# ============================================================
# Setelah npx next start selesai (atau crash), log status.
# JANGAN exit dengan error code — biarkan aaPanel handle retry.
# ============================================================
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    log "$LOG_PREFIX ⚠️  Next.js exited with code $EXIT_CODE on port $APP_PORT"
    log "$LOG_PREFIX ℹ️  aaPanel will handle automatic restart"
    # JANGAN exit 1 — biarkan aaPanel retry
    # exit 0 agar aaPanel tidak mark app sebagai "crashed"
fi

log "$LOG_PREFIX 🏁 Start script completed (exit code: $EXIT_CODE, port: $APP_PORT)"
