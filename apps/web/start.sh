#!/bin/bash
# ============================================================
# Qalcuity - Start Script
# Digunakan oleh aaPanel Node.js Project (PM2)
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library
cd /www/wwwroot/qalcuity/apps/web
exec npx next start -p 3000
