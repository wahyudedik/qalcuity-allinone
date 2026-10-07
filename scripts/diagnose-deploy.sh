#!/usr/bin/env bash
# ============================================================================
# diagnose-deploy.sh — Qalcuity Production Diagnostics (READ-ONLY)
# ----------------------------------------------------------------------------
# Tujuan: mengumpulkan bukti atas 2 masalah production:
#   1) Asset 400 server-side (CSS e19f5c... + chunk 7269-... di qalcuity.com)
#   2) Anomali harga di landing ("Rp 799K/bulan", format "Rp 299K")
#
# READ-ONLY TOTAL — script ini TIDAK mengubah state apa pun.
#   Dilarang (dan tidak dilakukan): rm, mv, cp, chown, systemctl, pm2 restart,
#   git pull/checkout/stash pop, prisma migrate/db push/seed.
#   Hanya: ls/cat/stat/find/ps/ss/grep/git log|status|stash list/curl GET/df/
#          command -v/node SELECT-only/psql SELECT-only.
#
# Kompatibel: bash 4 / Ubuntu (aaPanel VPS), Node v24, pnpm 9, PostgreSQL aaPanel.
# Usage: bash scripts/diagnose-deploy.sh [PROJECT_DIR]
#   $1 = path proyek (default: /www/wwwroot/qalcuity)
#   Output: stdout — redirect ke file, mis. > /tmp/diag.txt 2>&1
# ============================================================================
set +e   # SATU kegagalan command TIDAK boleh menghentikan seluruh diagnosis

PROJECT_DIR="${1:-/www/wwwroot/qalcuity}"
NEXT_DIR="$PROJECT_DIR/apps/web/.next"
LOCAL_BASE="http://localhost:3000"
PUBLIC_BASE="https://qalcuity.com"

# Asset spesifik yang terindikasi 400 (dari audit Puppeteer, build 33d55f8)
SUSPECT_CSS="/_next/static/css/e19f5c27783b606f.css"
SUSPECT_CHUNK="/_next/static/chunks/7269-addf2ac2ec1433a4.js"

HTML_FILE="/tmp/qalcuity-diag-home.html"   # cache HTML landing (di /tmp, bukan state project)

hdr() { echo; echo "===== [$1] $2 ====="; echo; }

echo "PROJECT_DIR = $PROJECT_DIR"
echo "NEXT_DIR    = $NEXT_DIR"
echo "STARTED_AT  = $(date -u '+%Y-%m-%dT%H:%M:%SZ')  (host: $(hostname 2>/dev/null))"

# ============================================================================
# SECTION 1 — Git state VPS
#   Apakah working tree sudah di commit terbaru? Ada stash/build campuran?
# ============================================================================
hdr 1 "Git state VPS"
cd "$PROJECT_DIR" 2>/dev/null || echo "WARN: tidak bisa cd ke $PROJECT_DIR"
git log --oneline -3 2>&1 | head -5
echo "--- git status -sb (head 5) ---"
git status -sb 2>&1 | head -5
echo "--- git stash list ---"
git stash list 2>&1

# ============================================================================
# SECTION 2 — Artifact .next di disk
#   Apakah BUILD_ID + file CSS/chunk yang direferensikan HTML benar-benar ada?
#   Deteksi juga multiple .next (salinan lama) yang bisa membuat server
#   menyajikan BUILD_ID/artifact campuran.
# ============================================================================
hdr 2 "Artifact .next"
if [ -d "$NEXT_DIR" ]; then
  echo "NEXT_DIR: ADA"
else
  echo "NEXT_DIR: MISSING — build artifact tidak ada di $NEXT_DIR"
fi
echo "--- BUILD_ID (isi file) ---"
cat "$NEXT_DIR/BUILD_ID" 2>&1
echo
echo "--- static/css/ (head 30) ---"
ls -la "$NEXT_DIR/static/css/" 2>&1 | head -30
echo "--- cari file hash e19f5c di static/css ---"
ls -la "$NEXT_DIR/static/css/" 2>/dev/null | grep e19f5c || echo ">>> TIDAK ADA file ber-hash e19f5c di static/css"
echo "--- cari chunk 7269 di static/chunks ---"
ls -la "$NEXT_DIR/static/chunks/" 2>/dev/null | grep 7269 || echo ">>> TIDAK ADA chunk 7269 di static/chunks"
CHUNK_FILE=$(ls "$NEXT_DIR/static/chunks/" 2>/dev/null | grep 7269 | head -1)
if [ -n "$CHUNK_FILE" ]; then
  echo "--- stat chunk 7269: $CHUNK_FILE ---"
  stat "$NEXT_DIR/static/chunks/$CHUNK_FILE" 2>&1
else
  echo "chunk 7269: MISSING (tidak ada yang bisa di-stat)"
fi
CSS_FILE=$(ls "$NEXT_DIR/static/css/" 2>/dev/null | grep e19f5c | head -1)
if [ -n "$CSS_FILE" ]; then
  echo "--- stat css e19f5c: $CSS_FILE ---"
  stat "$NEXT_DIR/static/css/$CSS_FILE" 2>&1
else
  echo "css e19f5c: MISSING (tidak ada yang bisa di-stat)"
fi
echo "--- jumlah file static/chunks ---"
ls "$NEXT_DIR/static/chunks/" 2>/dev/null | wc -l
echo "--- jumlah file static/css ---"
ls "$NEXT_DIR/static/css/" 2>/dev/null | wc -l
echo "--- cari SEMUA direktori .next (maxdepth 4) ---"
echo "(deteksi salinan/.next lama → server bisa sajikan artifact campuran)"
find "$PROJECT_DIR" -maxdepth 4 -name '.next' -type d 2>/dev/null || echo "(find gagal / tidak ada hasil)"

# ============================================================================
# SECTION 3 — Proses Node.js
#   Proses mana yang benar-benar listen? cwd-nya di $PROJECT_DIR atau folder
#   lain (mis. build lama)? Siapa yang listen port 3000?
# ============================================================================
hdr 3 "Proses Node.js"
echo "--- ps aux | grep next|node ---"
ps aux 2>/dev/null | grep -E 'next|node' | grep -v grep || echo "(tidak ada proses node/next terdeteksi)"
echo "--- detail per PID (cwd + cmdline) ---"
for pid in $(ps -eo pid=,args= 2>/dev/null | grep -E '[n]ext|[n]ode' | awk '{print $1}'); do
  echo "--- PID $pid ---"
  # cwd proses: apakah di $PROJECT_DIR atau folder lain?
  echo "cwd : $(readlink /proc/$pid/cwd 2>&1)"
  # cmdline bukan symlink → baca langsung, NUL dipisah spasi
  echo "cmd : $(tr '\0' ' ' < /proc/$pid/cmdline 2>&1)"
done
echo "--- siapa yang listen port 3000 (ss, fallback netstat) ---"
ss -tlnp 2>/dev/null | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000 || echo "(port 3000 tidak terdeteksi via ss/netstat — ss/netstat mungkin tidak terinstall atau butuh privilege)"

# ============================================================================
# SECTION 4 — Referensi asset di HTML yang disajikan SEKARANG
#   Hash apa yang direferensikan HTML server saat ini? Bandingkan dengan
#   BUILD_ID + isi folder di Section 2.
#   Interpretasi:
#     - HTML merujuk hash yang ADA di disk    → artifact konsisten
#     - HTML merujuk hash yang TIDAK ada disk → build/serving campuran
# ============================================================================
hdr 4 "Referensi asset di HTML aktual (localhost:3000)"
curl -s --max-time 15 -o "$HTML_FILE" "$LOCAL_BASE/" || echo "WARN: curl ke $LOCAL_BASE/ gagal"
if [ -s "$HTML_FILE" ]; then
  echo "HTML landing tersimpan: $HTML_FILE ($(wc -c < "$HTML_FILE" 2>/dev/null) bytes)"
  echo "--- asset references (chunks|css|media) ---"
  grep -oE '/_next/static/(chunks|css|media)/[^"'\'' ]+' "$HTML_FILE" 2>/dev/null | sort -u | head -30
  echo "--- BUILD_ID path di HTML (/_next/static/<id>/) ---"
  grep -oE '/_next/static/[a-zA-Z0-9_-]+/' "$HTML_FILE" 2>/dev/null | sort -u | head -5
else
  echo ">>> GAGAL mengambil HTML dari $LOCAL_BASE/ — section 4-6 sebagian tidak tersedia"
fi

# ============================================================================
# SECTION 5 — Perbandingan localhost vs public (status + content-type)
#   Untuk 3 asset: (a) CSS e19f5c..., (b) chunk 7269-..., (c) kontrol (200).
#   Hash AKTUAL diambil dari HTML Section 4 bila berbeda dari suspect default.
#
#   INTERPRETASI:
#     - localhost 200 tapi public 400        → masalah di layer nginx/aaPanel
#       (mis. WAF/modsecurity/limit/location blok /_next/static tertentu)
#     - keduanya 400                          → masalah Next.js/artifact
#       (route handler mengembalikan HTML 400 — mis. BUILD_ID/path campuran)
#     - keduanya 200                          → asset sehat; anomali 400
#       mungkin sudah teratasi / intermittent / tergantung header
#     - localhost 404 tapi public 200/400    → proses listen tidak membaca
#       artifact di $NEXT_DIR (cwd proses ≠ $PROJECT_DIR — cek Section 3)
# ============================================================================
hdr 5 "Perbandingan localhost vs public (status + content-type)"

ACTUAL_CSS=$(grep -oE '/_next/static/css/[a-zA-Z0-9_-]+\.css' "$HTML_FILE" 2>/dev/null | head -1)
[ -z "$ACTUAL_CSS" ] && ACTUAL_CSS="$SUSPECT_CSS"
ACTUAL_CHUNK=$(grep -oE '/_next/static/chunks/[0-9]+-[a-zA-Z0-9_-]+\.js' "$HTML_FILE" 2>/dev/null | head -1)
[ -z "$ACTUAL_CHUNK" ] && ACTUAL_CHUNK="$SUSPECT_CHUNK"
CONTROL_ASSET=$(grep -oE '/_next/static/(chunks|css)/[^"'\'' ]+' "$HTML_FILE" 2>/dev/null | sort -u | grep -v -E 'e19f5c|7269-' | head -1)
[ -z "$CONTROL_ASSET" ] && CONTROL_ASSET="/_next/static/chunks/main-app.js"  # fallback generik

echo "CSS suspect (a)     : $ACTUAL_CSS"
echo "Chunk suspect (b)   : $ACTUAL_CHUNK"
echo "Asset kontrol (c)   : $CONTROL_ASSET"
echo

check_asset() {
  local label="$1" asset="$2"
  echo "--- $label : $asset ---"
  curl -s -o /dev/null -w 'local : %{http_code} %{content_type} %{size_download}\n' --max-time 15 "$LOCAL_BASE$asset" 2>/dev/null || echo "local : CURL_ERROR"
  curl -s -o /dev/null -w 'public: %{http_code} %{content_type} %{size_download}\n' --max-time 15 "$PUBLIC_BASE$asset" 2>/dev/null || echo "public: CURL_ERROR"
  echo "body preview (local, 300 byte pertama):"
  curl -s --max-time 15 "$LOCAL_BASE$asset" 2>/dev/null | head -c 300 || true
  echo
  echo "body preview (public, 300 byte pertama):"
  curl -s --max-time 15 "$PUBLIC_BASE$asset" 2>/dev/null | head -c 300 || true
  echo
  echo
}

check_asset "(a) CSS e19f5c"    "$ACTUAL_CSS"
check_asset "(b) chunk 7269"    "$ACTUAL_CHUNK"
check_asset "(c) kontrol"       "$CONTROL_ASSET"

# Status untuk ringkasan Section 9
LOCAL_ASSET_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$LOCAL_BASE$ACTUAL_CSS" 2>/dev/null || echo ERR)
PUBLIC_ASSET_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$PUBLIC_BASE$ACTUAL_CSS" 2>/dev/null || echo ERR)

# ============================================================================
# SECTION 6 — Teks pricing SSR
#   Harga yang BENAR-BENAR di-render server (bukan yang diasumsikan).
#   Anomali dilaporkan: "Rp 799K/bulan" + format "Rp 299K" (bukan "Rp 299.000").
# ============================================================================
hdr 6 "Teks pricing SSR (harga yang di-render server)"
if [ -s "$HTML_FILE" ]; then
  echo "--- pola harga (Rp ... / .../bulan) ---"
  grep -oE '(Rp ?[0-9][0-9.,]*[KkMm]?)|([0-9][0-9.,]*[KkMm]?/bulan)' "$HTML_FILE" 2>/dev/null | sort | uniq -c | head -20
  echo "--- konteks nama plan (Growth/Starter/Business/Enterprise/Free) ---"
  grep -oE '(Growth|Starter|Business|Enterprise|Free)[^<]{0,60}' "$HTML_FILE" 2>/dev/null | head -20
  echo
  echo "CATATAN: kode lokal (Session 70) memakai formatRupiah() Intl → 'Rp 299.000'."
  echo "Jika HTML memuat 'Rp 299K' / 'Rp 799K/bulan' → HTML disajikan BUKAN dari"
  echo "build kode lokal (artifact lama / cache / build campuran)."
else
  echo "SKIPPED — HTML landing tidak tersedia dari Section 4"
fi

# ============================================================================
# SECTION 7 — Data plan di DB production
#   Nilai Aktual tabel Plan (priceMonthly Growth harusnya Rp 999.000
#   grandfathered hasil migrate-plans). psql dulu, fallback Prisma.
#   SELECT-only — tidak ada yang mengubah data.
# ============================================================================
hdr 7 "Data plan di DB production"
DB_URL=$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/apps/web/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_OUT=""
GROWTH_PRICE=""
if [ -z "$DB_URL" ]; then
  echo "SKIPPED — DATABASE_URL tidak ditemukan di $PROJECT_DIR/apps/web/.env"
else
  # password tidak dicetak penuh (aman untuk paste ke chat)
  DB_URL_MASKED=$(echo "$DB_URL" | sed -E 's#(://[^:/@]+):[^@]+@#\1:***@#')
  echo "DATABASE_URL (masked): $DB_URL_MASKED"
  echo
  if command -v psql >/dev/null 2>&1; then
    echo "--- psql: SELECT dari tabel Plan ---"
    DB_OUT=$(psql "$DB_URL" -c "SELECT slug, name, \"priceMonthly\", \"priceYearly\", \"isActive\", \"sortOrder\" FROM \"Plan\" ORDER BY \"sortOrder\";" 2>&1)
    echo "$DB_OUT"
    if ! echo "$DB_OUT" | grep -qi 'slug'; then
      echo ">>> psql query gagal / tabel tidak ditemukan → fallback Prisma"
      DB_OUT=""
    fi
  else
    echo "psql tidak tersedia (command -v psql kosong) → fallback Prisma"
  fi

  if [ -z "$DB_OUT" ]; then
    echo "--- Prisma fallback: p.plan.findMany (SELECT-only) ---"
    DB_OUT=$(cd "$PROJECT_DIR/packages/db" 2>/dev/null && node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.plan.findMany({select:{slug:true,name:true,priceMonthly:true,priceYearly:true,isActive:true,sortOrder:true},orderBy:{sortOrder:'asc'}}).then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})" 2>&1)
    echo "$DB_OUT"
  fi

  # Harga Growth untuk ringkasan Section 9
  if echo "$DB_OUT" | grep -q '"slug": "growth"'; then
    GROWTH_PRICE=$(echo "$DB_OUT" | grep -A6 '"slug": "growth"' | grep -oE '"priceMonthly": ?"?[0-9.]+' | grep -oE '[0-9.]+' | head -1)
  elif echo "$DB_OUT" | grep -qi 'growth'; then
    GROWTH_PRICE=$(echo "$DB_OUT" | grep -i growth | grep -oE '[0-9]{3,}(\.[0-9]+)?' | head -1)
  fi

  if [ -z "$GROWTH_PRICE" ]; then
    echo ">>> Gagal mengekstrak priceMonthly Growth dari output DB — lihat output di atas"
  else
    echo
    echo ">>> priceMonthly Growth terdeteksi: $GROWTH_PRICE"
  fi
fi

# ============================================================================
# SECTION 8 — Disk & nginx/aaPanel hints
#   Disk penuh → build/deploy gagal diam-diam. Config nginx → siapa yang
#   memblokir asset dengan 400 (WAF/modsecurity/limit/deny).
# ============================================================================
hdr 8 "Disk & nginx/aaPanel hints"
echo "--- disk /www/wwwroot ---"
df -h /www/wwwroot 2>&1 | tail -1
echo "--- daftar vhost nginx aaPanel ---"
ls /www/server/panel/vhost/nginx/ 2>/dev/null | head -10 || echo "(folder vhost nginx tidak ditemukan / tidak terbaca)"
echo "--- conf nginx yang menyebut qalcuity ---"
NGINX_CONF=$(grep -l -i -E 'qalcuity' /www/server/panel/vhost/nginx/*.conf 2>/dev/null | head -3)
if [ -n "$NGINX_CONF" ]; then
  for conf in $NGINX_CONF; do
    echo "--- $conf : baris deny/waf/modsecurity/security/limit/400 ---"
    grep -n -i -E 'deny|waf|modsecurity|security|limit|400' "$conf" 2>&1 || echo "(tidak ada match)"
  done
else
  echo "(tidak ada conf nginx yang menyebut 'qalcuity')"
fi
echo "--- versi Next.js ---"
cat "$PROJECT_DIR/apps/web/node_modules/next/package.json" 2>/dev/null | grep '"version"' \
  || grep -rE '"next"' "$PROJECT_DIR/apps/web/package.json" 2>/dev/null \
  || echo "(next/package.json tidak terbaca)"

# ============================================================================
# SECTION 9 — Ringkasan otomatis
#   Kesimpulan singkat bila datanya tersedia.
# ============================================================================
hdr 9 "Ringkasan otomatis"

BUILD_DISK=$(cat "$NEXT_DIR/BUILD_ID" 2>/dev/null | tr -d '[:space:]')
[ -z "$BUILD_DISK" ] && BUILD_DISK="N/A (file BUILD_ID tidak terbaca)"
BUILD_HTML=$(grep -oE '/_next/static/[a-zA-Z0-9_-]+/' "$HTML_FILE" 2>/dev/null | head -1 | sed 's#/_next/static/##; s#/$##')
[ -z "$BUILD_HTML" ] && BUILD_HTML="N/A (HTML tidak terbaca)"

if [ "$BUILD_DISK" = "$BUILD_HTML" ] && [ "$BUILD_DISK" != "N/A (file BUILD_ID tidak terbaca)" ]; then
  BUILD_VERDICT="MATCH"
else
  BUILD_VERDICT="TIDAK MATCH (atau salah satu tidak terbaca)"
fi

if [ -n "$CSS_FILE" ]; then
  CSS_SIZE=$(stat -c '%s' "$NEXT_DIR/static/css/$CSS_FILE" 2>/dev/null || echo '?')
  CSS_DISK="ADA ($CSS_FILE, ${CSS_SIZE} bytes)"
else
  CSS_DISK="MISSING"
fi

if [ -n "$CHUNK_FILE" ]; then
  CHUNK_SIZE=$(stat -c '%s' "$NEXT_DIR/static/chunks/$CHUNK_FILE" 2>/dev/null || echo '?')
  CHUNK_DISK="ADA ($CHUNK_FILE, ${CHUNK_SIZE} bytes)"
else
  CHUNK_DISK="MISSING"
fi

if [ -n "$GROWTH_PRICE" ]; then
  case "$GROWTH_PRICE" in
    *999*) GROWTH_NOTE="→ sesuai ekspektasi grandfathered Rp 999.000" ;;
    *799*) GROWTH_NOTE="→ ANOMALI: kemungkinan artifact/HTML build lama (Rp 799K)" ;;
    *)     GROWTH_NOTE="(bandingkan manual dengan ekspektasi Rp 999.000)" ;;
  esac
  GROWTH_LINE="growth priceMonthly di DB : $GROWTH_PRICE $GROWTH_NOTE"
else
  GROWTH_LINE="growth priceMonthly di DB : N/A (lihat Section 7)"
fi

cat <<EOF
BUILD_ID disk        : $BUILD_DISK
BUILD_ID di HTML     : $BUILD_HTML  → $BUILD_VERDICT
file CSS e19f5c disk : $CSS_DISK
chunk 7269 disk      : $CHUNK_DISK
$GROWTH_LINE
localhost vs public  : local=$LOCAL_ASSET_STATUS  public=$PUBLIC_ASSET_STATUS  (CSS $ACTUAL_CSS)
                       → local 200 + public 400 = masalah nginx/aaPanel; keduanya 400 = Next.js/artifact
Proses node di $PROJECT_DIR: lihat Section 3 (cwd PID harus = $PROJECT_DIR)
EOF

echo
echo "SELESAI $(date -u '+%Y-%m-%dT%H:%M:%SZ') — semua command bersifat read-only."
