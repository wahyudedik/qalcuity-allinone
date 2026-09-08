#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel Node.js Project Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project Manager
# Command: bash /www/wwwroot/qalcuity/apps/web/start.sh
#
# Fungsi:
#   1. Kill proses lama yang masih memegang port (anti EADDRINUSE)
#   2. Start Next.js production server
#
# Ditambahkan: Kill process logic untuk handle:
#   - aaPanel auto-restart race condition
#   - update.sh → aaPanel restart overlap
#   - Crash recovery tanpa cleanup
#
# v2.0 (2026-09-08): Aggressive multi-method kill
#   Root cause fix: elif chain hanya coba SATU method kill.
#   Sekarang: SEMUA method dicoba secara sequential (fuser + lsof + ss + pkill)
#   + double-check port kosong + sleep untuk OS port release
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library

APP_DIR="/www/wwwroot/qalcuity/apps/web"
APP_PORT=3000
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

echo "$LOG_PREFIX 🔄 Starting Qalcuity..."

# ============================================================
# STEP 1: AGGRESSIVE Kill existing process on port 3000
# ============================================================
# v2.0 FIX: Gunakan SEMUA method secara sequential (bukan elif).
# Root cause EADDRINUSE: elif chain hanya coba 1 method → jika method
# pertama gagal melihat process (permission/visibility), method lain
# tidak pernah dicoba → process tetap hidup → "Port 3000 is free" → EADDRINUSE.
#
# Strategi: Jalankan SEMUA kill method yang tersedia, satu per satu.
# Setiap method independently mencoba kill process di port 3000.

echo "$LOG_PREFIX 🔍 Scanning for processes on port $APP_PORT (multi-method)..."

# Collect all PIDs from ALL available methods (not elif — ALL)
ALL_PIDS=""

# Method 1: fuser — paling reliable di Linux untuk port-based kill
if command -v fuser &> /dev/null; then
    FUSER_PIDS=$(fuser $APP_PORT/tcp 2>/dev/null | tr -s ' ' '\n' | grep -oP '^\d+$' || true)
    if [ -n "$FUSER_PIDS" ]; then
        echo "$LOG_PREFIX ⚠️  fuser found PIDs: $FUSER_PIDS"
        ALL_PIDS="$ALL_PIDS $FUSER_PIDS"
    fi
fi

# Method 2: lsof — fallback untuk visibility lintas user
if command -v lsof &> /dev/null; then
    LSOF_PIDS=$(lsof -t -i:$APP_PORT 2>/dev/null || true)
    if [ -n "$LSOF_PIDS" ]; then
        echo "$LOG_PREFIX ⚠️  lsof found PIDs: $LSOF_PIDS"
        ALL_PIDS="$ALL_PIDS $LSOF_PIDS"
    fi
fi

# Method 3: ss — fallback terakhir untuk port scanning
if command -v ss &> /dev/null; then
    SS_PIDS=$(ss -tlnp "sport = :$APP_PORT" 2>/dev/null | grep -oP 'pid=\K\d+' || true)
    if [ -n "$SS_PIDS" ]; then
        echo "$LOG_PREFIX ⚠️  ss found PIDs: $SS_PIDS"
        ALL_PIDS="$ALL_PIDS $SS_PIDS"
    fi
fi

# Method 4: pkill by process pattern — kill known Next.js process names
# Ini menangkap process yang mungkin belum bound ke port tapi sedang startup
NEXT_PIDS=$(pgrep -f "next-server" 2>/dev/null || true)
NEXT_START_PIDS=$(pgrep -f "next start" 2>/dev/null || true)
if [ -n "$NEXT_PIDS" ] || [ -n "$NEXT_START_PIDS" ]; then
    echo "$LOG_PREFIX ⚠️  pkill found Next.js patterns: ${NEXT_PIDS} ${NEXT_START_PIDS}"
    ALL_PIDS="$ALL_PIDS $NEXT_PIDS $NEXT_START_PIDS"
fi

# Deduplicate PIDs
UNIQUE_PIDS=$(echo "$ALL_PIDS" | tr ' ' '\n' | sort -un | grep -oP '^\d+$' || true)

if [ -n "$UNIQUE_PIDS" ]; then
    echo "$LOG_PREFIX ⚠️  Found $(echo "$UNIQUE_PIDS" | wc -l) unique process(es) to kill: $UNIQUE_PIDS"

    # Phase 1: SIGTERM (graceful shutdown) — semua PID sekaligus
    echo "$LOG_PREFIX 📡 Phase 1: Sending SIGTERM to all processes..."
    for PID in $UNIQUE_PIDS; do
        kill $PID 2>/dev/null && echo "$LOG_PREFIX   SIGTERM → PID $PID" || true
    done
    sleep 3

    # Phase 2: SIGKILL (force kill) — untuk process yang masih hidup
    REMAINING=""
    for PID in $UNIQUE_PIDS; do
        if kill -0 $PID 2>/dev/null; then
            REMAINING="$REMAINING $PID"
        fi
    done

    if [ -n "$REMAINING" ]; then
        echo "$LOG_PREFIX 🔨 Phase 2: Force killing remaining processes: $REMAINING"
        for PID in $REMAINING; do
            kill -9 $PID 2>/dev/null && echo "$LOG_PREFIX   SIGKILL → PID $PID" || true
        done
        sleep 2
    fi

    # Phase 3: Additional kill methods (belt and suspenders)
    echo "$LOG_PREFIX 🎯 Phase 3: Additional kill attempts (belt and suspenders)..."
    fuser -k -9 $APP_PORT/tcp 2>/dev/null || true
    lsof -ti:$APP_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
    pkill -9 -f "next-server" 2>/dev/null || true
    pkill -9 -f "next start" 2>/dev/null || true
    sleep 2

    echo "$LOG_PREFIX ✅ Kill phases completed"
else
    echo "$LOG_PREFIX ℹ️  No processes found on port $APP_PORT"
fi

# ============================================================
# STEP 1b: DOUBLE-CHECK port is truly free (with retry loop)
# ============================================================
# v2.0 FIX: Verifikasi port kosong SETELAH kill, bukan hanya sekali.
# Loop 5x dengan sleep untuk handle OS port release延迟 (TIME_WAIT, etc.)

echo "$LOG_PREFIX 🔍 Verifying port $APP_PORT is free (5 attempts)..."

PORT_CONFIRMED_FREE=false
for ATTEMPT in 1 2 3 4 5; do
    PORT_IN_USE=false

    # Check via fuser
    if command -v fuser &> /dev/null; then
        if fuser $APP_PORT/tcp &>/dev/null; then
            PORT_IN_USE=true
        fi
    fi

    # Check via lsof (cross-verify)
    if command -v lsof &> /dev/null; then
        if lsof -i:$APP_PORT &>/dev/null; then
            PORT_IN_USE=true
        fi
    fi

    # Check via ss (cross-verify)
    if command -v ss &> /dev/null; then
        if ss -tlnp "sport = :$APP_PORT" 2>/dev/null | grep -q ":$APP_PORT"; then
            PORT_IN_USE=true
        fi
    fi

    if [ "$PORT_IN_USE" = false ]; then
        echo "$LOG_PREFIX ✅ Port $APP_PORT confirmed free (attempt $ATTEMPT/5)"
        PORT_CONFIRMED_FREE=true
        break
    else
        echo "$LOG_PREFIX ⚠️  Port $APP_PORT still in use (attempt $ATTEMPT/5). Retrying kill + wait..."
        # Kill again — process may have respawned (aaPanel process manager)
        fuser -k -9 $APP_PORT/tcp 2>/dev/null || true
        pkill -9 -f "next-server" 2>/dev/null || true
        pkill -9 -f "next start" 2>/dev/null || true
        sleep 2
    fi
done

if [ "$PORT_CONFIRMED_FREE" = false ]; then
    echo "$LOG_PREFIX ⚠️  WARNING: Port $APP_PORT may still be in use after 5 attempts."
    echo "$LOG_PREFIX ℹ️  Continuing anyway — Next.js will report the error if port is occupied."
    echo "$LOG_PREFIX ℹ️  aaPanel will handle retry if this attempt fails."
fi

# Extra safety: final sleep for OS to release port completely
sleep 1

# ============================================================
# STEP 2: Start Next.js
# ============================================================
# PENTING: JANGAN gunakan `exec` di sini!
# aaPanel Node.js Project Manager membutuhkan shell process tetap hidup
# untuk PID tracking. `exec` menggantikan shell process dengan npx,
# menyebabkan aaPanel kehilangan PID → status "Stopped".
# Tanpa `exec`, shell process tetap hidup sebagai parent process.
# ============================================================
cd "$APP_DIR"
echo "$LOG_PREFIX 🚀 Starting Next.js on port $APP_PORT..."
npx next start -p $APP_PORT

# ============================================================
# STEP 3: Post-start verification
# ============================================================
# v2.0: Setelah npx next start selesai (atau crash), log status.
# JANGAN exit dengan error code — biarkan aaPanel handle retry.
# ============================================================
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo "$LOG_PREFIX ⚠️  Next.js exited with code $EXIT_CODE"
    echo "$LOG_PREFIX ℹ️  aaPanel will handle automatic restart"
    # JANGAN exit 1 — biarkan aaPanel retry
    # exit 0 agar aaPanel tidak mark app sebagai "crashed"
fi
