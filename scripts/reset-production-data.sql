-- ============================================================================
-- reset-production-data.sql — Reset data production ke state "fresh"
-- ============================================================================
--
-- TIGA MODE (pilih SATU via variabel psql `reset_mode`):
--
--   1. keep-accounts  (default)
--      Pertahankan: Tenant, User, Role, TaxRate, PasswordPolicy, PasswordHistory,
--      SoDRule, ControlPolicy, TenantIntegration, WorkflowDefinition,
--      IndustryConfiguration, TenantCustomField, TenantSubscription,
--      BillingPayment + platform master (Plan, SubscriptionPlan,
--      PlatformSetting, PlanTenantLimit).
--      HAPUS: semua data transaksional/bisnis SEMUA tenant
--      (Contact, Invoice, Product, HR, POS, Community, AuditLog,
--      WorkflowHistory, UserSession, LoginLog, CronRunLog, analytics, dst).
--      Cocok untuk: production penuh data test/demo, akun asli masih dipakai.
--
--   2. full
--      Pertahankan HANYA platform master (Plan grandfather pricing,
--      SubscriptionPlan, PlatformSetting, PlanTenantLimit).
--      HAPUS: semua data + semua Tenant + semua User.
--      Setelahnya JALANKAN core seed (lihat docs/RESET-PRODUCTION.md):
--        cd packages/db && SEED_DEMO=false npx prisma db seed
--      Cocok untuk: start-over total; semua tenant wajib daftar ulang.
--
-- DUA VARIABEL LAIN:
--   execute       = false (default, DRY-RUN) | true (eksekusi delete)
--   confirm_full  = wajib 'HAPUS-SEMUA' jika reset_mode=full (double guard)
--
-- CARA PAKAI (di VPS — lihat docs/RESET-PRODUCTION.md untuk runbook lengkap):
--   # 1) Preview (read-only, aman kapan saja):
--   psql "$DATABASE_URL" -v execute=false -f scripts/reset-production-data.sql
--
--   # 2) Eksekusi keep-accounts:
--   psql "$DATABASE_URL" -v execute=true -f scripts/reset-production-data.sql
--
--   # 3) Eksekusi full (lalu core seed):
--   psql "$DATABASE_URL" -v execute=true -v reset_mode=full \
--        -v confirm_full=HAPUS-SEMUA -f scripts/reset-production-data.sql
--
-- SAFETY GUARDS:
--   - Dry-run default            : tanpa -v execute=true TIDAK ADA yang dihapus.
--   - Full butuh confirm eksplisit: -v confirm_full=HAPUS-SEMUA.
--   - keep-accounts wajib SUPERADMIN masih ada (guard sebelum & sesudah).
--   - TRUNCATE ... CASCADE dalam SATU transaksi (rollback aman jika gagal).
--   - Tabel _prisma_migrations TIDAK PERNAH disentuh.
--   - Demo-tenant kandidat hanya DILISTENING (info) — hapus manual via
--     scripts/cleanup-demo-tenant.sql bila diperlukan.
--
-- PATTERN: mengikuti guard/preview/DO-block pola cleanup-demo-tenant.sql.
-- ============================================================================

-- ===== 0. VARIABEL DEFAULT (CLI -v menang jika sudah diset) =================
-- ON_ERROR_STOP: setiap error (termasuk RAISE EXCEPTION guard) menghentikan
-- SELURUH script — guard abort benar-benar menghentikan, bukan lanjut.
\set ON_ERROR_STOP on

\if :{?reset_mode}
\else
  \set reset_mode 'keep-accounts'
\endif

\if :{?execute}
\else
  \set execute 'false'
\endif

\if :{?confirm_full}
\else
  \set confirm_full ''
\endif

\echo '═══════════════════════════════════════════════════════════════════════'
\echo '  RESET PRODUCTION DATA — Qalcuity'
\echo '  reset_mode = :reset_mode    execute = :execute'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT set_config('app.reset_mode', :'reset_mode', false);

DO $$
BEGIN
  IF current_setting('app.reset_mode') NOT IN ('keep-accounts', 'full') THEN
    RAISE EXCEPTION 'ABORT: reset_mode "%" tidak dikenal — pakai keep-accounts atau full',
      current_setting('app.reset_mode');
  END IF;
END $$;

-- ============================================================================
-- BAGIAN A — PREVIEW (read-only, selalu dijalankan)
-- ============================================================================

\echo ''
\echo '--- A1. Tenant + jumlah user + jumlah SUPERADMIN -------------------------'

SELECT t.id,
       t.name,
       t.slug,
       t."subscriptionStatus",
       count(u.id)                                              AS user_count,
       count(u.id) FILTER (WHERE u.role = 'SUPERADMIN')         AS superadmin_count
FROM "Tenant" t
LEFT JOIN "User" u ON u."tenantId" = t.id
GROUP BY t.id, t.name, t.slug, t."subscriptionStatus"
ORDER BY t."createdAt";

\echo ''
\echo '--- A2. Klasifikasi tabel: [KEEP] dipertahankan / [WIPE] akan dihapus ----'
\echo '    (hanya tabel dengan kolom tenantId / userId / tenant_id / user_id)'

DO $$
DECLARE
  r         RECORD;
  n         BIGINT;
  col       TEXT;
  keep_arr  TEXT[];
  is_keep   BOOLEAN;
  wipe_total BIGINT := 0;
  keep_total BIGINT := 0;
BEGIN
  -- Keep-list sesuai mode
  IF current_setting('app.reset_mode') = 'keep-accounts' THEN
    keep_arr := ARRAY['Tenant','User','Role','TaxRate','PasswordPolicy','PasswordHistory',
                      'SoDRule','ControlPolicy','TenantIntegration','WorkflowDefinition',
                      'IndustryConfiguration','TenantCustomField','TenantSubscription',
                      'BillingPayment','Plan','SubscriptionPlan','PlatformSetting','PlanTenantLimit'];
  ELSE -- full
    keep_arr := ARRAY['Plan','SubscriptionPlan','PlatformSetting','PlanTenantLimit'];
  END IF;

  FOR r IN
    SELECT c.table_name,
           bool_or(c.column_name IN ('tenantId','tenant_id')) AS has_tenant,
           bool_or(c.column_name IN ('userId','user_id'))     AS has_user
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('tenantId','tenant_id','userId','user_id')
      AND c.table_name NOT LIKE '\_prisma\_%' ESCAPE '\'
    GROUP BY c.table_name
    ORDER BY c.table_name
  LOOP
    IF r.has_tenant THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name=r.table_name
                   AND column_name='tenantId') THEN col := 'tenantId';
      ELSE col := 'tenant_id';
      END IF;
      EXECUTE format('SELECT count(*) FROM public.%I', r.table_name) INTO n;
    ELSE -- userId-only
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name=r.table_name
                   AND column_name='userId') THEN col := 'userId';
      ELSE col := 'user_id';
      END IF;
      EXECUTE format('SELECT count(*) FROM public.%I', r.table_name) INTO n;
    END IF;

    is_keep := r.table_name = ANY (keep_arr);

    IF is_keep THEN
      RAISE NOTICE '[KEEP] % (% rows)', r.table_name, n;
      keep_total := keep_total + n;
    ELSE
      RAISE NOTICE '[WIPE] % (% rows)', r.table_name, n;
      wipe_total := wipe_total + n;
    END IF;
  END LOOP;

  -- "Tenant" di mode full: tidak punya kolom tenantId sehingga tidak muncul
  -- di sweep di atas — dihitung eksplisit di sini.
  IF current_setting('app.reset_mode') = 'full' THEN
    SELECT count(*) INTO n FROM "Tenant";
    RAISE NOTICE '[WIPE] % (% rows)  (mode full: tenant ikut dihapus)', 'Tenant (eksplisit)', n;
    wipe_total := wipe_total + n;
  END IF;

  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  RAISE NOTICE 'TOTAL estimasi baris dipertahankan : %', keep_total;
  RAISE NOTICE 'TOTAL estimasi baris akan dihapus : %', wipe_total;
END $$;

\echo ''
\echo '--- A3. Kandidat demo/test tenant (INFO SAJA — tidak dihapus otomatis) ---'
\echo '    (tanpa SUPERADMIN + name/slug mirip demo/test/trial/mailinator)'

SELECT t.id, t.name, t.slug, t."createdAt",
       count(u.id) AS user_count
FROM "Tenant" t
LEFT JOIN "User" u ON u."tenantId" = t.id
WHERE NOT EXISTS (
        SELECT 1 FROM "User" u2 WHERE u2."tenantId" = t.id AND u2.role = 'SUPERADMIN'
      )
  AND (t.name ~* 'demo|test|trial|contoh|mailinator|example'
    OR t.slug ~* 'demo|test|trial|contoh|mailinator|example')
GROUP BY t.id, t.name, t.slug, t."createdAt"
ORDER BY t."createdAt";

\echo '    → Untuk hapus 1 tenant demo: jalankan scripts/cleanup-demo-tenant.sql'

-- ============================================================================
-- BAGIAN B — EKSEKUSI (hanya jika execute=true)
-- ============================================================================

\if :execute

\echo ''
\echo '>>> EXECUTE=true — memulai eksekusi reset (mode: :reset_mode)'

-- Set confirm dulu (session-level), baru guard — current_setting() pada GUC
-- yang belum pernah di-set akan error "unrecognized configuration parameter",
-- jadi set_config WAJIB mendahului pemakaian current_setting('app.confirm_full').
SELECT set_config('app.confirm_full', :'confirm_full', false);

-- Guard mode full: butuh confirm eksplisit (RAISE EXCEPTION + ON_ERROR_STOP
-- menghentikan seluruh script).
DO $$
BEGIN
  IF current_setting('app.reset_mode') = 'full'
     AND current_setting('app.confirm_full', true) IS DISTINCT FROM 'HAPUS-SEMUA' THEN
    RAISE EXCEPTION 'ABORT: reset_mode=full butuh -v confirm_full=HAPUS-SEMUA (terbaca: "%")',
      coalesce(current_setting('app.confirm_full', true), '(kosong)');
  END IF;
END $$;

-- B1. Reminder backup (script tidak auto-backup — backup = tanggung jawab operator)
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'PASTIKAN SUDAH BACKUP DATABASE SEBELUM MELANJUTKAN!';
  RAISE NOTICE '  cd /www/wwwroot/qalcuity && sudo bash update.sh (Step 2 backup)';
  RAISE NOTICE '  atau: pg_dump $DATABASE_URL | gzip > backup_$(date +%%F).sql.gz';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- B2. Guard keep-accounts: SUPERADMIN harus masih ada
DO $$
DECLARE
  v_super INT;
BEGIN
  IF current_setting('app.reset_mode') = 'keep-accounts' THEN
    SELECT count(*) INTO v_super FROM "User" WHERE role = 'SUPERADMIN';
    IF v_super = 0 THEN
      RAISE EXCEPTION 'ABORT: tidak ada user SUPERADMIN — mode keep-accounts tidak aman tanpa platform admin';
    END IF;
    RAISE NOTICE 'Guard OK: % SUPERADMIN ditemukan (akan dipertahankan)', v_super;
  END IF;
END $$;

BEGIN;

  -- B3. Validasi mode + confirm (sekali lagi, di dalam transaksi)
  DO $$
  BEGIN
    IF current_setting('app.reset_mode') = 'full'
       AND current_setting('app.confirm_full') IS DISTINCT FROM 'HAPUS-SEMUA' THEN
      RAISE EXCEPTION 'ABORT: confirm_full bukan HAPUS-SEMUA';
    END IF;
  END $$;

  -- B4. Temp keep-list
  CREATE TEMP TABLE _keep ON COMMIT DROP (table_name TEXT PRIMARY KEY);

  DO $$
  BEGIN
    IF current_setting('app.reset_mode') = 'keep-accounts' THEN
      INSERT INTO _keep (table_name) VALUES
        ('Tenant'), ('User'), ('Role'), ('TaxRate'), ('PasswordPolicy'),
        ('PasswordHistory'), ('SoDRule'), ('ControlPolicy'), ('TenantIntegration'),
        ('WorkflowDefinition'), ('IndustryConfiguration'), ('TenantCustomField'),
        ('TenantSubscription'), ('BillingPayment'),
        ('Plan'), ('SubscriptionPlan'), ('PlatformSetting'), ('PlanTenantLimit');
    ELSE -- full: hanya platform master
      INSERT INTO _keep (table_name) VALUES
        ('Plan'), ('SubscriptionPlan'), ('PlatformSetting'), ('PlanTenantLimit');
    END IF;
    RAISE NOTICE 'Keep-list (% tabel): %',
      (SELECT count(*) FROM _keep),
      (SELECT string_agg(table_name, ', ' ORDER BY table_name) FROM _keep);
  END $$;

  -- B5. Sweep: TRUNCATE semua tabel dengan tenantId/userId di luar keep-list.
  --     TRUNCATE ... CASCADE menangani FK order otomatis (tabel join tanpa
  --     kolom tenantId yang FK ke tabel ikut ter- truncate).
  DO $$
  DECLARE
    r     RECORD;
    stmt  TEXT := '';
    cnt   INT := 0;
  BEGIN
    FOR r IN
      SELECT DISTINCT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name IN ('tenantId','tenant_id','userId','user_id')
        AND c.table_name NOT LIKE '\_prisma\_%' ESCAPE '\'
        AND NOT EXISTS (SELECT 1 FROM _keep k WHERE k.table_name = c.table_name)
      ORDER BY c.table_name
    LOOP
      stmt := stmt || quote_ident(r.table_name) || ', ';
      cnt := cnt + 1;
    END LOOP;

    IF cnt = 0 THEN
      RAISE NOTICE 'Sweep: tidak ada tabel untuk di-truncate';
      RETURN;
    END IF;

    stmt := left(stmt, length(stmt) - 2); -- strip trailing ", "
    RAISE NOTICE 'Sweep: TRUNCATE % tabel (data transaksional)...', cnt;
    EXECUTE format('TRUNCATE TABLE %s CASCADE', stmt);
    RAISE NOTICE 'Sweep selesai.';
  END $$;

  -- B6. Mode full: hapus semua Tenant (kolomnya tidak punya tenantId sehingga
  --     tidak tersentuh sweep di atas). CASCADE membersihkan sisa FK.
  DO $$
  DECLARE
    n BIGINT;
  BEGIN
    IF current_setting('app.reset_mode') = 'full' THEN
      EXECUTE 'TRUNCATE TABLE "Tenant" CASCADE';
      SELECT count(*) INTO n FROM "Tenant";
      IF n > 0 THEN
        RAISE EXCEPTION 'ABORT: "Tenant" masih berisi % row setelah truncate', n;
      END IF;
      RAISE NOTICE 'Mode full: seluruh Tenant berhasil dihapus';
    END IF;
  END $$;

  -- B7. Verifikasi di dalam transaksi
  DO $$
  DECLARE
    v_super INT;
    v_tenant INT;
    v_user INT;
  BEGIN
    IF current_setting('app.reset_mode') = 'keep-accounts' THEN
      SELECT count(*) INTO v_super FROM "User" WHERE role = 'SUPERADMIN';
      SELECT count(*) INTO v_tenant FROM "Tenant";
      SELECT count(*) INTO v_user FROM "User";
      IF v_super = 0 THEN
        RAISE EXCEPTION 'ROLLBACK: SUPERADMIN hilang setelah sweep — abort';
      END IF;
      RAISE NOTICE 'Verifikasi keep-accounts: Tenant=% User=% SUPERADMIN=%',
        v_tenant, v_user, v_super;
    ELSE -- full
      SELECT count(*) INTO v_tenant FROM "Tenant";
      SELECT count(*) INTO v_user FROM "User";
      IF v_tenant > 0 OR v_user > 0 THEN
        RAISE EXCEPTION 'ROLLBACK: mode full tapi Tenant=% User=% — abort', v_tenant, v_user;
      END IF;
      RAISE NOTICE 'Verifikasi full: Tenant=0 User=0 (menunggu core seed)';
    END IF;
  END $$;

COMMIT;

\echo ''
\echo '>>> RESET SELESAI & COMMIT. Jalankan Bagian C (verifikasi pasca).'
\echo '>>> Mode full: SEKARANG jalankan core seed —'
\echo '>>>   cd /www/wwwroot/qalcuity/packages/db && SEED_DEMO=false npx prisma db seed'

\else

\echo ''
\echo '>>> DRY-RUN (execute=false): TIDAK ADA data yang dihapus.'
\echo '>>> Untuk eksekusi: psql "$DATABASE_URL" -v execute=true -f scripts/reset-production-data.sql'

\endif

-- ============================================================================
-- BAGIAN C — VERIFIKASI PASCA (read-only)
-- ============================================================================

\echo ''
\echo '--- C1. Ringkasan pasca-reset ------------------------------------------------'

SELECT (SELECT count(*) FROM "Tenant")                                  AS tenant_left,
       (SELECT count(*) FROM "User")                                   AS user_left,
       (SELECT count(*) FROM "User" WHERE role = 'SUPERADMIN')         AS superadmin_left,
       (SELECT count(*) FROM "Plan")                                   AS plan_rows,
       (SELECT count(*) FROM "PlatformSetting")                        AS platform_setting_rows,
       (SELECT count(*) FROM "TenantSubscription")                     AS subscription_rows;

\echo ''
\echo '--- C2. Pastikan tabel transaksional sudah 0 ------------------------------'

DO $$
DECLARE
  r     RECORD;
  n     BIGINT;
  col   TEXT;
  bad   INT := 0;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('tenantId','tenant_id','userId','user_id')
      AND c.table_name NOT LIKE '\_prisma\_%' ESCAPE '\'
      AND c.table_name NOT IN ('Tenant','User','Role','TaxRate','PasswordPolicy',
                               'PasswordHistory','SoDRule','ControlPolicy',
                               'TenantIntegration','WorkflowDefinition',
                               'IndustryConfiguration','TenantCustomField',
                               'TenantSubscription','BillingPayment',
                               'Plan','SubscriptionPlan','PlatformSetting','PlanTenantLimit')
    ORDER BY c.table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.table_name) INTO n;
    IF n > 0 THEN
      RAISE WARNING 'MASIH ADA DATA: % = % rows', r.table_name, n;
      bad := bad + 1;
    END IF;
  END LOOP;

  IF bad = 0 THEN
    RAISE NOTICE 'Semua tabel transaksional kosong ✓';
  ELSE
    RAISE WARNING '% tabel masih berisi data — kemungkinan tidak punya kolom tenantId/userId; inspect manual', bad;
  END IF;
END $$;
