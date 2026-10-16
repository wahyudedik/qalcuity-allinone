-- ============================================================================
-- CLEANUP: Hapus tenant test/demo dari production database
-- ============================================================================
-- Konteks: RCA Session 80 — tenant test dibuat via POST /api/demo/load
--          (kemungkinan besar klik tidak sengaja di OnboardingModal).
--
-- Cara pakai (psql):
--   1. Isi TARGET_EMAIL di bawah (email ADMIN tenant test).
--   2. Jalankan BAGIAN A (preview) terlebih dahulu — TANPA menghapus apa pun.
--      Periksa output: nama tenant, jumlah user, jumlah row per tabel.
--   3. Jika preview benar, jalankan BAGIAN B (delete) dalam satu sesi.
--   4. Verifikasi: jalankan ulang bagian A — seharusnya "tenant tidak ditemukan".
--
-- Catatan:
--   - Hanya menghapus 1 tenant yang diidentifikasi via email adminnya.
--   - Tenant SUPERADMIN platform TIDAK akan tersentuh (guard di bawah).
--   - Kolom tenantId/userId terdeteksi dinamis via information_schema,
--     aman terhadap penambahan tabel baru di masa depan.
--   - UserSession / PasswordHistory terhapus otomatis via FK CASCADE,
--     LoginLog via FK SET NULL — tetap di-cover juga oleh sweep tenantId.
-- ============================================================================

-- ===== KONFIGURASI ============================================================
-- Ganti dengan email admin tenant test yang ingin dihapus:
\set target_email 'kotak@mailinator.com'

-- ===== BAGIAN A: PREVIEW (read-only, jalankan dulu) ==========================

-- A1. Identifikasi tenant target dari email admin
SELECT
    t.id   AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    u.email AS admin_email,
    u.role  AS admin_role
FROM "User" u
JOIN "Tenant" t ON t.id = u."tenantId"
WHERE lower(u.email) = lower(:'target_email');

-- A2. Semua user di tenant tersebut
SELECT u.id, u.email, u.name, u.role, u."createdAt"
FROM "User" u
WHERE u."tenantId" = (
    SELECT u2."tenantId" FROM "User" u2 WHERE lower(u2.email) = lower(:'target_email')
);

-- A3. Perkiraan jumlah row per tabel yang akan terhapus (tabel dengan kolom tenantId)
DO $$
DECLARE
    r            RECORD;
    v_tenant     TEXT;
    v_rows       BIGINT;
    v_total      BIGINT := 0;
BEGIN
    SELECT "tenantId"::TEXT INTO v_tenant
    FROM "User" WHERE lower(email) = lower(current_setting('app.target_email', true))
    LIMIT 1;

    IF v_tenant IS NULL THEN
        RAISE NOTICE '=== PREVIEW: tenant tidak ditemukan untuk email yang diberikan ===';
        RETURN;
    END IF;

    RAISE NOTICE '=== PREVIEW: tenant % ===', v_tenant;
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
            ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_name IN ('tenantId', 'tenant_id')
        ORDER BY c.table_name
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM public.%I WHERE %I::TEXT = %L',
            r.table_name,
            CASE WHEN EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name=r.table_name AND column_name='tenantId'
            ) THEN 'tenantId' ELSE 'tenant_id' END,
            v_tenant
        ) INTO v_rows;
        IF v_rows > 0 THEN
            RAISE NOTICE '  %-40s % rows', r.table_name, v_rows;
            v_total := v_total + v_rows;
        END IF;
    END LOOP;
    RAISE NOTICE '=== TOTAL perkiraan: % rows across all tenant tables ===', v_total;
END $$;

-- ===== BAGIAN B: DELETE (jalankan setelah preview disetujui) =================
-- Semua operasi dibungkus 1 transaction — gagal = rollback penuh.

BEGIN;

-- B1. Set target email ke session setting (agar DO block bisa akses)
SELECT set_config('app.target_email', :'target_email', false);

-- B2. Guard: pastikan tenant ditemukan TEPAT 1
DO $$
DECLARE
    v_count  INT;
    v_tenant TEXT;
BEGIN
    SELECT count(*), min("tenantId"::TEXT) INTO v_count, v_tenant
    FROM "User" WHERE lower(email) = lower(current_setting('app.target_email'));

    IF v_count = 0 THEN
        RAISE EXCEPTION 'ABORT: tidak ada user dengan email % — cek TARGET_EMAIL', current_setting('app.target_email');
    END IF;
    IF v_count > 1 THEN
        RAISE EXCEPTION 'ABORT: email % dipakai % user berbeda — inspect manual dulu', current_setting('app.target_email'), v_count;
    END IF;
    RAISE NOTICE 'Target tenant: %', v_tenant;
END $$;

-- B3. Guard: JANGAN hapus tenant platform (punya user SUPERADMIN)
DO $$
DECLARE
    v_super INT;
BEGIN
    SELECT count(*) INTO v_super
    FROM "User" u
    WHERE u."tenantId" = (
        SELECT "tenantId" FROM "User"
        WHERE lower(email) = lower(current_setting('app.target_email'))
    )
    AND u.role = 'SUPERADMIN';

    IF v_super > 0 THEN
        RAISE EXCEPTION 'ABORT: tenant target memiliki user SUPERADMIN — ini bukan tenant test';
    END IF;
END $$;

-- B4. Simpan ID user target SEBELUM row terhapus (untuk tabel tanpa tenantId)
CREATE TEMP TABLE _target_users ON COMMIT DROP AS
SELECT u.id FROM "User" u
WHERE u."tenantId" = (
    SELECT "tenantId" FROM "User"
    WHERE lower(email) = lower(current_setting('app.target_email'))
);

CREATE TEMP TABLE _target_tenant ON COMMIT DROP AS
SELECT id FROM "Tenant"
WHERE id = (SELECT "tenantId" FROM "User" WHERE lower(email) = lower(current_setting('app.target_email')));

-- B5. Sweep: hapus row di SEMUA tabel yang punya kolom tenantId
DO $$
DECLARE
    r       RECORD;
    col     TEXT;
    n       BIGINT;
    v_tenant TEXT;
BEGIN
    SELECT id::TEXT INTO v_tenant FROM _target_tenant;

    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
            ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_name IN ('tenantId', 'tenant_id')
        ORDER BY c.table_name
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name=r.table_name AND column_name='tenantId'
        ) THEN col := 'tenantId';
        ELSE col := 'tenant_id';
        END IF;

        EXECUTE format(
            'DELETE FROM public.%I WHERE %I::TEXT = %L',
            r.table_name, col, v_tenant
        );
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN
            RAISE NOTICE 'DELETED % rows FROM %', n, r.table_name;
        END IF;
    END LOOP;
END $$;

-- B6. Sweep: hapus baris yang hanya punya userId (tanpa tenantId) —
--     tabel seperti CommunityMember yang pakai pola plain-string userId.
DO $$
DECLARE
    r RECORD;
    n BIGINT;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
            ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_name IN ('userId', 'user_id')
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c2
              WHERE c2.table_schema = 'public'
                AND c2.table_name = c.table_name
                AND c2.column_name IN ('tenantId', 'tenant_id')
          )
        ORDER BY c.table_name
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name=r.table_name AND column_name='userId'
        ) THEN
            EXECUTE format(
                'DELETE FROM public.%I WHERE "userId" IN (SELECT id FROM _target_users)',
                r.table_name
            );
        ELSE
            EXECUTE format(
                'DELETE FROM public.%I WHERE "user_id" IN (SELECT id FROM _target_users)',
                r.table_name
            );
        END IF;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN
            RAISE NOTICE 'DELETED % rows FROM % (via userId)', n, r.table_name;
        END IF;
    END LOOP;
END $$;

-- B7. Hapus tenant itu sendiri
DELETE FROM "Tenant" WHERE id IN (SELECT id FROM _target_tenant);

-- B8. Verifikasi akhir
DO $$
DECLARE
    v_left INT;
BEGIN
    SELECT count(*) INTO v_left FROM "Tenant" t
    WHERE t.id NOT IN (SELECT id FROM _target_tenant)
      AND t.id = (SELECT id FROM _target_tenant);
    IF EXISTS (SELECT 1 FROM "Tenant" WHERE id IN (SELECT id FROM _target_tenant)) THEN
        RAISE EXCEPTION 'ABORT: tenant masih ada setelah delete — kemungkinan FK RESTRICT, inspect manual';
    END IF;
    RAISE NOTICE '=== CLEANUP SELESAI: tenant berhasil dihapus ===';
END $$;

COMMIT;

-- ===== VERIFIKASI PASCA-DELETE ===============================================
-- Jalankan setelah COMMIT — keduanya harus kosong / "tenant tidak ditemukan".
SELECT t.id, t.name FROM "Tenant" t
JOIN "User" u ON u."tenantId" = t.id
WHERE lower(u.email) = lower(:'target_email');

SELECT count(*) AS sisa_row_di_tabel_tenant FROM "Tenant"
WHERE id NOT IN (SELECT id FROM "Tenant"); -- sanity: seluruh tabel Tenant masih sehat
