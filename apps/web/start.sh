#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel Node.js Project Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project Manager
# Command: bash /www/wwwroot/qalcuity/apps/web/start.sh
#
# v6.0 (2026-09-19): Kill existing process before start.
#   v5.0 removed all port management, but this caused EADDRINUSE
#   when update.sh sends SIGHUP to restart Next.js -- aaPanel
#   shows "Stopped" while the old process still holds port 3000.
#
#   v6.0 re-introduces targeted port cleanup:
#   - Detects process on port 3000 via lsof
#   - Graceful shutdown: SIGTERM -> 3s wait -> SIGKILL fallback
#   - Only kills the specific PID, not aaPanel internals
#   - Logs all actions for debugging
#
#   aaPanel Node.js Project Manager handles:
#   - Port management (assigns external port)
#   - Process lifecycle (start/stop/restart)
#   - Process monitoring and auto-restart
#   - PID tracking
#
#   This script should:
#   - Set environment variables
#   - Kill stale processes on port 3000
#   - Start Next.js in the foreground
#   - Let aaPanel manage everything else
# ============================================================

set -e

# --- Environment Variables -----------------------------------
export PRISMA_QUERY_ENGINE_TYPE=library
export NODE_ENV=production

APP_DIR="/www/wwwroot/qalcuity/apps/web"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Qalcuity v6.0..."

cd "$APP_DIR"

# --- Kill Existing Process on Port 3000 ----------------------
# When aaPanel shows "Stopped" but the web is still running
# (e.g., after update.sh sends SIGHUP), port 3000 may still
# be occupied. Detect and gracefully kill the old process
# before starting a new one to avoid EADDRINUSE errors.
#
# v6.0: Re-introduces port cleanup with safeguards:
#   - Only kills processes on port 3000 (not aaPanel internals)
#   - Graceful shutdown: SIGTERM -> wait -> SIGKILL fallback
#   - Logs everything for debugging
# ============================================================
EXISTING_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Existing process on port 3000 (PID: $EXISTING_PID)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending SIGTERM for graceful shutdown..."
    kill "$EXISTING_PID" 2>/dev/null || true
    sleep 3

    # Force kill if still running after graceful period
    if kill -0 "$EXISTING_PID" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Process $EXISTING_PID still alive, sending SIGKILL..."
        kill -9 "$EXISTING_PID" 2>/dev/null || true
        sleep 1
    fi

    # Verify port is now free
    FINAL_CHECK=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$FINAL_CHECK" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Port 3000 still in use after kill (PID: $FINAL_CHECK). Proceeding anyway..."
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Port 3000 is now free."
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Port 3000 is free. No existing process to kill."
fi

# --- Start Next.js -------------------------------------------
# IMPORTANT: Do NOT use `exec` here.
# aaPanel tracks the shell script's PID for process management.
# Using `exec` replaces the shell with `npx`, causing aaPanel
# to lose PID tracking and show "Stopped" status.
# ================================================================
npx next start -p 3000
