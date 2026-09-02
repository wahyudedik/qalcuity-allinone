#!/bin/bash
# ============================================================
# Qalcuity - Start Script (aaPanel PM2 Entry Point)
# ============================================================
# Digunakan oleh aaPanel Node.js Project
# PM2 handles process lifecycle — no manual kill needed
# ============================================================

export PRISMA_QUERY_ENGINE_TYPE=library

cd /www/wwwroot/qalcuity/apps/web
exec npx next start -p 3000
