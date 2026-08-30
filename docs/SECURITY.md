# SECURITY

> Dokumentasi keamanan system Qalcuity — Authentication, Authorization, Data Protection.
> Last Updated: 2026-08-28

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Authorization (RBAC)](#3-authorization-rbac)
4. [Tenant Isolation](#4-tenant-isolation)
5. [Session Management](#5-session-management)
6. [API Security](#6-api-security)
7. [File Upload Security](#7-file-upload-security)
8. [Data Encryption](#8-data-encryption)
9. [Audit Trail](#9-audit-trail)
10. [UU PDP Compliance](#10-uu-pdp-compliance)
11. [Security Checklist](#11-security-checklist)

---

## 1. Overview

| Layer | Implementation | Status |
|-------|---------------|--------|
| **Authentication** | NextAuth.js 4.24 (JWT strategy) | ✅ Implemented |
| **Authorization** | RBAC (4 roles, string field) | ✅ Implemented |
| **Tenant Isolation** | Application-level (tenantId filter) | ✅ Implemented |
| **Rate Limiting** | In-memory per IP | ✅ Implemented |
| **Password Hashing** | bcryptjs | ✅ Implemented |
| **Input Sanitization** | Custom sanitizer | ✅ Implemented |
| **Audit Trail** | Prisma AuditLog model | ✅ Implemented |
| **File Upload** | Basic upload + validation | ✅ Basic |
| **HTTPS** | Infrastructure-level (not in app) | 🔲 DevOps |
| **Redis Rate Limiting** | Not yet (current: in-memory) | 🔲 Planned |
| **CORS** | Next.js defaults | ✅ Default |
| **CSP Headers** | Not configured | 🔲 Planned |

---

## 2. Authentication

### Implementation

- **Library:** NextAuth.js 4.24
- **Strategy:** JWT (not database sessions)
- **Provider:** CredentialsProvider (email + password)
- **Config:** [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts)

### Flow

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
| **Transmission** | HTTPS (infrastructure) |

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

## 3. Authorization (RBAC)

### Role Hierarchy

```
SUPERADMIN  (highest)
    │
    ▼
  ADMIN
    │
    ▼
  MEMBER
    │
    ▼
  VIEWER    (lowest)
```

### Role Permissions Matrix

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

### Implementation

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

**Sidebar** ([`apps/web/components/layout/sidebar.tsx`](apps/web/components/layout/sidebar.tsx)):

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

### Role Assignment

- **SUPERADMIN** — Assigned to first user during tenant registration
- **ADMIN** — Can be assigned by SUPERADMIN via Settings > Team
- **MEMBER** — Default role for new team members
- **VIEWER** — Read-only access for stakeholders

---

## 4. Tenant Isolation

### Principle

Every business entity belongs to exactly one Tenant. No cross-tenant data access is permitted.

### Implementation

```
┌─────────────────────────────────────────────────────┐
│                  TENANT ISOLATION                     │
│                                                       │
│  JWT Token contains:                                  │
│  { tenantId: "tenant_abc123" }                       │
│                                                       │
│  Every API query includes:                            │
│  WHERE tenantId = "tenant_abc123"                     │
│                                                       │
│  Result: User can only see their own tenant's data    │
└─────────────────────────────────────────────────────┘
```

### Rules

| Rule | Description |
|------|-------------|
| **R1** | Every API request extracts `tenantId` from JWT session |
| **R2** | Every database query includes `WHERE tenantId = ?` |
| **R3** | `tenantId` is never accepted from client request body |
| **R4** | Registration creates a new isolated Tenant |
| **R5** | No cross-tenant queries in normal API routes |

### Code Pattern

```typescript
// ✅ CORRECT — Tenant-scoped query
const session = await getServerSession(authOptions);
const invoices = await prisma.invoice.findMany({
  where: { tenantId: session.user.tenantId }
});

// ❌ WRONG — No tenant scoping (data leak)
const invoices = await prisma.invoice.findMany();

// ❌ WRONG — Accepting tenantId from client
const { tenantId } = await request.json();
const invoices = await prisma.invoice.findMany({
  where: { tenantId } // Could be manipulated!
});
```

### Unique Constraints

Some models have compound unique constraints that include `tenantId`:

| Model | Unique Fields |
|-------|--------------|
| Category | `[name, tenantId]` |
| Product | `[sku, tenantId]` |
| Employee | `[employeeId, tenantId]` |
| AttendanceRecord | `[employeeId, date, tenantId]` |
| PayrollRecord | `[employeeId, period, tenantId]` |

---

## 5. Session Management

### Configuration

```typescript
// apps/web/lib/auth.ts
session: {
  strategy: "jwt",     // JWT-based (not database sessions)
},
pages: {
  signIn: "/login",    // Custom login page
  error: "/login",     // Error redirect
},
secret: process.env.NEXTAUTH_SECRET,  // JWT signing key
```

### Session Flow

```
1. User logs in → JWT token created
2. JWT stored in HTTP-only cookie
3. Each request → middleware validates JWT
4. JWT callback enriches token with role + tenantId
5. Session callback exposes role + tenantId to client
```

### Security Notes

| Aspect | Status | Notes |
|--------|--------|-------|
| **HTTP-only cookies** | ✅ | NextAuth default |
| **Secure cookies** | 🔲 | Requires HTTPS in production |
| **SameSite** | ✅ | NextAuth default (Lax) |
| **Token expiration** | ✅ | NextAuth default (30 days) |
| **Token rotation** | ✅ | On each JWT callback |
| **Secret rotation** | 🔲 | Manual process |

---

## 6. API Security

### Rate Limiting

**Implementation:** [`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts)

| Setting | Value |
|---------|-------|
| **Default limit** | 100 requests per window |
| **Window** | 60 seconds (1 minute) |
| **Storage** | In-memory Map |
| **Cleanup** | Every 5 minutes |
| **Key** | Client IP (from X-Forwarded-For or X-Real-IP) |

```typescript
// Usage in API routes:
const ip = getClientIp(request);
const { success, remaining } = checkRateLimit(`api:${ip}`, 100, 60000);

if (!success) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429 }
  );
}
```

### Input Validation

| Layer | Method |
|-------|--------|
| **API Routes** | Manual validation in route handlers |
| **Prisma** | Schema-level constraints (unique, required) |
| **Frontend** | Form validation before submission |

### Sanitization

- **Custom sanitizer:** [`apps/web/lib/sanitize.ts`](apps/web/lib/sanitize.ts)
- **SQL Injection:** Prevented by Prisma parameterized queries
- **XSS:** React escapes output by default; manual sanitization for rich text

### CORS

- **Default:** Next.js allows same-origin requests
- **Configuration:** Not custom-configured (uses Next.js defaults)

### HTTP Headers

| Header | Status | Notes |
|--------|--------|-------|
| **Content-Security-Policy** | 🔲 | Not configured |
| **X-Frame-Options** | 🔲 | Not configured |
| **X-Content-Type-Options** | 🔲 | Not configured |
| **Strict-Transport-Security** | 🔲 | Requires HTTPS |
| **Referrer-Policy** | 🔲 | Not configured |

---

## 7. File Upload Security

### Current Implementation

- **Component:** [`apps/web/components/ui/file-upload.tsx`](apps/web/components/ui/file-upload.tsx)
- **Usage:** Logo upload, billing payment proof upload
- **Storage:** Local filesystem (not S3 yet)

### Security Measures

| Measure | Status | Description |
|---------|--------|-------------|
| **File type validation** | ✅ | Client-side type checking |
| **File size limit** | ✅ | Configurable max size |
| **Filename sanitization** | ✅ | Prevent path traversal |
| **Storage outside public** | 🔲 | Should move outside web root |
| **Virus scanning** | 🔲 | Not implemented |
| **Cloud storage** | 🔲 | S3/MinIO planned |

### Billing Payment Proof Upload

```typescript
// POST /api/billing/payments/upload
// - Accepts image files (proof of transfer)
// - Stores with sanitized filename
// - Returns URL for BillingPayment record
```

---

## 8. Data Encryption

### At Rest

| Data | Encryption | Notes |
|------|-----------|-------|
| **Database** | 🔲 | Depends on hosting (SQLite: none, PostgreSQL: optional) |
| **Passwords** | ✅ | bcryptjs hashing |
| **JWT Secret** | ✅ | Environment variable |
| **File Storage** | 🔲 | Depends on storage solution |

### In Transit

| Channel | Encryption | Notes |
|---------|-----------|-------|
| **Client ↔ Server** | 🔲 | HTTPS (infrastructure-level) |
| **Server ↔ Database** | 🔲 | Depends on hosting |

### Sensitive Data Handling

| Data Type | Storage | Access |
|-----------|---------|--------|
| **Password** | bcrypt hash | Never returned in API |
| **JWT Secret** | Environment variable | Server-side only |
| **API Keys** | Environment variable | Server-side only |
| **Tax ID (NPWP)** | Plain text in DB | Tenant-scoped access |
| **Bank Account** | Plain text in DB | Admin-only access |

---

## 9. Audit Trail

### Implementation

**File:** [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts)

### What Gets Logged

| Action | Logged Fields |
|--------|--------------|
| **CREATE** | userId, tenantId, action, entity, entityId, newValues |
| **UPDATE** | userId, tenantId, action, entity, entityId, oldValues, newValues |
| **DELETE** | userId, tenantId, action, entity, entityId, oldValues |

### Additional Metadata

| Field | Source | Description |
|-------|--------|-------------|
| `ipAddress` | X-Forwarded-For / X-Real-IP | Client IP address |
| `userAgent` | User-Agent header | Client browser/device |

### Design Principles

1. **Non-blocking** — Audit logging errors never break the main flow
2. **Immutable** — Audit logs are never updated or deleted
3. **Complete** — Every mutation (CREATE, UPDATE, DELETE) is logged
4. **Diff-based** — Only changed fields are captured (via `diffValues()`)

### Access Control

- **View Audit Trail:** SUPERADMIN + ADMIN only
- **Route:** `/dashboard/audit`
- **API:** `/api/audit/logs`
- **Middleware:** Protected by RBAC (admin-only path)

---

## 10. UU PDP Compliance

### Undang-Undang Pelindungan Data Pribadi (Indonesia)

| Principle | Implementation | Status |
|-----------|---------------|--------|
| **Consent** | User registers voluntarily | ✅ |
| **Purpose limitation** | Data used only for stated purpose | ✅ |
| **Data minimization** | Only necessary fields collected | ✅ |
| **Accuracy** | Users can update their data | ✅ |
| **Storage limitation** | Soft delete (data retained but hidden) | ⚠️ |
| **Security** | Authentication + authorization + audit | ✅ |
| **Accountability** | Audit trail for all mutations | ✅ |
| **Cross-border transfer** | Data stored in Indonesia servers | ✅ (planned) |

### Data Categories

| Category | Examples | Sensitivity |
|----------|---------|-------------|
| **Identity** | Name, email, phone | High |
| **Financial** | Invoice amounts, bank accounts | High |
| **Tax** | NPWP (tax ID) | High |
| **HR** | Salary, attendance, leave records | High |
| **Business** | Company name, products, deals | Medium |
| **Usage** | Login timestamps, IP addresses | Low |

### User Rights

| Right | Implementation | Status |
|-------|---------------|--------|
| **Right to know** | Users can view their data | ✅ |
| **Right to access** | Profile page, data export | ⚠️ Partial |
| **Right to correct** | Profile edit, settings | ✅ |
| **Right to delete** | Account deletion (soft delete) | ⚠️ Partial |
| **Right to portability** | Data export (CSV/Excel) | ⚠️ Partial |
| **Right to object** | Opt-out of processing | 🔲 Planned |

---

## 11. Security Checklist

### Authentication

- [x] Password hashing with bcryptjs
- [x] JWT-based sessions
- [x] Custom login/register pages
- [x] Failed login error messages (generic)
- [ ] Account lockout after failed attempts
- [ ] Password complexity requirements
- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub)

### Authorization

- [x] RBAC with 4 roles
- [x] Middleware route protection
- [x] Sidebar menu filtering by role
- [x] API-level role checking
- [ ] Permission-based access (finer granularity)

### Data Protection

- [x] Tenant isolation (tenantId filtering)
- [x] Prisma parameterized queries (SQL injection prevention)
- [x] React XSS protection (default output escaping)
- [ ] Content Security Policy headers
- [ ] CORS configuration
- [ ] Input validation library (Zod/yup)

### Infrastructure

- [x] Rate limiting (in-memory)
- [x] Health check endpoint
- [ ] Redis-based rate limiting
- [ ] HTTPS enforcement
- [ ] Security headers (HSTS, X-Frame-Options, etc.)
- [ ] DDoS protection
- [ ] WAF (Web Application Firewall)

### Monitoring

- [x] Audit trail logging
- [x] Login timestamp tracking
- [ ] Failed login attempt tracking
- [ ] Anomaly detection alerts
- [ ] Security event notifications

### Compliance

- [x] UU PDP basic compliance
- [ ] GDPR readiness
- [ ] SOC 2 Type II (target: Q4 2026)
- [ ] ISO 27001 (target: 2027)

---

## File Reference

| File | Purpose |
|------|---------|
| [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts) | NextAuth configuration |
| [`apps/web/middleware.ts`](apps/web/middleware.ts) | Route protection middleware |
| [`apps/web/lib/rate-limit.ts`](apps/web/lib/rate-limit.ts) | Rate limiter |
| [`apps/web/lib/audit.ts`](apps/web/lib/audit.ts) | Audit trail logging |
| [`apps/web/lib/sanitize.ts`](apps/web/lib/sanitize.ts) | Input sanitization |
| [`apps/web/components/layout/sidebar.tsx`](apps/web/components/layout/sidebar.tsx) | Role-based menu filtering |
| [`apps/web/types/next-auth.d.ts`](apps/web/types/next-auth.d.ts) | NextAuth type augmentation |
