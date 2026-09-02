# BATCH 7A: Rencana Integrasi Permission Engine ke API Routes

> **Status:** DRAFT — Menunggu approval sebelum implementasi
> **Date:** 1 September 2026
> **Scope:** Integrasi `@qalcuity/permissions` ke seluruh API routes di Qalcuity

---

## 1. Architecture Decision Record (ADR)

### ADR-001: Integrasi Permission Engine ke API Routes

**Konteks:**
Package `@qalcuity/permissions` sudah terimplementasi di `packages/permissions/` dengan `PermissionEngine`, permission definitions, dan role definitions. Di sisi lain, helper functions sudah tersedia di `apps/web/lib/permissions.ts` (`hasPermission`, `requirePermission`, `requirePermissionOrRole`). Namun **tidak ada satu pun API route** yang memanggilnya. Semua masih pakai role-based manual check.

**Keputusan:**
Gunakan `requirePermissionOrRole()` sebagai helper utama di API routes, dengan `requirePermission()` sebagai target akhir. Ini memungkinkan gradual rollout dengan backward compatibility.

**Alternatives yang Dipertimbangkan:**

| Alternatif | Kelebihan | Kekurangan | Keputusan |
|-----------|-----------|------------|-----------|
| **A: Modifikasi `requireMutateAuth()`/`requireAdminAuth()`** | Perubahan minimal | Breaking change, tidak granular | ❌ Ditolak |
| **B: Buat helper baru `checkApiPermission(req, perm)`** | Clean API | Duplikasi dengan `requirePermission` yang sudah ada | ❌ Ditolak |
| **C: Gunakan `requirePermissionOrRole()` yang sudah ada** | Backward compatible, sudah ada di codebase | Butuh mapping route→permission | ✅ DIPILIH |
| **D: Permission check di middleware** | Centralized, sekali check | Butuh DB query di middleware (performance), tidak semua route butuh | ⚠️ Partial untuk Phase 2 |

**Alasan Pilihan C:**

1. Helper [`requirePermissionOrRole()`](apps/web/lib/permissions.ts:133) **sudah ada** dan mendukung backward compatibility
2. Helper [`requirePermission()`](apps/web/lib/permissions.ts:108) **sudah ada** untuk pure permission check
3. Tidak perlu membuat baru — tinggal integrasi ke routes
4. Mendukung gradual rollout: mulai dari routes kritis, lalu扩展

### ADR-002: Route-to-Permission Mapping Strategy

**Keputusan:**
Buat mapping file terpisah [`apps/web/lib/route-permissions.ts`](apps/web/lib/route-permissions.ts) yang mendefinisikan permission requirement untuk setiap route. Ini memudahkan maintenance tanpa perlu edit setiap route handler.

**Pattern:**

```typescript
// route-permissions.ts
export const ROUTE_PERMISSIONS: Record<string, { method: string; permission: string }[]> = {
  '/api/finance/invoices': [
    { method: 'GET', permission: 'finance:view' },
    { method: 'POST', permission: 'finance:create' },
    { method: 'PUT', permission: 'finance:edit' },
    { method: 'DELETE', permission: 'finance:delete' },
  ],
  // ... dll
};
```

### ADR-003: Permission Check di Middleware vs Route Handler

**Keputusan:**
- **Phase 1 (Sekarang):** Permission check di **route handler level** — menggunakan helper functions
- **Phase 2 (Future):** Permission check di **middleware level** — untuk route-level protection, membutuhkan caching layer untuk performance

**Alasan:**
- Permission check memerlukan DB query untuk custom roles (via [`getUserPermissions()`](apps/web/lib/permissions.ts:18))
- Middleware berjalan untuk SEMUA request — DB query di middleware = performance bottleneck
- Route handler hanya berjalan saat route spesifik dipanggil — lebih efisien
- Phase 2 bisa tambah Redis/in-memory cache untuk resolve masalah performance

---

## 2. Permission Matrix

### 2.1 Permission Definitions (dari [`packages/permissions/src/permissions.ts`](packages/permissions/src/permissions.ts))

| Module | View | Create | Edit | Delete | Special |
|--------|------|--------|------|--------|---------|
| **Finance** | `finance:view` | `finance:create` | `finance:edit` | `finance:delete` | `finance:approve` |
| **CRM** | `crm:view` | `crm:create` | `crm:edit` | `crm:delete` | `crm:import` |
| **HR** | `hr:view` | `hr:create` | `hr:edit` | `hr:delete` | `hr:approve` |
| **Inventory** | `inventory:view` | `inventory:create` | `inventory:edit` | `inventory:delete` | — |
| **Settings** | `settings:view` | — | `settings:edit` | — | `settings:team`, `settings:billing` |
| **Reports** | `reports:view` | `reports:create` | — | — | — |
| **Analytics** | `analytics:view` | — | `analytics:edit` | — | — |
| **Audit** | `audit:view` | — | — | — | — |

### 2.2 Role vs Permission Matrix (dari [`packages/permissions/src/roles.ts`](packages/permissions/src/roles.ts))

| Permission | SUPERADMIN | ADMIN | MEMBER | VIEWER |
|-----------|-----------|-------|--------|--------|
| `*` (all) | ✅ | ❌ | ❌ | ❌ |
| `finance:view` | ✅ | ✅ | ✅ | ✅ |
| `finance:create` | ✅ | ✅ | ✅ | ❌ |
| `finance:edit` | ✅ | ✅ | ✅ | ❌ |
| `finance:delete` | ✅ | ✅ | ❌ | ❌ |
| `finance:approve` | ✅ | ✅ | ❌ | ❌ |
| `crm:view` | ✅ | ✅ | ✅ | ✅ |
| `crm:create` | ✅ | ✅ | ✅ | ❌ |
| `crm:edit` | ✅ | ✅ | ✅ | ❌ |
| `crm:delete` | ✅ | ✅ | ❌ | ❌ |
| `crm:import` | ✅ | ✅ | ❌ | ❌ |
| `hr:view` | ✅ | ✅ | ✅ | ✅ |
| `hr:create` | ✅ | ✅ | ✅ | ❌ |
| `hr:edit` | ✅ | ✅ | ❌ | ❌ |
| `hr:delete` | ✅ | ✅ | ❌ | ❌ |
| `hr:approve` | ✅ | ✅ | ❌ | ❌ |
| `inventory:view` | ✅ | ✅ | ✅ | ✅ |
| `inventory:create` | ✅ | ✅ | ✅ | ❌ |
| `inventory:edit` | ✅ | ✅ | ✅ | ❌ |
| `inventory:delete` | ✅ | ✅ | ❌ | ❌ |
| `settings:view` | ✅ | ✅ | ✅ | ❌ |
| `settings:edit` | ✅ | ✅ | ❌ | ❌ |
| `settings:team` | ✅ | ✅ | ❌ | ❌ |
| `settings:billing` | ✅ | ✅ | ❌ | ❌ |
| `reports:view` | ✅ | ✅ | ✅ | ✅ |
| `reports:create` | ✅ | ✅ | ❌ | ❌ |
| `analytics:view` | ✅ | ✅ | ✅ | ✅ |
| `analytics:edit` | ✅ | ✅ | ❌ | ❌ |
| `audit:view` | ✅ | ✅ | ❌ | ❌ |

### 2.3 Route-to-Permission Mapping (Lengkap)

#### Finance Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/finance/invoices` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/invoices` | POST | `finance:create` | `requireMutateAuth()` |
| `/api/finance/invoices` | PUT | `finance:edit` | `requireMutateAuth()` |
| `/api/finance/invoices` | DELETE | `finance:delete` | `requireMutateAuth()` |
| `/api/finance/invoices/[id]` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/invoices/[id]` | PUT | `finance:edit` | `requireMutateAuth()` |
| `/api/finance/invoices/[id]` | DELETE | `finance:delete` | `requireMutateAuth()` |
| `/api/finance/accounts` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/accounts` | POST | `finance:create` | `requireMutateAuth()` |
| `/api/finance/payments` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/payments` | POST | `finance:create` | `requireMutateAuth()` |
| `/api/finance/payments/[id]` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/payments/[id]` | PUT | `finance:edit` | `requireMutateAuth()` |
| `/api/finance/payments/process` | POST | `finance:approve` | `requireMutateAuth()` |
| `/api/finance/purchase-orders` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/purchase-orders` | POST | `finance:create` | `requireMutateAuth()` |
| `/api/finance/purchase-orders/[id]` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/purchase-orders/[id]` | PUT | `finance:edit` | `requireMutateAuth()` |
| `/api/finance/quotations` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/quotations` | POST | `finance:create` | `requireMutateAuth()` |
| `/api/finance/quotations/[id]` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/quotations/[id]` | PUT | `finance:edit` | `requireMutateAuth()` |
| `/api/finance/reconciliation` | GET | `finance:view` | `requireAuth()` |
| `/api/finance/reconciliation` | POST | `finance:edit` | `requireMutateAuth()` |

#### CRM Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/crm/contacts` | GET | `crm:view` | `requireAuth()` |
| `/api/crm/contacts` | POST | `crm:create` | `requireMutateAuth()` |
| `/api/crm/contacts` | PUT | `crm:edit` | `requireMutateAuth()` |
| `/api/crm/contacts` | DELETE | `crm:delete` | `requireMutateAuth()` |
| `/api/crm/contacts/[id]` | GET | `crm:view` | `requireAuth()` |
| `/api/crm/contacts/[id]` | PUT | `crm:edit` | `requireMutateAuth()` |
| `/api/crm/contacts/[id]` | DELETE | `crm:delete` | `requireMutateAuth()` |
| `/api/crm/contacts/import` | POST | `crm:import` | `requireMutateAuth()` |
| `/api/crm/deals` | GET | `crm:view` | `requireAuth()` |
| `/api/crm/deals` | POST | `crm:create` | `requireMutateAuth()` |
| `/api/crm/deals/[id]` | GET | `crm:view` | `requireAuth()` |
| `/api/crm/deals/[id]` | PUT | `crm:edit` | `requireMutateAuth()` |
| `/api/crm/leads` | GET | `crm:view` | `requireAuth()` |
| `/api/crm/leads` | POST | `crm:create` | `requireMutateAuth()` |
| `/api/crm/leads/[id]` | GET | `crm:view` | `requireAuth()` |
| `/api/crm/leads/[id]` | PUT | `crm:edit` | `requireMutateAuth()` |
| `/api/crm/leads/import` | POST | `crm:import` | `requireMutateAuth()` |

#### HR Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/hr/employees` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/employees` | POST | `hr:create` | `requireMutateAuth()` |
| `/api/hr/employees` | PUT | `hr:edit` | `requireMutateAuth()` |
| `/api/hr/employees` | DELETE | `hr:delete` | `requireMutateAuth()` |
| `/api/hr/employees/[id]` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/employees/[id]` | PUT | `hr:edit` | `requireMutateAuth()` |
| `/api/hr/employees/[id]` | DELETE | `hr:delete` | `requireMutateAuth()` |
| `/api/hr/attendance` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/attendance` | POST | `hr:create` | `requireMutateAuth()` |
| `/api/hr/attendance/[id]` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/attendance/[id]` | PUT | `hr:edit` | `requireMutateAuth()` |
| `/api/hr/leaves` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/leaves` | POST | `hr:create` | `requireMutateAuth()` |
| `/api/hr/leaves/[id]` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/leaves/[id]` | PUT | `hr:approve` | `requireMutateAuth()` |
| `/api/hr/payroll` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/payroll` | POST | `hr:create` | `requireMutateAuth()` |
| `/api/hr/payroll/[id]` | GET | `hr:view` | `requireAuth()` |
| `/api/hr/payroll/[id]` | PUT | `hr:edit` | `requireMutateAuth()` |

#### Inventory Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/inventory/products` | GET | `inventory:view` | `requireAuth()` |
| `/api/inventory/products` | POST | `inventory:create` | `requireMutateAuth()` |
| `/api/inventory/products/[id]` | GET | `inventory:view` | `requireAuth()` |
| `/api/inventory/products/[id]` | PUT | `inventory:edit` | `requireMutateAuth()` |
| `/api/inventory/products/[id]` | DELETE | `inventory:delete` | `requireMutateAuth()` |
| `/api/inventory/categories` | GET | `inventory:view` | `requireAuth()` |
| `/api/inventory/categories` | POST | `inventory:create` | `requireMutateAuth()` |
| `/api/inventory/suppliers` | GET | `inventory:view` | `requireAuth()` |
| `/api/inventory/suppliers` | POST | `inventory:create` | `requireMutateAuth()` |
| `/api/inventory/suppliers/[id]` | GET | `inventory:view` | `requireAuth()` |
| `/api/inventory/suppliers/[id]` | PUT | `inventory:edit` | `requireMutateAuth()` |

#### Settings Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/settings/team` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/team` | POST | `settings:team` | `requireMutateAuth()` + manual role check |
| `/api/settings/team` | PUT | `settings:team` | `requireMutateAuth()` + manual role check |
| `/api/settings/team` | DELETE | `settings:team` | `requireMutateAuth()` |
| `/api/settings/company` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/company` | PUT | `settings:edit` | `requireMutateAuth()` |
| `/api/settings/security` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/security` | PUT | `settings:edit` | `requireMutateAuth()` |
| `/api/settings/roles` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/roles` | POST | `settings:team` | `requireMutateAuth()` |
| `/api/settings/roles/[id]` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/roles/[id]` | PUT | `settings:team` | `requireMutateAuth()` |
| `/api/settings/roles/[id]` | DELETE | `settings:team` | `requireMutateAuth()` |
| `/api/settings/industry` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/industry` | PUT | `settings:edit` | `requireMutateAuth()` |
| `/api/settings/notifications` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/notifications` | PUT | `settings:edit` | `requireMutateAuth()` |
| `/api/settings/integrations` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/integrations` | POST | `settings:edit` | `requireMutateAuth()` |
| `/api/settings/custom-fields` | GET | `settings:view` | `requireAuth()` |
| `/api/settings/custom-fields` | POST | `settings:edit` | `requireMutateAuth()` |
| `/api/settings/profile` | GET | — (own data) | `requireAuth()` |
| `/api/settings/profile` | PUT | — (own data) | `requireAuth()` |

#### Reports & Analytics Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/reports` | GET | `reports:view` | `requireAuth()` |
| `/api/analytics/dashboard` | GET | `analytics:view` | `requireAuth()` |
| `/api/analytics/charts` | GET | `analytics:view` | `requireAuth()` |
| `/api/analytics/charts` | POST | `analytics:edit` | `requireMutateAuth()` |
| `/api/analytics/kpi` | GET | `analytics:view` | `requireAuth()` |
| `/api/analytics/kpi` | POST | `analytics:edit` | `requireMutateAuth()` |
| `/api/analytics/reports` | GET | `analytics:view` | `requireAuth()` |
| `/api/analytics/reports` | POST | `analytics:edit` | `requireMutateAuth()` |

#### Audit Module

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/audit/logs` | GET | `audit:view` | `requireAuth()` |

#### Platform Module (SUPERADMIN only)

| Route | Method | Permission Required | Current Auth |
|-------|--------|-------------------|--------------|
| `/api/platform/stats` | GET | `*` (superadmin) | Middleware check |
| `/api/platform/tenants` | GET | `*` (superadmin) | Middleware check |
| `/api/platform/tenants` | POST | `*` (superadmin) | Middleware check |
| `/api/platform/tenants/[id]` | GET | `*` (superadmin) | Middleware check |
| `/api/platform/tenants/[id]` | PUT | `*` (superadmin) | Middleware check |

---

## 3. Integration Strategy

### 3.1 Current State Analysis

```
┌──────────────────────────────────────────────────────┐
│                CURRENT AUTH FLOW                       │
│                                                       │
│  Request → Middleware (token check + role path)       │
│         → Route Handler                               │
│            → requireAuth() → basic auth check          │
│            → requireMutateAuth() → VIEWER block        │
│            → requireAdminAuth() → ADMIN+ block         │
│            → Manual role check (inline)                │
│                                                       │
│  Permission Engine: TIDAK DIGUNAKAN                   │
└──────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────┐
│                TARGET AUTH FLOW                        │
│                                                       │
│  Request → Middleware (token check + role path)       │
│         → Route Handler                               │
│            → requireAuth() → basic auth check          │
│            → requirePermissionOrRole(                 │
│                  'finance:create',                    │
│                  role => role !== 'VIEWER'            │
│              ) → permission check + role fallback      │
│                                                       │
│  Permission Engine: ACTIVE + BACKWARD COMPATIBLE       │
└──────────────────────────────────────────────────────┘
```

### 3.2 Helper Function Migration

**Current Pattern (di semua routes):**

```typescript
// GET routes
const { tenantId } = await requireAuth();

// POST/PUT/DELETE routes
const { userId, tenantId } = await requireMutateAuth();

// Admin-only routes (inline)
if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') { ... }
```

**New Pattern:**

```typescript
import { requirePermissionOrRole, requirePermission } from '@/lib/permissions';
import { PERMISSIONS } from '@qalcuity/permissions';

// GET routes — permission check
const session = await requirePermission(PERMISSIONS.FINANCE_VIEW);
const tenantId = session.user.tenantId;

// POST/PUT/DELETE routes — permission + role fallback
const session = await requirePermissionOrRole(
    PERMISSIONS.FINANCE_CREATE,
    (role) => role !== 'VIEWER'  // backward compatible fallback
);
const tenantId = session.user.tenantId;
const userId = session.user.id;

// Admin-only routes — pure permission check
const session = await requirePermission(PERMISSIONS.SETTINGS_TEAM);
```

### 3.3 Route Mapping File

Buat [`apps/web/lib/route-permissions.ts`](apps/web/lib/route-permissions.ts) sebagai single source of truth:

```typescript
import { PERMISSIONS } from '@qalcuity/permissions';

/**
 * Route-to-Permission mapping.
 * Key: URL path prefix
 * Value: Array of {method, permission} pairs
 *
 * Digunakan untuk:
 * 1. Centralized permission configuration
 * 2. Route-level permission documentation
 * 3. Future middleware integration
 */
export const ROUTE_PERMISSIONS: Record<string, Record<string, string>> = {
    // Finance
    '/api/finance/invoices': {
        GET: PERMISSIONS.FINANCE_VIEW,
        POST: PERMISSIONS.FINANCE_CREATE,
        PUT: PERMISSIONS.FINANCE_EDIT,
        DELETE: PERMISSIONS.FINANCE_DELETE,
    },
    '/api/finance/accounts': {
        GET: PERMISSIONS.FINANCE_VIEW,
        POST: PERMISSIONS.FINANCE_CREATE,
        PUT: PERMISSIONS.FINANCE_EDIT,
        DELETE: PERMISSIONS.FINANCE_DELETE,
    },
    '/api/finance/payments': {
        GET: PERMISSIONS.FINANCE_VIEW,
        POST: PERMISSIONS.FINANCE_CREATE,
    },
    '/api/finance/payments/process': {
        POST: PERMISSIONS.FINANCE_APPROVE,
    },
    '/api/finance/purchase-orders': {
        GET: PERMISSIONS.FINANCE_VIEW,
        POST: PERMISSIONS.FINANCE_CREATE,
    },
    '/api/finance/quotations': {
        GET: PERMISSIONS.FINANCE_VIEW,
        POST: PERMISSIONS.FINANCE_CREATE,
    },
    '/api/finance/reconciliation': {
        GET: PERMISSIONS.FINANCE_VIEW,
        POST: PERMISSIONS.FINANCE_EDIT,
    },

    // CRM
    '/api/crm/contacts': {
        GET: PERMISSIONS.CRM_VIEW,
        POST: PERMISSIONS.CRM_CREATE,
        PUT: PERMISSIONS.CRM_EDIT,
        DELETE: PERMISSIONS.CRM_DELETE,
    },
    '/api/crm/contacts/import': {
        POST: PERMISSIONS.CRM_IMPORT,
    },
    '/api/crm/deals': {
        GET: PERMISSIONS.CRM_VIEW,
        POST: PERMISSIONS.CRM_CREATE,
    },
    '/api/crm/leads': {
        GET: PERMISSIONS.CRM_VIEW,
        POST: PERMISSIONS.CRM_CREATE,
    },
    '/api/crm/leads/import': {
        POST: PERMISSIONS.CRM_IMPORT,
    },

    // HR
    '/api/hr/employees': {
        GET: PERMISSIONS.HR_VIEW,
        POST: PERMISSIONS.HR_CREATE,
        PUT: PERMISSIONS.HR_EDIT,
        DELETE: PERMISSIONS.HR_DELETE,
    },
    '/api/hr/attendance': {
        GET: PERMISSIONS.HR_VIEW,
        POST: PERMISSIONS.HR_CREATE,
    },
    '/api/hr/leaves': {
        GET: PERMISSIONS.HR_VIEW,
        POST: PERMISSIONS.HR_CREATE,
    },
    '/api/hr/payroll': {
        GET: PERMISSIONS.HR_VIEW,
        POST: PERMISSIONS.HR_CREATE,
    },

    // Inventory
    '/api/inventory/products': {
        GET: PERMISSIONS.INVENTORY_VIEW,
        POST: PERMISSIONS.INVENTORY_CREATE,
    },
    '/api/inventory/categories': {
        GET: PERMISSIONS.INVENTORY_VIEW,
        POST: PERMISSIONS.INVENTORY_CREATE,
    },
    '/api/inventory/suppliers': {
        GET: PERMISSIONS.INVENTORY_VIEW,
        POST: PERMISSIONS.INVENTORY_CREATE,
    },

    // Settings
    '/api/settings/team': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        POST: PERMISSIONS.SETTINGS_TEAM,
        PUT: PERMISSIONS.SETTINGS_TEAM,
        DELETE: PERMISSIONS.SETTINGS_TEAM,
    },
    '/api/settings/company': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        PUT: PERMISSIONS.SETTINGS_EDIT,
    },
    '/api/settings/security': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        PUT: PERMISSIONS.SETTINGS_EDIT,
    },
    '/api/settings/roles': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        POST: PERMISSIONS.SETTINGS_TEAM,
    },
    '/api/settings/industry': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        PUT: PERMISSIONS.SETTINGS_EDIT,
    },
    '/api/settings/notifications': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        PUT: PERMISSIONS.SETTINGS_EDIT,
    },
    '/api/settings/integrations': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        POST: PERMISSIONS.SETTINGS_EDIT,
    },
    '/api/settings/custom-fields': {
        GET: PERMISSIONS.SETTINGS_VIEW,
        POST: PERMISSIONS.SETTINGS_EDIT,
    },

    // Reports
    '/api/reports': {
        GET: PERMISSIONS.REPORTS_VIEW,
    },

    // Analytics
    '/api/analytics/dashboard': {
        GET: PERMISSIONS.ANALYTICS_VIEW,
    },
    '/api/analytics/charts': {
        GET: PERMISSIONS.ANALYTICS_VIEW,
        POST: PERMISSIONS.ANALYTICS_EDIT,
    },
    '/api/analytics/kpi': {
        GET: PERMISSIONS.ANALYTICS_VIEW,
        POST: PERMISSIONS.ANALYTICS_EDIT,
    },
    '/api/analytics/reports': {
        GET: PERMISSIONS.ANALYTICS_VIEW,
        POST: PERMISSIONS.ANALYTICS_EDIT,
    },

    // Audit
    '/api/audit/logs': {
        GET: PERMISSIONS.AUDIT_VIEW,
    },
};

/**
 * Lookup permission untuk route + method.
 * Match dilakukan dengan longest prefix matching.
 */
export function getRoutePermission(pathname: string, method: string): string | null {
    // Sort keys by length descending for longest-prefix-first matching
    const sortedKeys = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (pathname.startsWith(key)) {
            const methodMap = ROUTE_PERMISSIONS[key];
            return methodMap[method] || null;
        }
    }

    return null;
}
```

### 3.4 Performance Considerations

**Current:**
- `requireAuth()`: 1 DB lookup (session)
- `requireMutateAuth()`: 1 DB lookup (session) + role string check (in-memory)

**New:**
- `requirePermission()`: 1 DB lookup (session) + 1 DB lookup (custom role) + permission check (in-memory)
- For system roles (99% of users): 1 DB lookup (session) + permission check (in-memory) — **no additional DB query**

**Optimization Strategy:**
1. **Short-circuit for system roles:** Jika `SYSTEM_ROLE_PERMISSIONS[role]` ada, skip DB query
2. **Future Phase 2:** Tambah Redis cache untuk custom role permissions (TTL 5 menit)
3. **Future Phase 3:** Permission check di middleware dengan cached permissions

---

## 4. Migration Plan

### Phase 1: Infrastructure Setup (Foundation)

> Membuat mapping file dan memastikan helper sudah siap.

| # | Task | File | Description |
|---|------|------|-------------|
| 1.1 | Buat route-permissions mapping | [`apps/web/lib/route-permissions.ts`](apps/web/lib/route-permissions.ts) | Centralized route→permission mapping |
| 1.2 | Review & verify helpers | [`apps/web/lib/permissions.ts`](apps/web/lib/permissions.ts) | Pastikan `requirePermission` dan `requirePermissionOrRole` berfungsi dengan benar |
| 1.3 | Tambah re-export dari session.ts | [`apps/web/lib/session.ts`](apps/web/lib/session.ts) | Re-export `requirePermission` dari permissions.ts untuk backward compatibility |

### Phase 2: Core Module Migration (Finance + CRM)

> Migrate routes yang paling kritis dulu. Test thoroughly sebelum lanjut.

| # | Task | Files | Description |
|---|------|-------|-------------|
| 2.1 | Migrate finance/invoices | [`apps/web/app/api/finance/invoices/route.ts`](apps/web/app/api/finance/invoices/route.ts) | GET→finance:view, POST→finance:create, PUT→finance:edit, DELETE→finance:delete |
| 2.2 | Migrate finance/invoices/[id] | [`apps/web/app/api/finance/invoices/[id]/route.ts`](apps/web/app/api/finance/invoices/[id]/route.ts) | GET→finance:view, PUT→finance:edit, DELETE→finance:delete |
| 2.3 | Migrate finance/accounts | [`apps/web/app/api/finance/accounts/route.ts`](apps/web/app/api/finance/accounts/route.ts) | GET→finance:view, POST→finance:create |
| 2.4 | Migrate finance/payments | [`apps/web/app/api/finance/payments/route.ts`](apps/web/app/api/finance/payments/route.ts) | GET→finance:view, POST→finance:create |
| 2.5 | Migrate finance/payments/[id] | [`apps/web/app/api/finance/payments/[id]/route.ts`](apps/web/app/api/finance/payments/[id]/route.ts) | GET→finance:view, PUT→finance:edit |
| 2.6 | Migrate finance/payments/process | [`apps/web/app/api/finance/payments/process/route.ts`](apps/web/app/api/finance/payments/process/route.ts) | POST→finance:approve |
| 2.7 | Migrate finance/purchase-orders | [`apps/web/app/api/finance/purchase-orders/route.ts`](apps/web/app/api/finance/purchase-orders/route.ts) | GET→finance:view, POST→finance:create |
| 2.8 | Migrate finance/purchase-orders/[id] | [`apps/web/app/api/finance/purchase-orders/[id]/route.ts`](apps/web/app/api/finance/purchase-orders/[id]/route.ts) | GET→finance:view, PUT→finance:edit |
| 2.9 | Migrate finance/quotations | [`apps/web/app/api/finance/quotations/route.ts`](apps/web/app/api/finance/quotations/route.ts) | GET→finance:view, POST→finance:create |
| 2.10 | Migrate finance/quotations/[id] | [`apps/web/app/api/finance/quotations/[id]/route.ts`](apps/web/app/api/finance/quotations/[id]/route.ts) | GET→finance:view, PUT→finance:edit |
| 2.11 | Migrate finance/reconciliation | [`apps/web/app/api/finance/reconciliation/route.ts`](apps/web/app/api/finance/reconciliation/route.ts) | GET→finance:view, POST→finance:edit |
| 2.12 | Migrate crm/contacts | [`apps/web/app/api/crm/contacts/route.ts`](apps/web/app/api/crm/contacts/route.ts) | GET→crm:view, POST→crm:create, PUT→crm:edit, DELETE→crm:delete |
| 2.13 | Migrate crm/contacts/[id] | [`apps/web/app/api/crm/contacts/[id]/route.ts`](apps/web/app/api/crm/contacts/[id]/route.ts) | GET→crm:view, PUT→crm:edit, DELETE→crm:delete |
| 2.14 | Migrate crm/contacts/import | [`apps/web/app/api/crm/contacts/import/route.ts`](apps/web/app/api/crm/contacts/import/route.ts) | POST→crm:import |
| 2.15 | Migrate crm/deals + leads | [`apps/web/app/api/crm/deals/`](apps/web/app/api/crm/deals/), [`apps/web/app/api/crm/leads/`](apps/web/app/api/crm/leads/) | Standard CRUD mapping |

### Phase 3: HR + Inventory Module Migration

| # | Task | Files | Description |
|---|------|-------|-------------|
| 3.1 | Migrate hr/employees | [`apps/web/app/api/hr/employees/route.ts`](apps/web/app/api/hr/employees/route.ts) | GET→hr:view, POST→hr:create, PUT→hr:edit, DELETE→hr:delete |
| 3.2 | Migrate hr/employees/[id] | [`apps/web/app/api/hr/employees/[id]/route.ts`](apps/web/app/api/hr/employees/[id]/route.ts) | Standard mapping |
| 3.3 | Migrate hr/attendance | [`apps/web/app/api/hr/attendance/route.ts`](apps/web/app/api/hr/attendance/route.ts) | GET→hr:view, POST→hr:create |
| 3.4 | Migrate hr/leaves | [`apps/web/app/api/hr/leaves/route.ts`](apps/web/app/api/hr/leaves/route.ts) | GET→hr:view, POST→hr:create |
| 3.5 | Migrate hr/leaves/[id] | [`apps/web/app/api/hr/leaves/[id]/route.ts`](apps/web/app/api/hr/leaves/[id]/route.ts) | PUT→hr:approve |
| 3.6 | Migrate hr/payroll | [`apps/web/app/api/hr/payroll/route.ts`](apps/web/app/api/hr/payroll/route.ts) | GET→hr:view, POST→hr:create |
| 3.7 | Migrate inventory/products | [`apps/web/app/api/inventory/products/route.ts`](apps/web/app/api/inventory/products/route.ts) | Standard mapping |
| 3.8 | Migrate inventory/products/[id] | [`apps/web/app/api/inventory/products/[id]/route.ts`](apps/web/app/api/inventory/products/[id]/route.ts) | Standard mapping |
| 3.9 | Migrate inventory/categories | [`apps/web/app/api/inventory/categories/route.ts`](apps/web/app/api/inventory/categories/route.ts) | Standard mapping |
| 3.10 | Migrate inventory/suppliers | [`apps/web/app/api/inventory/suppliers/route.ts`](apps/web/app/api/inventory/suppliers/route.ts) | Standard mapping |

### Phase 4: Settings Module Migration

| # | Task | Files | Description |
|---|------|-------|-------------|
| 4.1 | Migrate settings/team | [`apps/web/app/api/settings/team/route.ts`](apps/web/app/api/settings/team/route.ts) | GET→settings:view, POST/PUT/DELETE→settings:team |
| 4.2 | Migrate settings/company | [`apps/web/app/api/settings/company/route.ts`](apps/web/app/api/settings/company/route.ts) | GET→settings:view, PUT→settings:edit |
| 4.3 | Migrate settings/security | [`apps/web/app/api/settings/security/route.ts`](apps/web/app/api/settings/security/route.ts) | GET→settings:view, PUT→settings:edit |
| 4.4 | Migrate settings/roles | [`apps/web/app/api/settings/roles/route.ts`](apps/web/app/api/settings/roles/route.ts) | GET→settings:view, POST→settings:team |
| 4.5 | Migrate settings/roles/[id] | [`apps/web/app/api/settings/roles/[id]/route.ts`](apps/web/app/api/settings/roles/[id]/route.ts) | Standard mapping |
| 4.6 | Migrate settings/industry | [`apps/web/app/api/settings/industry/route.ts`](apps/web/app/api/settings/industry/route.ts) | GET→settings:view, PUT→settings:edit |
| 4.7 | Migrate settings/notifications | [`apps/web/app/api/settings/notifications/route.ts`](apps/web/app/api/settings/notifications/route.ts) | Standard mapping |
| 4.8 | Migrate settings/integrations | [`apps/web/app/api/settings/integrations/route.ts`](apps/web/app/api/settings/integrations/route.ts) | Standard mapping |
| 4.9 | Migrate settings/custom-fields | [`apps/web/app/api/settings/custom-fields/route.ts`](apps/web/app/api/settings/custom-fields/route.ts) | Standard mapping |

### Phase 5: Reports + Analytics + Audit Migration

| # | Task | Files | Description |
|---|------|-------|-------------|
| 5.1 | Migrate reports | [`apps/web/app/api/reports/route.ts`](apps/web/app/api/reports/route.ts) | GET→reports:view |
| 5.2 | Migrate analytics routes | [`apps/web/app/api/analytics/*/route.ts`](apps/web/app/api/analytics/) | Standard mapping |
| 5.3 | Migrate audit/logs | [`apps/web/app/api/audit/logs/route.ts`](apps/web/app/api/audit/logs/route.ts) | GET→audit:view |

### Phase 6: Cleanup & Documentation

| # | Task | Files | Description |
|---|------|-------|-------------|
| 6.1 | Remove unused role checks | [`apps/web/lib/session.ts`](apps/web/lib/session.ts) | Deprecate `requireMutateAuth()` dan `requireAdminAuth()` (tapi jangan hapus dulu) |
| 6.2 | Update AGENT.md | [`AGENT.md`](AGENT.md) | Update Section 6.6 RBAC Pattern |
| 6.3 | Update CURRENT.md | [`CURRENT.md`](CURRENT.md) | Update status integrasi |
| 6.4 | Run TypeScript check | — | `npx tsc --noEmit` |
| 6.5 | Run E2E tests | [`apps/web/__tests__/e2e-test.ts`](apps/web/__tests__/e2e-test.ts) | Pastikan tidak ada regression |

---

## 5. Risk Assessment

### 5.1 Risks

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|------|----------|------------|--------|------------|
| R1 | **User kehilangan akses** — Permission engine salah interpretasi role, user yang sebelumnya bisa akses jadi tidak bisa | 🔴 High | Low | User tidak bisa kerja | `requirePermissionOrRole()` dengan role fallback — jika permission check gagal, fallback ke role-based check |
| R2 | **Performance degradation** — Setiap request tambah DB query untuk custom role | 🟠 Medium | Medium | Response time naik | Short-circuit untuk system roles (skip DB query), Future: Redis cache |
| R3 | **Breaking change** — Error handling berubah, client expect format response yang berbeda | 🟠 Medium | Low | API errors | Permission errors return 403 (bukan 500), error message format konsisten |
| R4 | **Custom role tidak ter-load** — `customRole` field di DB null atau corrupt | 🟠 Medium | Low | Permission check gagal | Fallback ke system role permissions di [`getUserPermissions()`](apps/web/lib/permissions.ts:18) |
| R5 | **Middleware vs Route mismatch** — Middleware allow tapi route deny, atau sebaliknya | 🟡 Low | Low | Confusing UX | Konsisten: middleware = coarse-grained (role-based path), route = fine-grained (permission-based) |
| R6 | **N+1 permission check** — Multiple DB queries dalam satu request | 🟡 Low | Low | Performance | Permission result bisa di-cache dalam request scope (Promise.all atau lazy eval) |

### 5.2 Rollback Strategy

Jika ada masalah setelah deployment:

1. **Quick Rollback:** Revert `requirePermissionOrRole()` calls ke `requireMutateAuth()` / `requireAdminAuth()`
2. **Config Rollback:** Tambah feature flag `ENABLE_PERMISSION_ENGINE=false` di environment variable
3. **Gradual Rollback:** Disable per-module (e.g., disable hanya finance, biarkan module lain jalan)

### 5.3 Testing Strategy

Untuk SETIAP phase migration:

1. **Happy Path Test:**
   - User dengan permission yang tepat → akses diberikan
   - User tanpa permission → akses ditolak (403)

2. **Backward Compatibility Test:**
   - User dengan role MEMBER → masih bisa CRUD seperti sebelumnya
   - User dengan role VIEWER → masih hanya bisa view

3. **Custom Role Test (if applicable):**
   - User dengan custom role → permission sesuai custom role

4. **Regression Test:**
   - Jalankan `npx tsc --noEmit` — pastikan tidak ada TypeScript errors
   - Jalankan E2E tests — pastikan semua pass
   - Test manual di browser — pastikan UI berfungsi normal

---

## 6. Code Changes Summary

### 6.1 Files to CREATE

| File | Purpose |
|------|---------|
| [`apps/web/lib/route-permissions.ts`](apps/web/lib/route-permissions.ts) | Route→permission mapping central |

### 6.2 Files to MODIFY

| File | Change |
|------|--------|
| [`apps/web/lib/session.ts`](apps/web/lib/session.ts) | Tambah re-export `requirePermission` |
| [`apps/web/app/api/finance/invoices/route.ts`](apps/web/app/api/finance/invoices/route.ts) | Ganti `requireMutateAuth()` → `requirePermissionOrRole()` |
| [`apps/web/app/api/finance/invoices/[id]/route.ts`](apps/web/app/api/finance/invoices/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/accounts/route.ts`](apps/web/app/api/finance/accounts/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/payments/route.ts`](apps/web/app/api/finance/payments/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/payments/[id]/route.ts`](apps/web/app/api/finance/payments/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/payments/process/route.ts`](apps/web/app/api/finance/payments/process/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/purchase-orders/route.ts`](apps/web/app/api/finance/purchase-orders/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/purchase-orders/[id]/route.ts`](apps/web/app/api/finance/purchase-orders/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/quotations/route.ts`](apps/web/app/api/finance/quotations/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/quotations/[id]/route.ts`](apps/web/app/api/finance/quotations/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/finance/reconciliation/route.ts`](apps/web/app/api/finance/reconciliation/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/contacts/route.ts`](apps/web/app/api/crm/contacts/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/contacts/[id]/route.ts`](apps/web/app/api/crm/contacts/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/contacts/import/route.ts`](apps/web/app/api/crm/contacts/import/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/deals/route.ts`](apps/web/app/api/crm/deals/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/deals/[id]/route.ts`](apps/web/app/api/crm/deals/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/leads/route.ts`](apps/web/app/api/crm/leads/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/leads/[id]/route.ts`](apps/web/app/api/crm/leads/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/crm/leads/import/route.ts`](apps/web/app/api/crm/leads/import/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/employees/route.ts`](apps/web/app/api/hr/employees/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/employees/[id]/route.ts`](apps/web/app/api/hr/employees/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/attendance/route.ts`](apps/web/app/api/hr/attendance/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/attendance/[id]/route.ts`](apps/web/app/api/hr/attendance/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/leaves/route.ts`](apps/web/app/api/hr/leaves/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/leaves/[id]/route.ts`](apps/web/app/api/hr/leaves/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/payroll/route.ts`](apps/web/app/api/hr/payroll/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/hr/payroll/[id]/route.ts`](apps/web/app/api/hr/payroll/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/inventory/products/route.ts`](apps/web/app/api/inventory/products/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/inventory/products/[id]/route.ts`](apps/web/app/api/inventory/products/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/inventory/categories/route.ts`](apps/web/app/api/inventory/categories/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/inventory/suppliers/route.ts`](apps/web/app/api/inventory/suppliers/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/inventory/suppliers/[id]/route.ts`](apps/web/app/api/inventory/suppliers/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/team/route.ts`](apps/web/app/api/settings/team/route.ts) | Ganti manual role check → permission |
| [`apps/web/app/api/settings/company/route.ts`](apps/web/app/api/settings/company/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/security/route.ts`](apps/web/app/api/settings/security/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/roles/route.ts`](apps/web/app/api/settings/roles/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/roles/[id]/route.ts`](apps/web/app/api/settings/roles/[id]/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/industry/route.ts`](apps/web/app/api/settings/industry/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/notifications/route.ts`](apps/web/app/api/settings/notifications/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/integrations/route.ts`](apps/web/app/api/settings/integrations/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/settings/custom-fields/route.ts`](apps/web/app/api/settings/custom-fields/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/reports/route.ts`](apps/web/app/api/reports/route.ts) | Ganti auth pattern |
| [`apps/web/app/api/analytics/*/route.ts`](apps/web/app/api/analytics/) | Ganti auth pattern |
| [`apps/web/app/api/audit/logs/route.ts`](apps/web/app/api/audit/logs/route.ts) | Ganti auth pattern |
| [`AGENT.md`](AGENT.md) | Update RBAC pattern documentation |
| [`CURRENT.md`](CURRENT.md) | Update status |

### 6.3 Files to NOT TOUCH

| File | Reason |
|------|--------|
| [`packages/permissions/src/engine.ts`](packages/permissions/src/engine.ts) | Permission engine sudah berfungsi dengan benar |
| [`packages/permissions/src/permissions.ts`](packages/permissions/src/permissions.ts) | Permission definitions sudah lengkap |
| [`packages/permissions/src/roles.ts`](packages/permissions/src/roles.ts) | Role definitions sudah benar |
| [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts) | Auth config — Do Not Touch |
| [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts) | Audit trail — Do Not Touch |
| [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) | Schema — tidak perlu perubahan |
| [`apps/web/middleware.ts`](apps/web/middleware.ts) | Middleware — Phase 2 (bukan sekarang) |

---

## 7. Code Pattern Reference

### Before (Current Pattern)

```typescript
// apps/web/app/api/finance/invoices/route.ts — POST
export async function POST(request: Request) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        // ... business logic
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
```

### After (New Pattern with Backward Compatibility)

```typescript
// apps/web/app/api/finance/invoices/route.ts — POST
import { requirePermissionOrRole } from '@/lib/permissions';
import { PERMISSIONS } from '@qalcuity/permissions';

export async function POST(request: Request) {
    try {
        const session = await requirePermissionOrRole(
            PERMISSIONS.FINANCE_CREATE,
            (role) => role !== 'VIEWER'  // backward compatible fallback
        );
        const userId = session.user.id;
        const tenantId = session.user.tenantId;

        // ... business logic (unchanged)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (message.startsWith('Forbidden')) {
            return NextResponse.json({ success: false, error: message }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
```

### Admin-Only Pattern (Settings Team)

**Before:**
```typescript
const { userId, tenantId, role: callerRole } = await requireMutateAuth();
if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Only admins can invite team members' }, { status: 403 });
}
```

**After:**
```typescript
const session = await requirePermission(PERMISSIONS.SETTINGS_TEAM);
const userId = session.user.id;
const tenantId = session.user.tenantId;
// No manual role check needed — permission engine handles it
```

---

## 8. Dependency Graph

```
Phase 1: Infrastructure
  └── 1.1 Buat route-permissions.ts
  └── 1.2 Verify helpers
  └── 1.3 Update session.ts exports

Phase 2: Core Modules (Finance + CRM) — depends on Phase 1
  └── 2.1-2.11 Finance routes (11 files)
  └── 2.12-2.15 CRM routes (4 files)

Phase 3: HR + Inventory — depends on Phase 1
  └── 3.1-3.6 HR routes (6 files)
  └── 3.7-3.10 Inventory routes (4 files)

Phase 4: Settings — depends on Phase 1
  └── 4.1-4.9 Settings routes (9 files)

Phase 5: Reports + Analytics + Audit — depends on Phase 1
  └── 5.1-5.3 Reports/Analytics/Audit routes (3+ files)

Phase 6: Cleanup — depends on Phase 2-5
  └── 6.1-6.5 Documentation + Testing

Note: Phase 2, 3, 4, 5 bisa dilakukan PARALLEL
      asalkan Phase 1 sudah selesai
```

---

## 9. Future Enhancements (Phase 2 — Beyond This Plan)

1. **Middleware-level permission check** — dengan Redis cache
2. **Permission audit logging** — log semua permission check (granted/denied)
3. **Dynamic permission reload** — tanpa restart server
4. **Permission groups** — group permissions untuk easier management
5. **Time-based permissions** — permission expire after certain time
6. **Conditional permissions** — permission depends on resource ownership
7. **API rate limiting per permission** — different limits per permission level

---

**Document Version:** 1.0
**Last Updated:** 1 September 2026
**Status:** DRAFT — Menunggu approval
