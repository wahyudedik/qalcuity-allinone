#!/usr/bin/env bash
# =============================================================================
# Prisma Schema Drift Check — Session 70k (CI guard)
#
# Mendeteksi drift antara prisma/migrations/* dan prisma/schema.prisma.
# Cara kerja: replay semua migrasi ke shadow database, lalu bandingkan
# hasilnya dengan schema.prisma via `prisma migrate diff --exit-code`.
#
#   exit 0 = tidak ada drift  → migrations sudah sinkron dengan schema
#   exit lain = drift terdeteksi (atau error tooling)
#
# Konteks: Session 70i menemukan production issue #1 (endpoint password-policy
# 503) akibat model PasswordPolicy ditambahkan ke schema.prisma TANPA file
# migrasi → `prisma migrate deploy` tidak pernah membuat tabelnya. Guard ini
# mencegah drift berulang di CI.
#
# Penggunaan lokal (dari packages/db, via Git Bash / WSL):
#   bash scripts/check-drift.sh
#
# Environment variables:
#   SHADOW_DATABASE_URL  (opsional) — default:
#     postgresql://postgres:postgres@localhost:5432/qalcuity_shadow?schema=public
#     (cocok untuk CI service container postgres:16; lokal DBngin trust auth
#     juga menerima URL ini)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SHADOW_DATABASE_URL="${SHADOW_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/qalcuity_shadow?schema=public}"

# Prisma CLI bisa gagal parse schema.prisma jika env("DATABASE_URL") belum
# terdefinisi — set fallback ke shadow URL (tidak dipakai untuk koneksi
# utama pada perintah ini, hanya agar CLI tidak error).
export DATABASE_URL="${DATABASE_URL:-${SHADOW_DATABASE_URL}}"

# Nama database shadow + URL cleanup (koneksi ke database `postgres` agar
# bisa DROP database shadow yang sedang tidak aktif).
SHADOW_DB_NAME="$(printf '%s' "${SHADOW_DATABASE_URL}" | sed -E 's#^[^?]*//[^/]+/([^?]+).*#\1#')"
CLEANUP_DATABASE_URL="$(printf '%s' "${SHADOW_DATABASE_URL}" | sed -E 's#(/[^/?]+)(\?.*)?$#/postgres\2#')"

cd "${DB_DIR}"

echo "=============================================================================="
echo " Prisma Drift Check: prisma/migrations/*  vs  prisma/schema.prisma"
echo " Shadow DB: ${SHADOW_DATABASE_URL}"
echo " Working dir: ${DB_DIR}"
echo "=============================================================================="

# Cleanup best-effort di akhir (jalan di semua exit path via trap).
cleanup() {
  echo ""
  echo "[cleanup] Best-effort drop shadow database '${SHADOW_DB_NAME}'..."
  npx prisma db execute --url "${CLEANUP_DATABASE_URL}" --stdin <<SQL 2>/dev/null || true
DROP DATABASE IF EXISTS "${SHADOW_DB_NAME}";
SQL
}
trap cleanup EXIT

set +e
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "${SHADOW_DATABASE_URL}" \
  --exit-code
DRIFT_EXIT_CODE=$?
set -e

if [ "${DRIFT_EXIT_CODE}" -eq 0 ]; then
  echo ""
  echo "✅ Tidak ada schema drift — prisma/migrations/ sudah sinkron dengan prisma/schema.prisma."
  exit 0
fi

echo ""
echo "❌ SCHEMA DRIFT TERDETEKSI (prisma migrate diff exit code: ${DRIFT_EXIT_CODE})"
echo "------------------------------------------------------------------------------"
cat <<'FIX'
Cara memperbaiki:

  1. Buat migrasi BARU yang membuat hasil migrasi sama dengan schema.prisma:
       cd packages/db
       npx prisma migrate dev --name <nama_deskriptif>
     (butuh DATABASE_URL lokal yang valid + PostgreSQL berjalan, mis. DBngin)

  2. Commit file migrasi BARU di packages/db/prisma/migrations/ beserta
     perubahan schema.prisma-nya.

  3. ⛔ JANGAN pernah mengedit atau menghapus file migrasi yang sudah ada.
     Migrasi lama sudah diterapkan di production — mengeditnya menyebabkan
     checksum mismatch dan perilaku tak terduga.

  4. ⛔ JANGAN gunakan `prisma db push` untuk perubahan schema production.
     Production selalu memakai `prisma migrate deploy`.

Penyebab umum:

  - Model/field ditambahkan ke packages/db/prisma/schema.prisma tanpa
    menjalankan `prisma migrate dev` (pola yang menyebabkan production
    issue #1 Session 70i: model PasswordPolicy tanpa migrasi → tabel tidak
    pernah dibuat di production → 503).
  - Migrasi lama diedit/dihapus alih-alih menambah migrasi baru.
FIX

exit "${DRIFT_EXIT_CODE}"
