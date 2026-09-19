#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel Node.js Project Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project Manager
# Command: bash /www/wwwroot/qalcuity/apps/web/start.sh
#
# v7.0 (2026-09-19): Multi-method port detection & kill.
#   v6.0 used lsof for port detection, but lsof failed to detect
#   processes on port 3000 on some aaPanel VPS configurations,
#   causing persistent EADDRINUSE errors even after "Port is free".
#
#   v7.0 fixes this with multi-method approach:
#   - fuser -k (most reliable for killing processes on a port)
#   - ss -tlnp (most reliable for detection on modern Linux)
#   - netstat -tlnp (fallback)
#   - lsof (last resort)
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

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Qalcuity v7.0..."

cd "$APP_DIR"

# --- Kill Existing Process on Port 3000 ----------------------
# Multi-method approach for maximum compatibility across
# different Linux distributions and aaPanel configurations.
#
# Priority order:
#   1. fuser -k (most reliable for killing by port)
#   2. ss -tlnp + kill (most reliable detection on modern Linux)
#   3. netstat -tlnp + kill (widely available fallback)
#   4. lsof + kill (last resort)
# ============================================================

KILLED=false
DETECT_METHOD="none"

# Method 1: fuser (paling reliable di production Linux)
if [ "$KILLED" = false ] && command -v fuser &>/dev/null; then
    DETECT_METHOD="fuser"
    # fuser -k: send SIGKILL to all processes using the port
    # We do SIGTERM first via kill, then fuser -k as SIGKILL fallback
    FUSER_PIDS=$(fuser 3000/tcp 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)
    if [ -n "$FUSER_PIDS" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Processes on port 3000 detected via fuser (PIDs: $FUSER_PIDS)"
        
        # Graceful shutdown first (SIGTERM)
        for PID in $FUSER_PIDS; do
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending SIGTERM to PID $PID..."
            kill "$PID" 2>/dev/null || true
        done
        sleep 3
        
        # Force kill if still alive (SIGKILL via fuser -k)
        REMAINING=$(fuser 3000/tcp 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)
        if [ -n "$REMAINING" ]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Processes still alive, sending SIGKILL via fuser -k..."
            fuser -k 3000/tcp 2>/dev/null || true
            sleep 1
        fi
        KILLED=true
    fi
fi

# Method 2: ss + kill (paling reliable di Linux modern)
if [ "$KILLED" = false ] && command -v ss &>/dev/null; then
    DETECT_METHOD="ss"
    SS_PID=$(ss -tlnp "sport = :3000" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)
    if [ -n "$SS_PID" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Process on port 3000 detected via ss (PID: $SS_PID)"
        
        # Graceful shutdown first (SIGTERM)
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending SIGTERM to PID $SS_PID..."
        kill "$SS_PID" 2>/dev/null || true
        sleep 3
        
        # Force kill if still alive
        if kill -0 "$SS_PID" 2>/dev/null; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: PID $SS_PID still alive, sending SIGKILL..."
            kill -9 "$SS_PID" 2>/dev/null || true
            sleep 1
        fi
        KILLED=true
    fi
fi

# Method 3: netstat + kill (widely available fallback)
if [ "$KILLED" = false ] && command -v netstat &>/dev/null; then
    DETECT_METHOD="netstat"
    NETSTAT_PID=$(netstat -tlnp 2>/dev/null | grep ':3000' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
    if [ -n "$NETSTAT_PID" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Process on port 3000 detected via netstat (PID: $NETSTAT_PID)"
        
        # Graceful shutdown first (SIGTERM)
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending SIGTERM to PID $NETSTAT_PID..."
        kill "$NETSTAT_PID" 2>/dev/null || true
        sleep 3
        
        # Force kill if still alive
        if kill -0 "$NETSTAT_PID" 2>/dev/null; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: PID $NETSTAT_PID still alive, sending SIGKILL..."
            kill -9 "$NETSTAT_PID" 2>/dev/null || true
            sleep 1
        fi
        KILLED=true
    fi
fi

# Method 4: lsof (last resort — may not work on all aaPanel configs)
if [ "$KILLED" = false ] && command -v lsof &>/dev/null; then
    DETECT_METHOD="lsof"
    LSOF_PID=$(lsof -ti:3000 2>/dev/null | head -1 || true)
    if [ -n "$LSOF_PID" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Process on port 3000 detected via lsof (PID: $LSOF_PID)"
        
        # Graceful shutdown first (SIGTERM)
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending SIGTERM to PID $LSOF_PID..."
        kill "$LSOF_PID" 2>/dev/null || true
        sleep 3
        
        # Force kill if still alive
        if kill -0 "$LSOF_PID" 2>/dev/null; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: PID $LSOF_PID still alive, sending SIGKILL..."
            kill -9 "$LSOF_PID" 2>/dev/null || true
            sleep 1
        fi
        KILLED=true
    fi
fi

# Final status report
if [ "$KILLED" = true ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Existing process on port 3000 killed (method: $DETECT_METHOD)"
    
    # Verify port is now free using the best available method
    PORT_FREE=true
    if command -v ss &>/dev/null; then
        if ss -tlnp "sport = :3000" 2>/dev/null | grep -q ':3000'; then
            PORT_FREE=false
        fi
    elif command -v netstat &>/dev/null; then
        if netstat -tlnp 2>/dev/null | grep -q ':3000'; then
            PORT_FREE=false
        fi
    elif command -v fuser &>/dev/null; then
        if fuser 3000/tcp 2>/dev/null | grep -qE '[0-9]+'; then
            PORT_FREE=false
        fi
    fi
    
    if [ "$PORT_FREE" = false ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Port 3000 still in use after kill. Proceeding anyway..."
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Port 3000 is now free."
    fi
else
    # No process found — but also try to verify port is truly free
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: No existing process found on port 3000 (checked: $DETECT_METHOD)"
fi

# --- Start Next.js -------------------------------------------
# IMPORTANT: Do NOT use `exec` here.
# aaPanel tracks the shell script's PID for process management.
# Using `exec` replaces the shell with `npx`, causing aaPanel
# to lose PID tracking and show "Stopped" status.
# ================================================================
npx next start -p 3000
