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
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library

APP_DIR="/www/wwwroot/qalcuity/apps/web"
APP_PORT=3000
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

echo "$LOG_PREFIX 🔄 Starting Qalcuity..."

# ============================================================
# STEP 1: Kill existing process on port 3000
# ============================================================
# Menggunakan 3 fallback methods untuk kompatibilitas maksimal:
#   Method 1: fuser (paling reliable di Linux)
#   Method 2: lsof (fallback jika fuser tidak ada)
#   Method 3: ss + kill (fallback terakhir)

KILLED=false

# Method 1: fuser
if command -v fuser &> /dev/null; then
    PID=$(fuser $APP_PORT/tcp 2>/dev/null | tr -d ' ')
    if [ -n "$PID" ]; then
        echo "$LOG_PREFIX ⚠️  Found process on port $APP_PORT (PID: $PID). Killing..."
        fuser -k $APP_PORT/tcp 2>/dev/null || true
        sleep 2

        # Force kill jika masih hidup
        if fuser $APP_PORT/tcp &>/dev/null; then
            echo "$LOG_PREFIX 🔨 Process still alive. Force killing (SIGKILL)..."
            fuser -k -9 $APP_PORT/tcp 2>/dev/null || true
            sleep 2
        fi
        KILLED=true
    fi

# Method 2: lsof (fallback)
elif command -v lsof &> /dev/null; then
    PID=$(lsof -t -i:$APP_PORT 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
        echo "$LOG_PREFIX ⚠️  Found process on port $APP_PORT (PID: $PID). Killing..."
        kill $PID 2>/dev/null || true
        sleep 2

        # Force kill jika masih hidup
        if kill -0 $PID 2>/dev/null; then
            echo "$LOG_PREFIX 🔨 Process still alive. Force killing (SIGKILL)..."
            kill -9 $PID 2>/dev/null || true
            sleep 2
        fi
        KILLED=true
    fi

# Method 3: ss + kill (fallback terakhir)
elif command -v ss &> /dev/null; then
    PID=$(ss -tlnp "sport = :$APP_PORT" 2>/dev/null | grep -oP 'pid=\K\d+' | head -1)
    if [ -n "$PID" ]; then
        echo "$LOG_PREFIX ⚠️  Found process on port $APP_PORT (PID: $PID). Killing..."
        kill -9 $PID 2>/dev/null || true
        sleep 2
        KILLED=true
    fi
else
    echo "$LOG_PREFIX ⚠️  Neither fuser, lsof, nor ss available. Skipping port cleanup."
fi

# Verifikasi port bebas
if command -v fuser &> /dev/null; then
    if fuser $APP_PORT/tcp &>/dev/null; then
        echo "$LOG_PREFIX ❌ WARNING: Port $APP_PORT still in use after kill attempts!"
        echo "$LOG_PREFIX ℹ️  Continuing anyway — Next.js will report the error if port is occupied."
    else
        echo "$LOG_PREFIX ✅ Port $APP_PORT is free"
    fi
fi

if [ "$KILLED" = true ]; then
    echo "$LOG_PREFIX ✅ Old process cleaned up successfully"
fi

# ============================================================
# STEP 2: Start Next.js
# ============================================================
cd "$APP_DIR"
echo "$LOG_PREFIX 🚀 Starting Next.js on port $APP_PORT..."
exec npx next start -p $APP_PORT
