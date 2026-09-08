#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel Node.js Project Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project Manager
# Command: bash /www/wwwroot/qalcuity/apps/web/start.sh
#
# Fungsi:
#   1. Identifikasi & kill proses lama yang memegang port (anti EADDRINUSE)
#   2. Start Next.js production server
#   3. Fallback ke port alternatif jika port utama masih occupied
#
# v3.0 (2026-09-09): Aggressive kill with ownership logging + fallback port
#   Root cause v2.0: SIGTERM tidak efektif, process tidak mati,
#   pkill pattern matching tidak akurat, 5x retry loop tanpa effect.
#   Fix: Langsung kill -9 + log ownership info + sleep untuk port release
#   + fallback ke port 3001 jika port 3000 masih occupied.
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library

APP_DIR="/www/wwwroot/qalcuity/apps/web"
APP_PORT=3000
FALLBACK_PORT=3001
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
DIAG_LOG="/www/wwwroot/qalcuity/apps/web/start-diag.log"

echo "$LOG_PREFIX 🔄 Starting Qalcuity v3.0..."

# ============================================================
# Helper: Log to both stdout AND diagnostic log file
# ============================================================
log() {
    echo "$1"
    echo "$1" >> "$DIAG_LOG"
}

# ============================================================
# STEP 1: IDENTIFY who owns port 3000 (diagnostic logging)
# ============================================================
# v3.0 FIX: Log ownership info SEBELUM kill untuk debugging.
# Ini membantu identifikasi root cause: siapa yang hold port?

log "$LOG_PREFIX 🔍 [PORT CHECK] Scanning port $APP_PORT ownership..."

PORT_OWNER_INFO=""

# lsof: most detailed — shows PID, user, FD, command
if command -v lsof &> /dev/null; then
    LSOF_OUTPUT=$(lsof -i ":$APP_PORT" -nP 2>/dev/null || true)
    if [ -n "$LSOF_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] lsof output:"
        echo "$LSOF_OUTPUT" | while IFS= read -r line; do
            log "$LOG_PREFIX   $line"
        done
        PORT_OWNER_INFO="$LSOF_OUTPUT"
    fi
fi

# ss: shows socket state and process info
if command -v ss &> /dev/null; then
    SS_OUTPUT=$(ss -tlnp "sport = :$APP_PORT" 2>/dev/null || true)
    if [ -n "$SS_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] ss output:"
        echo "$SS_OUTPUT" | while IFS= read -r line; do
            log "$LOG_PREFIX   $line"
        done
    fi
fi

# fuser: quick PID lookup
if command -v fuser &> /dev/null; then
    FUSER_OUTPUT=$(fuser "$APP_PORT/tcp" 2>/dev/null || true)
    if [ -n "$FUSER_OUTPUT" ]; then
        log "$LOG_PREFIX 📋 [PORT CHECK] fuser output: $FUSER_OUTPUT"
    fi
fi

# ============================================================
# STEP 2: AGGRESSIVE kill — direct SIGKILL (no SIGTERM)
# ============================================================
# v3.0 FIX: Langsung SIGKILL tanpa SIGTERM.
# v2.0 membuktikan SIGTERM tidak efektif — process tidak responsif.
# SIGKILL = immediate, tidak bisa ditolak (kecuali state D/uninterruptible).

log "$LOG_PREFIX 🔨 [KILL] Phase 1: Collecting all PIDs on port $APP_PORT..."

# Collect PIDs from ALL methods
ALL_PIDS=""

# Method 1: lsof (most reliable for port-based identification)
if command -v lsof &> /dev/null; then
    LSOF_PIDS=$(lsof -t -i ":$APP_PORT" 2>/dev/null || true)
    if [ -n "$LSOF_PIDS" ]; then
        log "$LOG_PREFIX   [KILL] lsof found PIDs: $LSOF_PIDS"
        ALL_PIDS="$ALL_PIDS $LSOF_PIDS"
    fi
fi

# Method 2: fuser (kernel-level port binding)
if command -v fuser &> /dev/null; then
    FUSER_PIDS=$(fuser "$APP_PORT/tcp" 2>/dev/null | tr -s ' ' '\n' | grep -oP '^\d+$' || true)
    if [ -n "$FUSER_PIDS" ]; then
        log "$LOG_PREFIX   [KILL] fuser found PIDs: $FUSER_PIDS"
        ALL_PIDS="$ALL_PIDS $FUSER_PIDS"
    fi
fi

# Method 3: Next.js process patterns (catch processes still binding)
NEXT_PIDS=$(pgrep -f "next-server" 2>/dev/null || true)
NEXT_START_PIDS=$(pgrep -f "next start" 2>/dev/null || true)
if [ -n "$NEXT_PIDS" ]; then
    log "$LOG_PREFIX   [KILL] next-server PIDs: $NEXT_PIDS"
    ALL_PIDS="$ALL_PIDS $NEXT_PIDS"
fi
if [ -n "$NEXT_START_PIDS" ]; then
    log "$LOG_PREFIX   [KILL] next start PIDs: $NEXT_START_PIDS"
    ALL_PIDS="$ALL_PIDS $NEXT_START_PIDS"
fi

# Deduplicate PIDs
UNIQUE_PIDS=$(echo "$ALL_PIDS" | tr ' ' '\n' | sort -un | grep -oP '^\d+$' || true)

if [ -n "$UNIQUE_PIDS" ]; then
    PID_COUNT=$(echo "$UNIQUE_PIDS" | wc -l)
    log "$LOG_PREFIX ⚠️  [KILL] Found $PID_COUNT unique process(es) to kill: $UNIQUE_PIDS"

    # Log detailed ownership for each PID
    for PID in $UNIQUE_PIDS; do
        if command -v ps &> /dev/null; then
            PS_INFO=$(ps -p "$PID" -o pid=,user=,comm=,args= 2>/dev/null || true)
            if [ -n "$PS_INFO" ]; then
                log "$LOG_PREFIX   [KILL] PID $PID details: $PS_INFO"
            else
                log "$LOG_PREFIX   [KILL] PID $PID: process may have already exited"
            fi
        fi
    done

    # Phase 1: DIRECT SIGKILL — skip SIGTERM entirely
    # Process sudah terbukti tidak responsif dari v2.0 logs
    log "$LOG_PREFIX 🔨 [KILL] Sending SIGKILL (direct) to all PIDs..."
    for PID in $UNIQUE_PIDS; do
        if kill -0 "$PID" 2>/dev/null; then
            log "$LOG_PREFIX   [KILL] Sending kill -9 to PID $PID"
            kill -9 "$PID" 2>/dev/null && log "$LOG_PREFIX   [KILL] ✅ kill -9 sent to PID $PID" || log "$LOG_PREFIX   [KILL] ⚠️  kill -9 failed for PID $PID (permission denied or already dead)"
        else
            log "$LOG_PREFIX   [KILL] PID $PID already dead (kill -0 failed)"
        fi
    done

    # Phase 2: Nuclear option — fuser -k -9 (kernel-level force kill)
    log "$LOG_PREFIX 🔨 [KILL] Phase 2: fuser -k -9 (kernel-level force kill)..."
    if command -v fuser &> /dev/null; then
        fuser -k -9 "$APP_PORT/tcp" 2>/dev/null && log "$LOG_PREFIX   [KILL] ✅ fuser -k -9 sent" || log "$LOG_PREFIX   [KILL] ⚠️  fuser -k -9 no processes found"
    fi

    # Phase 3: Extra nuclear — pkill all node processes on this port
    log "$LOG_PREFIX 🔨 [KILL] Phase 3: pkill pattern match cleanup..."
    pkill -9 -f "next-server" 2>/dev/null || true
    pkill -9 -f "next start" 2>/dev/null || true
    pkill -9 -f "node.*start\.sh" 2>/dev/null || true
    log "$LOG_PREFIX   [KILL] pkill pattern cleanup done"

    # Phase 4: Sleep for OS to release port (TIME_WAIT, socket cleanup)
    log "$LOG_PREFIX ⏳ [WAIT] Sleeping 3 seconds for port release..."
    sleep 3
else
    log "$LOG_PREFIX ℹ️  [KILL] No processes found on port $APP_PORT — port should be free"
fi

# ============================================================
# STEP 3: VERIFY port is free (with detailed diagnostics)
# ============================================================
# v3.0 FIX: Verifikasi pakai ss (bukan hanya cek PID existence).
# ss menunjukkan actual socket state — lebih reliable dari lsof/fuser.

log "$LOG_PREFIX 🔍 [VERIFY] Checking if port $APP_PORT is free..."

PORT_FREE=false

check_port_free() {
    local port=$1
    local is_free=true

    # Check via ss (most reliable for actual socket state)
    if command -v ss &> /dev/null; then
        if ss -tlnp "sport = :$port" 2>/dev/null | grep -q ":$port"; then
            is_free=false
        fi
    fi

    # Cross-verify via fuser
    if [ "$is_free" = true ] && command -v fuser &> /dev/null; then
        if fuser "$port/tcp" &>/dev/null; then
            is_free=false
        fi
    fi

    # Cross-verify via lsof
    if [ "$is_free" = true ] && command -v lsof &> /dev/null; then
        if lsof -i ":$port" &>/dev/null; then
            is_free=false
        fi
    fi

    echo "$is_free"
}

# Check port 3000
RESULT=$(check_port_free "$APP_PORT")
if [ "$RESULT" = "true" ]; then
    log "$LOG_PREFIX ✅ [VERIFY] Port $APP_PORT is FREE"
    PORT_FREE=true
    USE_PORT=$APP_PORT
else
    log "$LOG_PREFIX ❌ [VERIFY] Port $APP_PORT is STILL OCCUPIED after kill -9 + sleep 3"

    # Log detailed diagnostic: who still holds the port?
    log "$LOG_PREFIX 📋 [DIAG] Port $APP_PORT still occupied — collecting diagnostic info..."
    if command -v lsof &> /dev/null; then
        lsof -i ":$APP_PORT" -nP 2>/dev/null | while IFS= read -r line; do
            log "$LOG_PREFIX   [DIAG] $line"
        done
    fi
    if command -v ss &> /dev/null; then
        ss -tlnp "sport = :$APP_PORT" 2>/dev/null | while IFS= read -r line; do
            log "$LOG_PREFIX   [DIAG] $line"
        done
    fi

    # Try one more aggressive kill round
    log "$LOG_PREFIX 🔨 [KILL] Attempting final aggressive kill round..."
    fuser -k -9 "$APP_PORT/tcp" 2>/dev/null || true
    sleep 2

    RESULT2=$(check_port_free "$APP_PORT")
    if [ "$RESULT2" = "true" ]; then
        log "$LOG_PREFIX ✅ [VERIFY] Port $APP_PORT is now FREE (after final kill)"
        PORT_FREE=true
        USE_PORT=$APP_PORT
    else
        log "$LOG_PREFIX ❌ [VERIFY] Port $APP_PORT STILL occupied — trying fallback port $FALLBACK_PORT"
        USE_PORT=""
    fi
fi

# ============================================================
# STEP 3b: Fallback to port 3001 if port 3000 is occupied
# ============================================================
# v3.0 NEW: Jika port 3000 masih occupied setelah semua kill attempts,
# coba gunakan port 3001 sebagai fallback.
# Ini memungkinkan aplikasi tetap berjalan meskipun ada process zombie.

if [ -z "$USE_PORT" ] || [ "$PORT_FREE" = false ]; then
    log "$LOG_PREFIX 🔄 [FALLBACK] Checking fallback port $FALLBACK_PORT..."

    RESULT_FB=$(check_port_free "$FALLBACK_PORT")
    if [ "$RESULT_FB" = "true" ]; then
        log "$LOG_PREFIX ✅ [FALLBACK] Port $FALLBACK_PORT is FREE — using as fallback"
        USE_PORT=$FALLBACK_PORT
    else
        log "$LOG_PREFIX ❌ [FALLBACK] Port $FALLBACK_PORT also occupied"
        log "$LOG_PREFIX 📋 [DIAG] Both ports $APP_PORT and $FALLBACK_PORT are occupied."
        log "$LOG_PREFIX 📋 [DIAG] Manual investigation required. Check:"
        log "$LOG_PREFIX 📋 [DIAG]   lsof -i :$APP_PORT -nP"
        log "$LOG_PREFIX 📋 [DIAG]   lsof -i :$FALLBACK_PORT -nP"
        log "$LOG_PREFIX 📋 [DIAG]   ss -tlnp | grep -E ':300[01]'"
        log "$LOG_PREFIX 📋 [DIAG]   ps aux | grep next"

        # Last resort: try port 3000 anyway (maybe it was a timing issue)
        log "$LOG_PREFIX ⚠️  [FALLBACK] Last resort: trying port $APP_PORT anyway..."
        USE_PORT=$APP_PORT
    fi
fi

log "$LOG_PREFIX 📌 [CONFIG] Using port: $USE_PORT"

# ============================================================
# STEP 4: Start Next.js
# ============================================================
# PENTING: JANGAN gunakan `exec` di sini!
# aaPanel Node.js Project Manager membutuhkan shell process tetap hidup
# untuk PID tracking. `exec` menggantikan shell process dengan npx,
# menyebabkan aaPanel kehilangan PID → status "Stopped".
# Tanpa `exec`, shell process tetap hidup sebagai parent process.
# ============================================================
cd "$APP_DIR"
log "$LOG_PREFIX 🚀 Starting Next.js on port $USE_PORT..."
npx next start -p "$USE_PORT"

# ============================================================
# STEP 5: Post-start verification
# ============================================================
# v3.0: Setelah npx next start selesai (atau crash), log status.
# JANGAN exit dengan error code — biarkan aaPanel handle retry.
# ============================================================
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    log "$LOG_PREFIX ⚠️  Next.js exited with code $EXIT_CODE on port $USE_PORT"
    log "$LOG_PREFIX ℹ️  aaPanel will handle automatic restart"
    # JANGAN exit 1 — biarkan aaPanel retry
    # exit 0 agar aaPanel tidak mark app sebagai "crashed"
fi

log "$LOG_PREFIX 🏁 Start script completed (exit code: $EXIT_CODE, port: $USE_PORT)"
