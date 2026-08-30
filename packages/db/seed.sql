-- ============================================================
-- Qalcuity - SQL Seed Script (Manual via psql)
-- Jalankan: /www/server/pgsql/bin/psql -U qalcuity -d qalcuity -f seed.sql
-- ============================================================

-- Disable foreign key checks sementara
SET session_replication_role = 'replica';

-- ============================================
-- TENANT
-- ============================================
INSERT INTO "Tenant" (id, name, slug, email, phone, address, "subscriptionStatus", settings, "createdAt", "updatedAt")
VALUES (
  'clxseed001tenant0000000000',
  'PT Qalcuity Demo',
  'qalcuity-demo',
  'demo@qalcuity.com',
  '021-1234567',
  'Jl. Sudirman No. 123, Jakarta Selatan',
  'TRIAL',
  '{}',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address;

-- ============================================
-- USERS (passwords are bcrypt-hashed)
-- ============================================
-- SuperAdmin: Wahyu123456789@
INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "tenantId", "createdAt", "updatedAt")
VALUES (
  'clxseed001user0000000super',
  'info@qalcuity.com',
  'Super Admin',
  '$2b$10$Cl44yVzcfPfD5xKuRxszqOvOOxmLuqvfMwdfjtVAilejbYbuIw2SS',
  'SUPERADMIN',
  true,
  'clxseed001tenant0000000000',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role;

-- Admin: admin123
INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "tenantId", "createdAt", "updatedAt")
VALUES (
  'clxseed001user0000000admin',
  'admin@qalcuity.com',
  'Admin User',
  '$2b$10$wiV1k8hJynuJCjIk8gOln.NbkAhCiiA6JUN6k56lssBitzpi2qVry',
  'ADMIN',
  true,
  'clxseed001tenant0000000000',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role;

-- Demo: demo123
INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "tenantId", "createdAt", "updatedAt")
VALUES (
  'clxseed001user00000000demo',
  'demo@qalcuity.com',
  'Demo User',
  '$2b$10$9s1xESuLY3eV1qtiT6GdE.iqrjKiRQoptV1RGETEPeAm1GJilnv9.',
  'ADMIN',
  true,
  'clxseed001tenant0000000000',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role;

-- Member: member123
INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "tenantId", "createdAt", "updatedAt")
VALUES (
  'clxseed001user0000000member',
  'member@qalcuity.com',
  'Member User',
  '$2b$10$vAmYv5q7fYBNZ9eawzKrz.SXkc5SNeAOlWtFFT5kxcu8z4eHVUi2m',
  'MEMBER',
  true,
  'clxseed001tenant0000000000',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role;

-- Viewer: viewer123
INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "tenantId", "createdAt", "updatedAt")
VALUES (
  'clxseed001user0000000viewer',
  'viewer@qalcuity.com',
  'Viewer User',
  '$2b$10$XMcOS/YTTokboXJxP9SHz.PCe7kAVoYbd4Nf/x0sHRjyg9GF6nNAi',
  'VIEWER',
  true,
  'clxseed001tenant0000000000',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  "passwordHash" = EXCLUDED."passwordHash",
  role = EXCLUDED.role;

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO "Category" (id, name, description, "tenantId", "createdAt", "updatedAt") VALUES
('clxseed001cat0000electronics', 'Electronics', 'Produk elektronik', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000mechanical', 'Mechanical', 'Komponen mekanik', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000services0', 'Services', 'Layanan jasa', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000office00', 'Office Supplies', 'Perlengkapan kantor', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000furniture', 'Furniture', 'Furniture kantor dan rumah', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000automotiv', 'Automotive Parts', 'Suku cadang kendaraan', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000foodbev0', 'Food & Beverage', 'Makanan dan minuman', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000software', 'Software & Digital', 'Perangkat lunak dan layanan digital', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cat0000building', 'Building Materials', 'Bahan bangunan dan konstruksi', 'clxseed001tenant0000000000', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- CONTACTS (Customers)
-- ============================================
INSERT INTO "Contact" (id, name, type, company, email, phone, address, city, "taxId", "tenantId", "createdAt", "updatedAt") VALUES
('clxseed001cnt00majujaya', 'PT Maju Jaya', 'CUSTOMER', 'PT Maju Jaya', 'info@majujaya.co.id', '021-2345678', 'Jl. Gatot Subroto No. 45', 'Jakarta', '01.234.567.8-901.000', 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cnt00berkah00', 'CV Berkah Mandiri', 'CUSTOMER', 'CV Berkah Mandiri', 'info@berkahmandiri.co.id', '021-3456789', 'Jl. HR Rasuna Said No. 78', 'Jakarta', NULL, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cnt00sejahte', 'PT Sejahtera Abadi', 'CUSTOMER', 'PT Sejahtera Abadi', 'sales@sejahtera.co.id', '021-4567890', 'Jl. TB Simatupang No. 90', 'Jakarta', NULL, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cnt00nusantar', 'PT Nusantara Jaya', 'CUSTOMER', 'PT Nusantara Jaya', 'info@nusantara.co.id', '021-5678901', 'Jl. Thamrin No. 12', 'Jakarta', NULL, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cnt00sukses0', 'CV Sukses Mandiri', 'CUSTOMER', 'CV Sukses Mandiri', 'info@suksesmandiri.co.id', '021-6789012', 'Jl. Kuningan No. 55', 'Jakarta', NULL, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cnt00sumbmak', 'PT Sumber Makmur', 'SUPPLIER', 'PT Sumber Makmur', 'info@sumbermakmur.co.id', '021-5553691', NULL, NULL, NULL, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001cnt00global00', 'CV Global Tech', 'BOTH', 'CV Global Tech', 'hello@globaltech.co.id', '021-5557412', NULL, NULL, NULL, 'clxseed001tenant0000000000', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- SUPPLIERS
-- ============================================
INSERT INTO "Supplier" (id, name, "contactPerson", email, phone, address, city, rating, "tenantId", "createdAt", "updatedAt") VALUES
('clxseed001sup00sejahte', 'PT Sejahtera Supplier', 'Budi Hartono', 'budi@sejahtera-supplier.co.id', '021-7890123', 'Jl. Raya Bogor Km 30', 'Jakarta', 4.5, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001sup00berkah0', 'CV Berkah Components', 'Siti Rahayu', 'siti@berkahcomp.co.id', '021-8901234', 'Jl. Raya Bekasi Km 15', 'Bekasi', 4.0, 'clxseed001tenant0000000000', NOW(), NOW()),
('clxseed001sup00teknolo', 'PT Teknologi Nusantara', 'Rahmat Widodo', 'rahmat@teknusa.co.id', '021-9012345', 'Jl. Raya Tangerang Km 12', 'Tangerang', 4.2, 'clxseed001tenant0000000000', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ============================================
-- VERIFIKASI
-- ============================================
SELECT '=== SEED COMPLETED ===' AS status;
SELECT COUNT(*) AS tenants FROM "Tenant";
SELECT COUNT(*) AS users FROM "User";
SELECT COUNT(*) AS categories FROM "Category";
SELECT COUNT(*) AS contacts FROM "Contact";
SELECT COUNT(*) AS suppliers FROM "Supplier";
