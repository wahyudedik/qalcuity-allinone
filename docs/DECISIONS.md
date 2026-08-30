# DECISIONS

> Architecture Decision Records (ADR) untuk Qalcuity All-in-One ERP/CRM.
> Last Updated: 2026-08-28

---

## Table of Contents

- [ADR-001: Monorepo Structure](#adr-001-monorepo-structure)
- [ADR-002: Next.js App Router](#adr-002-nextjs-app-router)
- [ADR-003: Prisma ORM with SQLite (dev) / PostgreSQL (prod)](#adr-003-prisma-orm-with-sqlite-dev--postgresql-prod)
- [ADR-004: NextAuth JWT for Authentication](#adr-004-nextauth-jwt-for-authentication)
- [ADR-005: Role-based Access Control (String Field)](#adr-005-role-based-access-control-string-field)
- [ADR-006: In-Memory Store for Non-Critical Data](#adr-006-in-memory-store-for-non-critical-data)
- [ADR-007: i18n with Custom Provider](#adr-007-i18n-with-custom-provider)
- [ADR-008: Tailwind CSS for Styling](#adr-008-tailwind-css-for-styling)
- [ADR-009: Lucide React for Icons](#adr-009-lucide-react-for-icons)

---

## ADR-001: Monorepo Structure

**Status:** Accepted
**Date:** 2026-08-01
**Decision Makers:** Development Team

### Context

Qalcuity is a multi-platform application (Web, Desktop, Mobile) with shared business logic and database schema. We need a project structure that:
- Shares code between platforms
- Manages dependencies efficiently
- Supports independent deployment
- Scales with team growth

### Decision

Use **pnpm workspaces** with **Turborepo** for monorepo management.

### Structure

```
qalcuity-allinone/
├── apps/
│   ├── web/          # @qalcuity/web — Next.js core app
│   ├── desktop/      # Electron wrapper
│   └── mobile/       # React Native / Expo
├── packages/
│   ├── db/           # @qalcuity/db — Prisma schema + client
│   ├── types/        # @qalcuity/types — Shared TypeScript types
│   └── utils/        # @qalcuity/utils — Shared utilities
├── pnpm-workspace.yaml
├── package.json      # Root scripts (turbo dev/build/lint)
└── turbo.json
```

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Multi-repo** | Independent deployment | Code duplication, dependency hell | ❌ Rejected |
| **npm/yarn workspaces** | Simpler setup | Slower, less efficient | ❌ Rejected |
| **Nx** | More features, better caching | Heavier, steeper learning curve | ❌ Rejected |
| **pnpm + Turborepo** | Fast, efficient, good DX | Newer ecosystem | ✅ Selected |

### Consequences

- ✅ Shared database schema across all platforms
- ✅ Shared types ensure consistency
- ✅ Fast builds with Turborepo caching
- ✅ Efficient disk usage with pnpm
- ⚠️ Requires understanding of workspace protocols
- ⚠️ Initial setup complexity

---

## ADR-002: Next.js App Router

**Status:** Accepted
**Date:** 2026-08-01
**Decision Makers:** Development Team

### Context

The web application needs:
- Server-side rendering (SSR) for dashboard pages
- API routes for backend logic
- File-based routing for simplicity
- React Server Components for performance
- Middleware for authentication

### Decision

Use **Next.js 14 with App Router** (`/app` directory).

### Rationale

| Feature | App Router | Pages Router |
|---------|-----------|--------------|
| **React Server Components** | ✅ Native | ❌ Not supported |
| **Layouts** | ✅ Nested layouts | ⚠️ Custom implementation |
| **Loading states** | ✅ `loading.tsx` | ❌ Manual |
| **Error handling** | ✅ `error.tsx` | ❌ Manual |
| **Route groups** | ✅ `(auth)`, `(dashboard)` | ❌ Not supported |
| **Streaming** | ✅ Native | ❌ Not supported |

### Implementation

```
app/
├── layout.tsx              # Root layout (Session + i18n providers)
├── page.tsx                # Landing page
├── (auth)/
│   ├── layout.tsx          # Auth layout (centered card)
│   ├── login/page.tsx      # Login page
│   └── register/page.tsx   # Register page
├── dashboard/
│   ├── layout.tsx          # Dashboard layout (sidebar + header)
│   ├── loading.tsx         # Dashboard loading skeleton
│   ├── page.tsx            # Dashboard home
│   ├── finance/            # Finance module
│   ├── crm/                # CRM module
│   ├── hr/                 # HR module
│   ├── inventory/          # Inventory module
│   ├── reports/            # Reports
│   ├── billing/            # Billing
│   ├── settings/           # Settings
│   ├── audit/              # Audit trail
│   └── ai/                 # AI hub
└── api/                    # API route handlers
    ├── auth/
    ├── finance/
    ├── crm/
    ├── hr/
    ├── inventory/
    └── ...
```

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Pages Router** | More mature, more docs | No RSC, manual layouts | ❌ Rejected |
| **Remix** | Good DX, loaders | Smaller ecosystem | ❌ Rejected |
| **Vite + React** | Faster dev server | No SSR, manual routing | ❌ Rejected |
| **App Router** | RSC, layouts, streaming | Newer, some breaking changes | ✅ Selected |

### Consequences

- ✅ Server Components reduce client-side JavaScript
- ✅ Nested layouts avoid re-rendering sidebar/header
- ✅ `loading.tsx` provides instant loading states
- ✅ `error.tsx` provides module-level error boundaries
- ⚠️ Some libraries not yet compatible with RSC
- ⚠️ Learning curve for developers familiar with Pages Router

---

## ADR-003: Prisma ORM with SQLite (dev) / PostgreSQL (prod)

**Status:** Accepted
**Date:** 2026-08-01
**Decision Makers:** Development Team

### Context

The application needs:
- Type-safe database queries
- Easy schema management and migrations
- Fast local development
- Production-grade database for deployment
- Multi-tenant data isolation

### Decision

Use **Prisma ORM** with **SQLite for development** and **PostgreSQL for production**.

### Rationale

| Criterion | Prisma | Drizzle | TypeORM | Knex |
|-----------|--------|---------|---------|------|
| **Type safety** | ✅ Excellent | ✅ Good | ⚠️ Moderate | ❌ Manual |
| **Schema as code** | ✅ `.prisma` file | ✅ TypeScript | ⚠️ Decorators | ❌ Manual |
| **Migration** | ✅ `prisma migrate` | ✅ Drizzle Kit | ⚠️ Complex | ✅ Good |
| **DX** | ✅ Excellent | ✅ Good | ⚠️ Moderate | ⚠️ Moderate |
| **Multi-db** | ✅ SQLite/PG/MySQL | ✅ SQLite/PG | ✅ Many | ✅ Many |
| **Ecosystem** | ✅ Large | ⚠️ Growing | ✅ Large | ✅ Large |

### Database Strategy

```prisma
// packages/db/prisma/schema.prisma
datasource db {
  provider = "sqlite"     // Dev: SQLite
  url      = env("DATABASE_URL")
  // Prod: Change to "postgresql"
}
```

### Monetary Fields Note

```prisma
// Development (SQLite) — Float for compatibility
subtotal Float @default(0)

// Production (PostgreSQL) — Decimal for precision
subtotal Decimal @db.Decimal(15, 2) @default(0)
```

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Raw SQL** | Full control, no ORM overhead | No type safety, manual queries | ❌ Rejected |
| **Drizzle** | Faster, lighter | Less mature ecosystem | ❌ Rejected |
| **TypeORM** | Decorator-based, mature | Complex, less DX | ❌ Rejected |
| **Prisma** | Best DX, type safety, schema-first | Heavier runtime | ✅ Selected |

### Consequences

- ✅ Type-safe queries across entire codebase
- ✅ Schema changes are tracked and versioned
- ✅ Fast local dev with SQLite (no server needed)
- ✅ Production-ready with PostgreSQL
- ⚠️ Prisma Client is generated (build step required)
- ⚠️ Float vs Decimal migration needed for production
- ⚠️ Some advanced queries require raw SQL

---

## ADR-004: NextAuth JWT for Authentication

**Status:** Accepted
**Date:** 2026-08-01
**Decision Makers:** Development Team

### Context

The application needs:
- Secure user authentication
- Session management
- Multi-tenant user isolation
- Role-based access control
- Custom login/register pages

### Decision

Use **NextAuth.js 4.24** with **JWT strategy** and **CredentialsProvider**.

### Implementation

```typescript
// apps/web/lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Find user by email
        // 2. Verify password with bcrypt
        // 3. Update lastLoginAt
        // 4. Return user with role + tenantId
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Enrich token with role + tenantId
    },
    session({ session, token }) {
      // Expose role + tenantId to session
    },
  },
  session: { strategy: "jwt" },
};
```

### JWT Token Structure

```typescript
{
  sub: string;        // User ID
  email: string;      // User email
  name: string;       // User name
  role: string;       // SUPERADMIN | ADMIN | MEMBER | VIEWER
  tenantId: string;   // Tenant ID
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Database sessions** | Server-controlled, immediate revocation | Requires DB query per request | ❌ Rejected |
| **NextAuth + OAuth** | Social login, less password management | More complexity, third-party dependency | ❌ Rejected (for now) |
| **Custom JWT** | Full control | More code, security risk | ❌ Rejected |
| **NextAuth JWT** | Battle-tested, easy setup, secure | Less control over token format | ✅ Selected |

### Consequences

- ✅ Stateless authentication (no DB query per request)
- ✅ Built-in CSRF protection
- ✅ Secure HTTP-only cookies
- ✅ Easy integration with Next.js middleware
- ⚠️ Token revocation requires additional mechanism
- ⚠️ Secret key management (NEXTAUTH_SECRET)
- ⚠️ Default expiration is 30 days (may need adjustment)

---

## ADR-005: Role-based Access Control (String Field)

**Status:** Accepted
**Date:** 2026-08-01
**Decision Makers:** Development Team

### Context

The application needs:
- Multi-role access control
- Simple role management
- Easy to query and filter
- Compatible with SQLite (no enum type)

### Decision

Use a **string field** (`role: String`) on the `User` model instead of a separate `Role` table or Prisma enum.

### Implementation

```prisma
model User {
  role String @default("USER")  // SUPERADMIN, ADMIN, MEMBER, VIEWER
}
```

### Role Values

| Role | Description | Hierarchy |
|------|-------------|-----------|
| `SUPERADMIN` | System administrator | 4 (highest) |
| `ADMIN` | Tenant administrator | 3 |
| `MEMBER` | Regular user | 2 |
| `VIEWER` | Read-only user | 1 (lowest) |

### Rationale

| Criterion | String Field | Separate Role Table | Prisma Enum |
|-----------|-------------|-------------------|-------------|
| **Query simplicity** | ✅ `where: { role: "ADMIN" }` | ⚠️ Requires join | ✅ `where: { role: ADMIN }` |
| **SQLite compatibility** | ✅ Works | ✅ Works | ❌ Not supported |
| **Flexibility** | ✅ Easy to add roles | ✅ Easy to add roles | ⚠️ Requires schema change |
| **Performance** | ✅ Fast (indexed string) | ⚠️ Join overhead | ✅ Fast |
| **Validation** | ⚠️ Application-level | ✅ Database-level | ✅ Schema-level |

### Validation

```typescript
const VALID_ROLES = ["SUPERADMIN", "ADMIN", "MEMBER", "VIEWER"];

// Validate at registration/role change
if (!VALID_ROLES.includes(role)) {
  throw new Error("Invalid role");
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Separate Role table** | Normalized, flexible | Complex queries, join overhead | ❌ Rejected |
| **Prisma enum** | Type-safe, database-level | Not supported in SQLite | ❌ Rejected |
| **Bitwise flags** | Compact, efficient | Hard to read, complex | ❌ Rejected |
| **String field** | Simple, fast, SQLite-compatible | No DB-level validation | ✅ Selected |

### Consequences

- ✅ Simple queries (`where: { role: "ADMIN" }`)
- ✅ Works with SQLite and PostgreSQL
- ✅ Easy to add new roles without schema changes
- ⚠️ No database-level validation (application must validate)
- ⚠️ Typos in role strings cause silent bugs

---

## ADR-006: In-Memory Store for Non-Critical Data

**Status:** Accepted (with known limitations)
**Date:** 2026-08-15
**Decision Makers:** Development Team

### Context

Some features need quick data storage without requiring database schema changes:
- Chart of Accounts (CoA) — Financial account hierarchy
- Bank Reconciliation — Temporary matching data

### Decision

Use **in-memory JavaScript objects** for non-critical, non-persistent data.

### Implementation

```typescript
// apps/web/lib/seed-data/coa.ts
// In-memory CoA data (resets on server restart)
export const chartOfAccounts: Account[] = [
  { id: "1000", name: "Kas", type: "ASSET", ... },
  { id: "2000", name: "Utang Usaha", type: "LIABILITY", ... },
  // ...
];

// apps/web/lib/seed-data/reconciliation.ts
// In-memory reconciliation data
export const reconciliationData: ReconciliationEntry[] = [];
```

### Data Characteristics

| Feature | CoA | Reconciliation |
|---------|-----|----------------|
| **Criticality** | Low (seed data) | Low (temporary) |
| **Persistence needed** | No (can be re-seeded) | No (workflow tool) |
| **Volume** | ~50 accounts | ~100 entries |
| **Write frequency** | Rare (setup only) | Moderate |
| **Read frequency** | High | Moderate |

### Known Issues

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| **Data loss on restart** | CoA resets | Re-seed on startup |
| **No multi-tenant** | Shared across tenants | Acceptable for seed data |
| **No concurrency** | Race conditions | Low risk (low write frequency) |
| **Memory usage** | Grows with data | Bounded (small datasets) |

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Add to Prisma schema** | Persistent, typed, tenant-scoped | Requires migration, more code | ❌ Deferred |
| **SQLite temp tables** | Persistent per session | Complex, no sharing | ❌ Rejected |
| **Redis** | Fast, persistent | External dependency, cost | ❌ Deferred |
| **In-memory** | Zero setup, fast | Not persistent, not tenant-scoped | ✅ Selected (temp) |

### Future Plan

Migrate CoA and Reconciliation to Prisma models when:
- Production deployment requires persistence
- Multi-tenant isolation is needed
- Data volume grows beyond seed data

### Consequences

- ✅ Zero setup — no database changes needed
- ✅ Fast development iteration
- ✅ Works immediately for demo/MVP
- ⚠️ Data lost on server restart
- ⚠️ Not suitable for production
- ⚠️ No tenant isolation for these features

---

## ADR-007: i18n with Custom Provider

**Status:** Accepted
**Date:** 2026-08-18
**Decision Makers:** Development Team

### Context

The application targets Indonesian market primarily but needs English support for:
- International users
- Developer documentation
- Future expansion

### Decision

Use a **custom i18n provider** with JSON translation files.

### Implementation

```typescript
// apps/web/lib/i18n.tsx
// Custom provider (next-intl compatible pattern)

// Translation files:
// apps/web/messages/id.json  — Bahasa Indonesia
// apps/web/messages/en.json  — English

// Usage in components:
const { t } = useTranslation();
t("nav.dashboard")  // "Dashboard" or "Beranda"
```

### Supported Languages

| Language | Code | Status |
|----------|------|--------|
| Bahasa Indonesia | `id` | ✅ Primary |
| English | `en` | ✅ Secondary |

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **next-intl** | Feature-rich, well-documented | Heavier, more setup | ❌ Rejected |
| **react-i18next** | Popular, many plugins | React-only, more setup | ❌ Rejected |
| **Custom provider** | Lightweight, full control | Less features, manual work | ✅ Selected |

### Consequences

- ✅ Lightweight — no additional dependencies
- ✅ Full control over translation flow
- ✅ Compatible with RSC (App Router)
- ⚠️ Manual implementation of pluralization, interpolation
- ⚠️ No built-in namespace support
- ⚠️ Must maintain translation files manually

---

## ADR-008: Tailwind CSS for Styling

**Status:** Accepted
**Date:** 2026-08-01
**Decision Makers:** Development Team

### Context

The application needs:
- Consistent styling across components
- Dark mode support
- Responsive design
- Fast development iteration
- Small production bundle

### Decision

Use **Tailwind CSS 3.4** with **CSS variables** for theming.

### Configuration

```javascript
// apps/web/tailwind.config.js
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        primary: { DEFAULT: "hsl(var(--primary))", ... },
        // ...
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      borderRadius: { lg: "var(--radius)", ... },
    },
  },
};
```

### Theming Strategy

```css
/* CSS variables for light/dark mode */
:root {
  --primary: 221.2 83.2% 53.3%;  /* Blue */
  --background: 0 0% 100%;        /* White */
}
.dark {
  --primary: 217.2 91.2% 59.8%;  /* Lighter blue */
  --background: 222.2 84% 4.9%;  /* Dark */
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **CSS Modules** | Scoped styles, no runtime | Verbose, no utilities | ❌ Rejected |
| **Styled Components** | Dynamic styles, scoped | Runtime overhead, SSR issues | ❌ Rejected |
| **Chakra UI** | Full component library | Heavier, opinionated | ❌ Rejected |
| **shadcn/ui + Tailwind** | Components + utilities | Requires copy-paste | ⚠️ Partial |
| **Tailwind CSS** | Utilities, fast, small bundle | HTML-heavy, learning curve | ✅ Selected |

### Consequences

- ✅ Rapid prototyping with utility classes
- ✅ Consistent spacing, colors, typography
- ✅ Dark mode via `class` strategy
- ✅ Small production CSS (purged unused)
- ✅ Works with RSC (no runtime CSS-in-JS)
- ⚠️ HTML can become verbose
- ⚠️ Learning curve for Tailwind newcomers
- ⚠️ Custom CSS still needed for complex animations

---

## ADR-009: Lucide React for Icons

**Status:** Accepted
**Date:** 2026-08-18
**Decision Makers:** Development Team

### Context

The application needs:
- Consistent icon set across all modules
- Tree-shakeable (only import used icons)
- React-compatible
- Professional appearance
- Good coverage of business/finance icons

### Decision

Use **Lucide React** v1.31+ as the exclusive icon library.

### Usage

```tsx
import { LayoutDashboard, Receipt, Users } from "lucide-react";

// In components
<LayoutDashboard className="h-5 w-5" />
<Receipt className="h-4 w-4 text-muted-foreground" />
```

### Icon Coverage

| Category | Icons Available |
|----------|----------------|
| **Navigation** | LayoutDashboard, Menu, ChevronRight, X, Settings, Home |
| **Finance** | Receipt, FileText, CreditCard, BookOpen, Wallet, DollarSign |
| **CRM** | TrendingUp, Target, Users, Handshake, UserPlus |
| **Inventory** | Package, Boxes, Tags, Truck, BarChart3 |
| **HR** | UsersRound, ClipboardCheck, CalendarOff, Briefcase |
| **Actions** | Plus, Edit, Trash2, Search, Filter, Download, Upload |
| **Status** | Check, AlertTriangle, XCircle, Info, Clock |
| **AI** | Zap, Sparkles, Bot |

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Heroicons** | Well-designed, Tailwind-native | Fewer icons | ❌ Rejected |
| **React Icons** | Huge collection, many sets | Larger bundle, inconsistent style | ❌ Rejected |
| **Font Awesome** | Extensive, well-known | License cost, heavier | ❌ Rejected |
| **Emoji** | Zero dependency | Inconsistent, accessibility issues | ❌ Rejected |
| **Lucide React** | Consistent, tree-shakeable, MIT license | Newer, smaller set | ✅ Selected |

### Consequences

- ✅ Consistent visual language across all modules
- ✅ Tree-shakeable — only used icons in bundle
- ✅ MIT license — no cost
- ✅ Good TypeScript support
- ✅ Active development and community
- ⚠️ Smaller set than Font Awesome/React Icons
- ⚠️ Some niche icons may be missing

---

## ADR Summary

| ADR | Decision | Status | Risk |
|-----|----------|--------|------|
| 001 | Monorepo (pnpm + Turborepo) | ✅ Accepted | Low |
| 002 | Next.js App Router | ✅ Accepted | Medium |
| 003 | Prisma + SQLite/PostgreSQL | ✅ Accepted | Low |
| 004 | NextAuth JWT | ✅ Accepted | Low |
| 005 | RBAC (string field) | ✅ Accepted | Low |
| 006 | In-memory store (CoA, Reconciliation) | ✅ Accepted | Medium |
| 007 | Custom i18n provider | ✅ Accepted | Low |
| 008 | Tailwind CSS | ✅ Accepted | Low |
| 009 | Lucide React | ✅ Accepted | Low |

---

## File Reference

| File | Purpose |
|------|---------|
| [`pnpm-workspace.yaml`](pnpm-workspace.yaml) | Workspace definition (ADR-001) |
| [`package.json`](package.json) | Root scripts with Turborepo (ADR-001) |
| [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx) | Root layout (ADR-002) |
| [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) | Prisma schema (ADR-003) |
| [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts) | NextAuth config (ADR-004) |
| [`apps/web/lib/i18n.tsx`](apps/web/lib/i18n.tsx) | i18n provider (ADR-007) |
| [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js) | Tailwind config (ADR-008) |
| [`apps/web/components/layout/sidebar.tsx`](apps/web/components/layout/sidebar.tsx) | Icons usage (ADR-009) |
