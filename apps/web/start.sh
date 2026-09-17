#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel Node.js Project Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project Manager
# Command: bash /www/wwwroot/qalcuity/apps/web/start.sh
#
# v5.0 (2026-09-17): SIMPLE — aaPanel manages process lifecycle.
#   Previous versions (v3.0-v4.0) had aggressive port detection,
#   kill, and retry logic that CONFLICTED with aaPanel's internal
#   process manager, causing port 3000 ghost listeners.
#
#   aaPanel Node.js Project Manager already handles:
#   - Port management (assigns external port)
#   - Process lifecycle (start/stop/restart)
#   - Process monitoring and auto-restart
#   - PID tracking
#
#   This script should ONLY:
#   - Set environment variables
#   - Start Next.js in the foreground
#   - Let aaPanel manage everything else
#
#   ROOT CAUSE of ghost listener:
#   start.sh v3.0-v4.0 ran `fuser -k -9` and `pkill -9` which
#   killed aaPanel's own internal monitoring/proxy processes on
#   port 3000. When aaPanel "stopped" the app, only the shell
#   was killed but aaPanel's orphaned internal processes kept
#   holding port 3000.
# ============================================================

set -e

# ─── Environment Variables ────────────────────────────────────
export PRISMA_QUERY_ENGINE_TYPE=library
export NODE_ENV=production

APP_DIR="/www/wwwroot/qalcuity/apps/web"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Starting Qalcuity v5.0..."

cd "$APP_DIR"

# ─── Start Next.js ────────────────────────────────────────────
# IMPORTANT: Do NOT use `exec` here.
# aaPanel tracks the shell script's PID for process management.
# Using `exec` replaces the shell with `npx`, causing aaPanel
# to lose PID tracking and show "Stopped" status.
#
# Do NOT add port detection, kill, or retry logic.
# aaPanel handles all of that. Adding port management here
# fights with aaPanel and creates the ghost listener problem.
# ================================================================
npx next start -p 3000
