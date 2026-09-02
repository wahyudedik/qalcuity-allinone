#!/bin/bash
# ============================================================
# Qalcuity - Start Script
# Digunakan oleh aaPanel Node.js Project (PM2)
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library

# Kill existing process on port 3000 (prevent EADDRINUSE)
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
sleep 2

cd /www/wwwroot/qalcuity/apps/web
exec npx next start -p 3000
