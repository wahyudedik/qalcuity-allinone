#!/usr/bin/env bash
# =============================================================================
# reset-db.sh — Helper untuk reset/cleanup database production (VPS aaPanel)
# =============================================================================
# Menangani otomatis:
#   - Source apps/web/.env (toleran CRLF Windows)
#   - Cari binari psql/pg_dump milik aaPanel via find (path bervariasi per instalasi)
#   - Set PGBIN lalu jalankan psql/pg_dump dengan benar
#
# Usage (KETIK, jangan paste blok markdown):
#   bash scripts/reset-db.sh check          # Tes koneksi + jumlah Tenant
#   bash scripts/reset-db.sh backup         # pg_dump gzip ke /root/
#   bash scripts/reset-db.sh preview        # Dry-run keep-accounts (read-only, WAJIB dulu)
#   bash scripts/reset-db.sh keep           # Eksekusi keep-accounts
#   bash scripts/reset-db.sh full           # Eksekusi reset full (+ confirm_full otomatis)
#   bash scripts/reset-db.sh cleanup        # Preview hapus 1 tenant demo
#   bash scripts/reset-db.sh cleanup-run    # Eksekusi hapus 1 tenant demo
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

MODE="${1:-preview}"

usage() {
  echo "Usage: bash scripts/reset-db.sh [check|backup|preview|keep|full|cleanup|cleanup-run]"
  echo ""
  echo "  check          Tes koneksi psql + tampilkan jumlah Tenant"
  echo "  backup         pg_dump gzip ke /root/backup_qalcuity_<timestamp>.sql.gz"
  echo "  preview        Dry-run keep-accounts (read-only) — WAJIB jalankan dulu"
  echo "  keep           Eksekusi reset keep-accounts"
  echo "  full           Eksekusi reset full (hapus juga Tenant/User; butuh core seed sesudahnya)"
  echo "  cleanup        Preview hapus 1 tenant demo/test"
  echo "  cleanup-run    Eksekusi hapus 1 tenant demo/test"
}

# --- 1. Load DATABASE_URL dari apps/web/.env (toleran CRLF) -------------------
ENV_FILE="apps/web/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE tidak ditemukan (pastikan di /www/wwwroot/qalcuity)"
  exit 1
fi

TMPENV="$(mktemp)"
trap 'rm -f "$TMPENV"' EXIT
tr -d '\r' < "$ENV_FILE" > "$TMPENV"
set -a
# shellcheck disable=SC1090
source "$TMPENV"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL kosong setelah source $ENV_FILE"
  exit 1
fi
echo "[ok] DATABASE_URL loaded (panjang=${#DATABASE_URL} karakter)"

# Prisma menambahkan ?schema=public di URL — libpq (psql/pg_dump) MENOLAK
# parameter query tak dikenal: "invalid URI query parameter: schema".
# Buang query string sebelum dipakai konek langsung ke PostgreSQL.
PG_URL="${DATABASE_URL%%\?*}"
if [ "$PG_URL" != "$DATABASE_URL" ]; then
  echo "[ok] Query string dibuang (format Prisma) → ${PG_URL:0:40}..."
fi

# --- 2. Cari binari psql/pg_dump milik aaPanel --------------------------------
PGBIN=""
for d in /www/server/postgresql/*/bin /www/server/postgresql/bin /www/server/pgsql/bin; do
  if [ -x "$d/psql" ]; then
    PGBIN="$d"
    break
  fi
done

if [ -z "$PGBIN" ]; then
  PGBIN="$(find /www/server -type f -name psql 2>/dev/null | head -1 | xargs -r dirname || true)"
fi

if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "ERROR: binari psql aaPanel tidak ditemukan di /www/server"
  echo "Jalankan manual untuk diagnosa:"
  echo "  ls /www/server/"
  echo "  find / -name psql -type f 2>/dev/null"
  exit 1
fi
echo "[ok] PGBIN=$PGBIN"
"$PGBIN/psql" --version

# --- 3. Jalankan sesuai mode --------------------------------------------------
SCRIPT_DIR="$REPO_DIR/scripts"

case "$MODE" in
  check)
    "$PGBIN/psql" "$PG_URL" -c "SELECT count(*) AS tenant_count FROM \"Tenant\";"
    "$PGBIN/psql" "$PG_URL" -c "SELECT count(*) AS superadmin_count FROM \"User\" WHERE role='SUPERADMIN';"
    ;;

  backup)
    OUT="/root/backup_qalcuity_$(date +%F_%H%M).sql.gz"
    echo "Backup → $OUT"
    # Tulis ke .tmp dulu — file final hanya dibuat jika pg_dump sukses
    # (mencegah file backup kosong/rusak saat pg_dump gagal di tengah jalan)
    if "$PGBIN/pg_dump" "$PG_URL" | gzip > "$OUT.tmp"; then
      mv "$OUT.tmp" "$OUT"
      ls -lh "$OUT"
    else
      rm -f "$OUT.tmp"
      echo "ERROR: pg_dump gagal — backup TIDAK dibuat."
      exit 1
    fi
    ;;

  preview)
    "$PGBIN/psql" "$PG_URL" -v execute=false -f "$SCRIPT_DIR/reset-production-data.sql"
    echo ""
    echo ">>> Itu baru DRY-RUN (tidak ada data dihapus). Periksa tabel [KEEP]/[WIPE] di atas."
    echo ">>> Lanjut eksekusi: bash scripts/reset-db.sh keep"
    ;;

  keep)
    "$PGBIN/psql" "$PG_URL" -v execute=true -f "$SCRIPT_DIR/reset-production-data.sql"
    echo ""
    echo ">>> Selesai. Verifikasi C1/C2 di atas (superadmin_left >= 1; transaksional 0 rows)."
    ;;

  full)
    "$PGBIN/psql" "$PG_URL" -v execute=true -v reset_mode=full -v confirm_full=HAPUS-SEMUA -f "$SCRIPT_DIR/reset-production-data.sql"
    echo ""
    echo ">>> Mode FULL selesai. SEGERA jalankan core seed:"
    echo ">>>   cd packages/db && SEED_DEMO=false npx prisma db seed"
    ;;

  cleanup)
    "$PGBIN/psql" "$PG_URL" -v execute=false -f "$SCRIPT_DIR/cleanup-demo-tenant.sql"
    echo ""
    echo ">>> Itu baru PREVIEW. Eksekusi: bash scripts/reset-db.sh cleanup-run"
    ;;

  cleanup-run)
    "$PGBIN/psql" "$PG_URL" -v execute=true -f "$SCRIPT_DIR/cleanup-demo-tenant.sql"
    ;;

  *)
    echo "Mode tidak dikenal: '$MODE'"
    echo ""
    usage
    exit 1
    ;;
esac
