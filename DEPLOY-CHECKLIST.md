# VPS Deployment Checklist — 5 New Migrations (6 September 2026)

> **Deployment target:** `https://qalcuity.com` — `/www/wwwroot/qalcuity`
> **Method:** `bash update.sh` via SSH + aaPanel auto-restart
> **Risk level:** 🟠 Medium — 5 new migrations, new tables + ALTER TABLE

---

## 📋 Migration Summary

| # | Migration | Description | Tables Affected | Risk |
|---|-----------|-------------|-----------------|------|
| 1 | `20260905203000_add_kitchen_display` | Kitchen Display System | `PosKitchenStation`, `PosKitchenOrder`, `PosKitchenOrderItem` + indexes | 🟢 Low |
| 2 | `20260905210000_add_table_management` | Table Management | `PosTable`, `PosTableReservation` + indexes | 🟢 Low |
| 3 | `20260905220000_add_operations_module` | Operations Module Phase A | `Project`, `ProjectMember`, `Task`, `TaskComment`, `TimeLog` + indexes | 🟡 Medium |
| 4 | `20260905210000_add_operations_phase_b` | Operations Phase B (Gantt, Budget, Resources) | ALTER `Task` + `ProjectBudget`, `ResourceAllocation` + indexes | 🟡 Medium |
| 5 | `20260905220000_add_operations_phase_c_field_service` | Operations Phase C (Field Service) | `FieldJob`, `FieldJobAssignment`, `FieldChecklist`, `FieldJobChecklistItem` + indexes | 🟢 Low |

### Migration Details

#### 1. Kitchen Display System (`20260905203000_add_kitchen_display`)
- **CREATE** `PosKitchenStation` — Station management (name, description, isActive, sortOrder)
- **CREATE** `PosKitchenOrder` — Kitchen orders (status: PENDING→PREPARING→READY→COMPLETED, priority, timer)
- **CREATE** `PosKitchenOrderItem` — Order items with individual status tracking
- **Indexes:** 8 indexes (tenantId, stationId, status, orderNumber)
- **Foreign Keys:** Tenant references

#### 2. Table Management (`20260905210000_add_table_management`)
- **CREATE** `PosTable` — Table layout (number, capacity, status, zone, floor, posX/Y coordinates)
- **CREATE** `PosTableReservation` — Reservations (customer, party size, time, duration, status)
- **Indexes:** 6 indexes (tenantId+number unique, status, zone, reservation time)
- **Foreign Keys:** Tenant references

#### 3. Operations Module Phase A (`20260905220000_add_operations_module`)
- **CREATE** `Project` — Project management (name, status, budget, progress)
- **CREATE** `ProjectMember` — Team assignment
- **CREATE** `Task` — Task management (status, priority, assignee, due date, hours)
- **CREATE** `TaskComment` — Task discussions
- **CREATE** `TimeLog` — Time tracking
- **Indexes:** 10+ indexes
- **Foreign Keys:** Tenant, Project references

#### 4. Operations Phase B (`20260905210000_add_operations_phase_b`)
- **ALTER** `Task` — Add columns: `startDate`, `endDate`, `progress`, `dependsOnId`
- **CREATE** `ProjectBudget` — Budget line items per project
- **CREATE** `ResourceAllocation` — Resource assignments per project
- **Indexes:** 6+ indexes
- **Foreign Keys:** Task dependency self-reference, Tenant, Project references

#### 5. Operations Phase C — Field Service (`20260905220000_add_operations_phase_c_field_service`)
- **CREATE** `FieldJob` — Field service jobs (location, coordinates, scheduling, customer info)
- **CREATE** `FieldJobAssignment` — Technician assignments
- **CREATE** `FieldChecklist` — Mobile checklists (JSONB items)
- **CREATE** `FieldJobChecklistItem` — Completed checklist items per job
- **Indexes:** 8+ indexes
- **Foreign Keys:** Tenant, Project, Employee references

---

## 🔧 Pre-Deployment Checklist

- [ ] 1. Backup database sebelum deploy
- [ ] 2. Pastikan `update.sh` sudah di-commit ke repository
- [ ] 3. Pastikan semua migration files sudah di-commit
- [ ] 4. Pastikan `schema.prisma` sudah up-to-date
- [ ] 5. Cek disk space VPS (`df -h`)
- [ ] 6. Cek PostgreSQL status (`systemctl status postgresql`)

---

## 🚀 Deployment Steps

### Step 1: Commit & Push

```bash
# Dari local machine
cd e:/PROJEKU/qalcuity-allinone

# Pastikan semua file ter-commit
git status

# Commit deployment artifacts
git add update.sh DEPLOY-CHECKLIST.md CURRENT.md
git commit -m "chore: prepare VPS deployment — 5 new migrations + update.sh fix"

# Push ke repository
git push origin main
```

### Step 2: SSH ke VPS

```bash
ssh root@IP_VPS
```

### Step 3: Jalankan Update Script

```bash
cd /www/wwwroot/qalcuity
sudo bash update.sh
```

Script akan otomatis:
1. ✅ Cek direktori aplikasi
2. ✅ Cek Node.js environment
3. ✅ Backup database PostgreSQL
4. ✅ Pull update dari repository
5. ✅ Install dependencies (jika ada perubahan package.json)
6. ✅ **Prisma generate** (selalu)
7. ✅ **Prisma migrate deploy** (jika ada perubahan schema ATAU migration files)
8. ✅ Build aplikasi (`pnpm build`)
9. ✅ Restart application (aaPanel auto-restart)
10. ✅ Health check (5 retries, HTTP 200)

### Step 4: Verify Deployment

```bash
# Cek health endpoint
curl -s https://qalcuity.com/api/health | head -20

# Cek apakah migration sudah applied
cd /www/wwwroot/qalcuity/packages/db
npx prisma migrate status
```

Expected output untuk `prisma migrate status`:
```
Database schema is up to date with the migrations from the prisma/migrations directory.

Following migrations have been applied:
  20260830195500_init
  20260901021200_add_settings_models
  ... (semua migrations termasuk 5 baru)
  20260905203000_add_kitchen_display
  20260905210000_add_table_management
  20260905220000_add_operations_module
  20260905210000_add_operations_phase_b
  20260905220000_add_operations_phase_c_field_service
```

---

## ⚠️ Rollback Instructions

### Jika Migration Gagal

```bash
# 1. Cek error log
cd /www/wwwroot/qalcuity
cat /var/log/qalcuity-update.log | tail -50

# 2. Restore database dari backup
cd /www/wwwroot/qalcuity/backups
ls -la pg_backup_*.sql
PG_BIN="/www/server/pgsql/bin"
$PG_BIN/psql -U qalcuity -d qalcuity -f pg_backup_XXXXXXXX_XXXXXX.sql

# 3. Rollback ke commit sebelumnya
cd /www/wwwroot/qalcuity
git log --oneline -5
git checkout COMMIT_HASH_SEBELUMNYA

# 4. Rebuild
rm -rf apps/web/.next
pnpm install
cd packages/db && npx prisma generate
cd ../.. && pnpm build

# 5. Restart via aaPanel
```

### Jika Build Gagal

```bash
# 1. Cek error
cd /www/wwwroot/qalcuity
cat /var/log/qalcuity-update.log | tail -30

# 2. Rollback ke commit sebelumnya
git log --oneline -5
git checkout COMMIT_HASH_SEBELUMNYA

# 3. Rebuild manual
rm -rf apps/web/.next
pnpm install
cd packages/db && npx prisma generate && cd ../..
pnpm build
```

### Jika Application Crash

```bash
# 1. Kill process di port 3000
fuser -k 3000/tcp

# 2. Cek aaPanel Node.js Project Manager → Restart
# Atau manual:
cd /www/wwwroot/qalcuity
NODE_ENV=production node apps/web/server.js &

# 3. Cek health
curl -s http://127.0.0.1:3000/api/health
```

---

## 📊 Post-Deployment Verification

### Checklist

- [ ] 1. Health check pass (`curl https://qalcuity.com/api/health` → HTTP 200)
- [ ] 2. Login berhasil (`https://qalcuity.com` → login page muncul)
- [ ] 3. Dashboard load tanpa error
- [ ] 4. POS Kitchen Display berfungsi (`/dashboard/pos/kitchen`)
- [ ] 5. POS Table Management berfungsi (`/dashboard/pos/tables`)
- [ ] 6. Operations Module berfungsi (`/dashboard/projects`)
- [ ] 7. Task Management berfungsi (`/dashboard/tasks`)
- [ ] 8. Field Service berfungsi (`/dashboard/operations/field-service`)
- [ ] 9. Tidak ada console errors di browser
- [ ] 10. i18n (Bahasa Indonesia + English) berfungsi

### Database Verification

```bash
# Cek tabel baru ada
cd /www/wwwroot/qalcuity/packages/db
npx prisma studio
# Browse: PosKitchenStation, PosKitchenOrder, PosTable, Project, Task, FieldJob
```

### Feature Verification

| Feature | URL | Expected |
|---------|-----|----------|
| Kitchen Display | `/dashboard/pos/kitchen` | Station list, order queue |
| Table Management | `/dashboard/pos/tables` | Grid view, table list |
| Projects | `/dashboard/projects` | Project list, create/edit |
| Tasks | `/dashboard/tasks` | My Tasks, Kanban board |
| Timesheet | `/dashboard/timesheet` | Time logging |
| Field Service | `/dashboard/operations/field-service` | Job scheduling |

---

## 📝 Notes

- **update.sh** sudah di-update: `prisma migrate deploy` sekarang trigger jika ada perubahan `schema.prisma` **ATAU** migration files di `packages/db/prisma/migrations/`
- **Backup otomatis** dilakukan sebelum setiap update (30-day retention)
- **aaPanel auto-restart** setelah build selesai
- **Health check** dilakukan 5 kali dengan retry delay 3 detik

---

**Created:** 6 September 2026
**Last Updated:** 6 September 2026
