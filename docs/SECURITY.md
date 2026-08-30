# 🔒 Qalcuity — Security Architecture

> **Last Updated:** 30 Agustus 2026
> **Current Version:** v1.0.0-beta.1

---

## 📋 Daftar Isi

1. [Security Overview](#1-security-overview)
2. [Authentication](#2-authentication)
3. [Authorization (Permission Engine)](#3-authorization-permission-engine)
4. [Tenant Isolation](#4-tenant-isolation)
5. [Input Validation](#5-input-validation)
6. [Audit Trail](#6-audit-trail)
7. [API Security Checklist](#7-api-security-checklist)
8. [Known Security Gaps](#8-known-security-gaps)
9. [Data Protection](#9-data-protection)
10. [Security Checklist](#10-security-checklist)

---

## 1. Security Overview

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Middleware RBAC                                     │
│ → Route protection by path prefix                           │
│ → Redirect unauthorized users                               │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: API Route Auth + RBAC                              │
│ → Session validation (NextAuth JWT)                         │
│ → Role-based access check                                   │
│ → Tenant isolation filter                                   │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Input Validation                                   │
│ → Zod schema validation                                     │
│ → HTML sanitization                                         │
│ → Rate limiting per IP                                      │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Data Access                                        │
│ → tenantId filter on every query                            │
│ → Prisma parameterized queries (SQL injection prevention)   │
│ → Decimal types for monetary values                         │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: UI Rendering                                       │
│ → Role-based button/link visibility                         │
│ → Disable actions for unauthorized roles                    │
│ → React auto-escaping (XSS prevention)                      │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Status

| Layer | Implementation | Status |
|-------|---------------|--------|
| **Authentication** | NextAuth.js 4.24 (JWT strategy) | ✅ Implemented |
| **Authorization** | RBAC (4 roles, 3-layer defense) → **Permission Engine (v2.0)** | ✅ Implemented → 📋 Planned |
| **Tenant Isolation** | Application-level (tenantId filter) | ✅ Implemented |
| **Rate Limiting** | In-memory per IP | ✅ Implemented |
| **Password Hashing** | bcryptjs | ✅ Implemented |
| **Input Sanitization** | Custom sanitizer | ✅ Implemented |
| **Audit Trail** | Prisma AuditLog model | ✅ Implemented |
| **File Upload** | Basic upload + validation | ✅ Basic |
| **HTTPS** | Infrastructure-level (not in app) | 🔲 DevOps |
| **Redis Rate Limiting** | Not yet (current: in-memory) | 🔲 Planned |
| **CORS** | Next.js defaults | ⚠️ Needs explicit config |
| **CSP Headers** | Not configured | 🔲 Planned |

---

## 2. Authentication

### Implementation

- **Library:** NextAuth.js 4.24
- **Strategy:** JWT (not database sessions)
- **Provider:** CredentialsProvider (email + password)
- **Config:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts)

### Auth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │ ──→ │ NextAuth │ ──→ │  Verify  │ ──→ │  Issue   │
│  Form    │     │ Provider │     │ Password │     │  JWT     │
│          │     │          │     │ (bcrypt) │     │  Token   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │  Reject  │
                                    │  if      │
                                    │  invalid │
                                    └──────────┘
```

### JWT Token Payload

```typescript
{
  sub: string;        // User ID
  email: string;      // User email
  name: string;       // User name
  role: string;       // SUPERADMIN | ADMIN | MEMBER | VIEWER
  tenantId: string;   // Tenant ID
  iat: number;        // Issued at
  exp: number;        // Expiration
}
```

### Password Security

| Aspect | Implementation |
|--------|---------------|
| **Hashing** | bcryptjs with salt rounds |
| **Minimum length** | Enforced at registration |
| **Storage** | `passwordHash` field (never plain text) |
| **Transmission** | HTTPS (infrastructure-level) |

### Registration Flow

```
POST /api/auth/register
      │
      ▼
1. Validate input (email, password, company name)
      │
      ▼
2. Check email uniqueness
      │
      ▼
3. Create Tenant (company)
      │
      ▼
4. Create User (SUPERADMIN role)
      │
      ▼
5. Hash password with bcryptjs
      │
      ▼
6. Return success (user can now login)
```

### Custom Pages

| Page | Path | Purpose |
|------|------|---------|
| Sign In | `/login` | Custom login form |
| Error | `/login` | Login error display |
| Register | `/register` | New tenant registration |

---

## 3. Authorization (Permission Engine)

### Current State (v1.0.0-beta.1) — RBAC with 4 Hardcoded Roles

```
SUPERADMIN  (highest — platform-wide)
    │
    ▼
  ADMIN      (tenant-wide)
    │
    ▼
  MEMBER     (department-level)
    │
    ▼
  VIEWER     (lowest — read-only)
```

**Role Permissions Matrix (Current):**

| Feature | SUPERADMIN | ADMIN | MEMBER | VIEWER |
|---------|:----------:|:-----:|:------:|:------:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **CRM** (read) | ✅ | ✅ | ✅ | ✅ |
| **CRM** (write) | ✅ | ✅ | ✅ | ❌ |
| **Finance** (read) | ✅ | ✅ | ✅ | ✅ |
| **Finance** (write) | ✅ | ✅ | ✅ | ❌ |
| **Inventory** (read) | ✅ | ✅ | ✅ | ✅ |
| **Inventory** (write) | ✅ | ✅ | ✅ | ❌ |
| **HR** (read) | ✅ | ✅ | ✅ | ✅ |
| **HR** (write) | ✅ | ✅ | ✅ | ❌ |
| **Reports** | ✅ | ✅ | ✅ | ✅ |
| **AI Features** | ✅ | ✅ | ✅ | ✅ |
| **Billing** | ✅ | ✅ | ❌ | ❌ |
| **Settings** | ✅ | ✅ | ❌ | ❌ |
| **Audit Trail** | ✅ | ✅ | ❌ | ❌ |

### Target State (v2.0) — Granular Permission Engine

> **See [ADR-013: Permission Engine Architecture](docs/DECISIONS.md#adr-013-permission-engine-architecture) for full decision record.**

**Permission Model:**

```
User → Membership → Role → Permission → Scope
                                    ↓
                              Resource: Action
                              Scope: Branch / Department
```

**Core Permission Check:**

```typescript
// Permission engine
can(user, action, resource, context) → boolean

// Example
can(budi, "approve", "invoice", { branch: "Surabaya" })
// → true if budi has invoice.approve permission for Surabaya branch
```

### Two Permission Universes

| Universe | Scope | Examples |
|----------|-------|----------|
| **Platform Permissions** | Internal Qalcuity operations | `tenant.view`, `tenant.suspend`, `subscription.manage`, `platform.billing`, `system.monitor`, `support.manage`, `feature_flags.manage` |
| **Tenant Permissions** | Customer organization operations | `invoice.view`, `invoice.create`, `invoice.approve`, `inventory.adjust`, `employee.view`, `payroll.manage` |

> ⚠️ Keduanya tidak boleh tercampur. Platform permissions hanya untuk internal Qalcuity team. Tenant permissions hanya untuk customer organizations.

### Permission Check Layers (Defense-in-Depth)

```
Layer 1: Middleware          → Route-level permission check
Layer 2: API Route          → can(user, action, resource, context)
Layer 3: UI                 → Conditional rendering based on permissions
Layer 4: AI Agent           → Tool-level permission check before execution
```

| Layer | Implementation | Notes |
|-------|---------------|-------|
| **Middleware** | Route protection by path prefix | Current: role-based. Target: permission-based |
| **API Route** | `can(user, action, resource, context)` | Replaces role-based checks |
| **UI** | Conditional rendering | `usePermission()` hook |
| **AI Agent** | Tool-level check | Agent calls `can()` before executing actions |

### Platform Admin Roles (Target v2.0)

| Role | Scope | Permissions |
|------|-------|-------------|
| **Super Admin** | Platform-wide | Full access to everything |
| **Platform Admin** | Platform operations | Manage tenants, subscriptions, billing |
| **Developer** | Technical | System health, API management, feature flags |
| **Support** | Customer support | Manage tickets, customer issues |
| **Finance** | Platform billing | Billing, payments, subscriptions |
| **Security** | Security operations | Audit logs, security settings |
| **Analytics** | Data analysis | Platform analytics, usage stats |

### Implementation (Current)

**Middleware** ([`apps/web/middleware.ts`](apps/web/middleware.ts)):

```typescript
// Admin-only paths (SUPERADMIN + ADMIN only)
const ADMIN_ONLY_PATHS = [
  "/dashboard/settings",
  "/dashboard/audit",
];

// Middleware checks:
// 1. Token exists → authenticated
// 2. Role is ADMIN or SUPERADMIN for admin-only paths
// 3. Redirect non-admin to /dashboard
```

**Session Helpers** ([`apps/web/lib/session.ts`](apps/web/lib/session.ts)):

```typescript
// For mutations (CREATE/UPDATE/DELETE)
const auth = await requireMutateAuth(req);
// Returns: { session, tenantId } or throws 401/403

// For admin operations
const auth = await requireAdminAuth(req);
// Returns: { session, tenantId } or throws 401/403
```

**Sidebar** ([`apps/web/app/dashboard/layout.tsx`](apps/web/app/dashboard/layout.tsx)):

```typescript
// Menu filtering based on role:
// SUPERADMIN/ADMIN: sees all menus
// MEMBER: sees all EXCEPT Settings, Audit Trail
// VIEWER: sees all EXCEPT Settings, Audit Trail (read-only)
```

**API Routes** (server-side):

```typescript
// Every API route extracts session:
const session = await getServerSession(authOptions);
const role = session?.user?.role;

// Role check example:
if (role === "VIEWER" && method !== "GET") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

### Migration Plan (Current → Target)

| Step | Description | Phase |
|------|-------------|-------|
| 1 | Design permission model (Prisma schema) | Phase 7 |
| 2 | Implement `@qalcuity/permissions` package | Phase 7 |
| 3 | Implement `can()` permission engine | Phase 7 |
| 4 | Create permission middleware for API routes | Phase 7 |
| 5 | Create permission hooks for UI components | Phase 7 |
| 6 | Migrate from 4-role RBAC to granular permissions | Phase 7 |
| 7 | Add scope support (branch, department) | Phase 7 |
| 8 | AI Agent permission checks | Phase 7 |

---

## 4. Tenant Isolation

### Rule

> **Setiap query database WAJIB filter berdasarkan `tenantId`. Tidak ada exception.**

### Implementation

```typescript
// Every API route extracts tenantId from session
const session = await getServerSession(authOptions);
const tenantId = session?.user?.tenantId;

// Every query includes tenantId filter
const data = await prisma.invoice.findMany({
  where: { tenantId }  // ← WAJIB ada tenantId filter
});

// Every mutation includes tenantId in where clause
await prisma.invoice.update({
  where: { id, tenantId },  // ← Include tenantId in where
  data: { status: 'PAID' }
});
```

### Key Rules

1. **Setiap query database** harus filter berdasarkan `tenantId`
2. **Setiap API route** harus mengambil `tenantId` dari session/JWT
3. **Tidak ada cross-tenant queries** — bahkan untuk admin sekalipun (kecuali SUPERADMIN dengan explicit bypass)
4. **Setiap form submission** harus menyertakan `tenantId` (dari session, bukan dari client)

---

## 5. Input Validation

### Zod Validation Pattern

> **Semua API mutation routes WAJIB menggunakan Zod validation.**

```typescript
// Standard pattern
import { createInvoiceSchema } from '@/lib/validation-schemas';

export async function POST(req: Request) {
  const body = await req.json();
  const validated = createInvoiceSchema.parse(body); // ← WAJIB
  // ... process validated data
}
```

### Schema Location

All schemas are in [`apps/web/lib/validation-schemas.ts`](apps/web/lib/validation-schemas.ts).

| Schema | Purpose |
|--------|---------|
| `createInvoiceSchema` | Invoice creation |
| `updateInvoiceSchema` | Invoice update |
| `createPaymentSchema` | Payment creation |
| `createContactSchema` | Contact creation |
| `createLeadSchema` | Lead creation |
| `createDealSchema` | Deal creation |
| `createProductSchema` | Product creation |
| `createCategorySchema` | Category creation |
| `createSupplierSchema` | Supplier creation |
| `createEmployeeSchema` | Employee creation |
| `createAttendanceSchema` | Attendance creation |
| `createLeaveRequestSchema` | Leave request creation |
| `createPayrollSchema` | Payroll creation |
| `updateProfileSchema` | Profile update |

### Input Sanitization

- [`apps/web/lib/sanitize.ts`](apps/web/lib/sanitize.ts) — Sanitize semua user input
- HTML escaping to prevent XSS
- Applied to all user-generated content before storage

---

## 6. Audit Trail

### Implementation

- **Model:** `AuditLog` in Prisma schema
- **Helper:** [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts)
- **Coverage:** 77+ `logAudit` calls across 10 mutation endpoints
- **Non-blocking:** Async execution (doesn't block user request)

### Audit Log Fields

```typescript
{
  action: string;      // CREATE, UPDATE, DELETE
  entity: string;      // Invoice, Contact, Product, etc.
  entityId: string;    // ID of affected record
  oldValue: Json?;     // Previous state (for updates)
  newValue: Json?;     // New state (for creates/updates)
  userId: string;      // Who performed the action
  tenantId: string;    // Which tenant
  createdAt: DateTime; // When it happened
}
```

### Tracked Actions

| Module | Actions Tracked |
|--------|----------------|
| **Finance** | Invoice CRUD, Payment CRUD, PO CRUD, Quotation CRUD |
| **CRM** | Contact CRUD, Lead CRUD, Deal CRUD |
| **Inventory** | Product CRUD, Category CRUD, Supplier CRUD |
| **HR** | Employee CRUD, Attendance CRUD, Leave CRUD, Payroll CRUD |
| **Settings** | Company update, Profile update, Team management |

---

## 7. API Security Checklist

Every API route must follow this checklist:

- [ ] **Auth check** — `getServerSession(authOptions)`
- [ ] **RBAC check** — Role-based access control
- [ ] **Tenant filter** — Filter by `tenantId`
- [ ] **Input validation** — Zod schema validation
- [ ] **Input sanitization** — HTML escaping
- [ ] **Audit logging** — Log mutation actions
- [ ] **Error handling** — Proper error responses

### Response Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (not logged in) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `500` | Internal server error |

---

## 8. Known Security Gaps

> ⚠️ **Gaps berikut diketahui dan perlu di-address di phase berikutnya.**

| # | Gap | Severity | Status | Fix Plan |
|---|-----|----------|--------|----------|
| 1 | Hardcoded NEXTAUTH_SECRET fallback | 🔴 High | ⚠️ Open | Env validation mandatory |
| 2 | No CSP (Content-Security-Policy) headers | 🟠 Medium | ⚠️ Open | next.config.js headers |
| 3 | No explicit CORS configuration | 🟠 Medium | ⚠️ Open | Middleware CORS config |
| 4 | Rate limiter in-memory only | 🟡 Low | ⚠️ Open | Redis activation |
| 5 | No CSRF token validation | 🟡 Low | ⚠️ Open | CSRF middleware |

### Fix Priority

1. **NEXTAUTH_SECRET** — Remove hardcoded fallback, make env var mandatory
2. **CSP Headers** — Add Content-Security-Policy to next.config.js
3. **CORS** — Configure explicit allowed origins
4. **Rate Limiter** — Migrate to Redis for multi-instance support

---

## 9. Data Protection

### Encryption

| Layer | Standard | Implementation |
|-------|----------|---------------|
| **At Rest** | AES-256 | Database-level encryption |
| **In Transit** | TLS 1.3 | Infrastructure-level |
| **Passwords** | bcryptjs | Salt + hash |

### Backup

| Aspect | Policy |
|--------|--------|
| **Frequency** | Daily auto-backup |
| **Retention** | 30 days |
| **Storage** | Encrypted, separate location |

### Compliance

| Regulation | Status |
|-----------|--------|
| **UU PDP** (Indonesia) | ✅ Ready |
| **GDPR** (EU) | ✅ Ready |

### Data Residency

- **Primary Server:** Indonesia
- **Data Storage:** PostgreSQL on DBngin (local) / Cloud (production)
- **No cross-border data transfer** without explicit consent

---

## 10. Security Checklist

### Development

- [ ] All inputs validated with Zod
- [ ] All queries filtered by tenantId
- [ ] All mutations logged in audit trail
- [ ] No hardcoded secrets
- [ ] Environment variables validated

### Production

- [ ] HTTPS enforced
- [ ] NEXTAUTH_SECRET from env (no fallback)
- [ ] CSP headers configured
- [ ] CORS configured
- [ ] Rate limiter active (Redis)
- [ ] Database backups running
- [ ] Monitoring & alerting active

### Code Review

- [ ] Auth check present
- [ ] RBAC check present
- [ ] Tenant isolation verified
- [ ] Input validation verified
- [ ] No sensitive data in logs

---

**Last Updated:** August 30, 2026
**Maintainer:** Qalcuity Security Team
