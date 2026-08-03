# 🏗️ Qalcuity All-in-One — Architecture Plan

## 📋 Status Proyek

**Current State:** Fresh project — hanya ada 3 dokumentasi (FEATURES.md, AGENT.md, ROADMAP.md)

---

## 🎯 Target Phase 1 (MVP)

Berdasarkan ROADMAP.md, MVP harus memiliki:

| Module | Priority | Complexity |
|--------|----------|------------|
| **Core Platform** | 🔴 Wajib | Medium |
| **Finance & Accounting** | 🔴 Wajib | High |
| **Sales & CRM** | 🔴 Wajib | Medium |
| **Mobile App** | 🔴 Wajib | High |
| **AI Basic** | 🟡 Nice to have | High |

---

## 🏛️ Tech Stack Recommendation

### Frontend (Web App - Core)

| Component | Technology | Reason |
|-----------|------------|--------|
| **Framework** | Next.js 14+ | React, SSR, great DX |
| **UI Library** | Tailwind CSS + shadcn/ui | Modern, customizable, accessible |
| **State Management** | Zustand | Lightweight, simple |
| **Form Handling** | React Hook Form + Zod | Type-safe validation |
| **Data Fetching** | TanStack Query | Caching, optimistic updates |
| **Charts** | Recharts / Chart.js | Dashboard visualizations |
| **Tables** | TanStack Table | Powerful data tables |
| **i18n** | next-intl | Multi-language support |

### Backend

| Component | Technology | Reason |
|-----------|------------|--------|
| **Runtime** | Node.js 20+ | TypeScript, fast |
| **Framework** | NestJS | Enterprise-ready, modular |
| **ORM** | Prisma | Type-safe, great DX |
| **Database** | PostgreSQL | Reliable, JSON support |
| **Cache** | Redis | Session, caching |
| **Auth** | NextAuth.js / Lucia | Flexible auth |
| **API** | REST + tRPC | Type-safe API |

### Mobile App

| Component | Technology | Reason |
|-----------|------------|--------|
| **Framework** | React Native / Expo | Cross-platform, code sharing |
| **Navigation** | Expo Router | File-based routing |
| **State** | Zustand | Same as web |
| **Offline** | WatermelonDB / SQLite | Offline-first |

### Desktop App

| Component | Technology | Reason |
|-----------|------------|--------|
| **Framework** | Electron + React | Share web code |
| **Offline** | SQLite | Local storage |

### Infrastructure

| Component | Technology | Reason |
|-----------|------------|--------|
| **Hosting** | Vercel (web) + Railway/Fly.io (API) | Easy deploy |
| **Database** | Supabase / Neon | Managed PostgreSQL |
| **Storage** | Cloudflare R2 / S3 | File storage |
| **CI/CD** | GitHub Actions | Free for public |
| **Monitoring** | Sentry | Error tracking |

---

## 📁 Project Structure

```
qalcuity-allinone/
├── apps/
│   ├── web/                    # Next.js Web App (Core)
│   │   ├── app/                # App Router
│   │   │   ├── (auth)/         # Auth pages
│   │   │   ├── (dashboard)/    # Main dashboard
│   │   │   │   ├── finance/    # Finance module
│   │   │   │   ├── sales/      # Sales & CRM
│   │   │   │   ├── inventory/  # Inventory
│   │   │   │   ├── hr/         # HR module
│   │   │   │   ├── operations/ # Operations
│   │   │   │   ├── support/    # Customer support
│   │   │   │   ├── settings/   # Settings
│   │   │   │   └── integrations/ # Integration hub
│   │   │   └── api/            # API routes
│   │   ├── components/         # Shared components
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities
│   │   └── styles/             # Global styles
│   ├── mobile/                 # React Native App
│   │   ├── app/                # Expo Router
│   │   ├── components/         # Shared components
│   │   └── hooks/              # Custom hooks
│   └── desktop/                # Electron App
│       └── src/                # Desktop-specific code
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── db/                     # Prisma schema & client
│   ├── api/                    # API client & types
│   └── utils/                  # Shared utilities
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── docs/                       # Documentation
├── plans/                      # Development plans
└── package.json                # Monorepo root
```

---

## 🚀 Development Phases

### Phase 0: Foundation (Week 1-2)

| Task | Description | Priority |
|------|-------------|----------|
| Monorepo setup | Turborepo + pnpm workspace | 🔴 |
| Database schema | Core tables (users, roles, tenants) | 🔴 |
| Auth system | Login, register, RBAC | 🔴 |
| Layout & Navigation | Sidebar, header, breadcrumbs | 🔴 |
| Design system | Colors, typography, components | 🔴 |

### Phase 1A: Core UI (Week 3-4)

| Task | Description | Priority |
|------|-------------|----------|
| Dashboard layout | Stats cards, charts placeholder | 🔴 |
| Settings pages | Profile, company, users | 🔴 |
| Audit trail view | Activity log table | 🔴 |
| Error pages | 404, 500, unauthorized | 🟡 |

### Phase 1B: Finance Module (Week 5-8)

| Task | Description | Priority |
|------|-------------|----------|
| Chart of Account | CRUD, tree view | 🔴 |
| Invoice | Create, list, detail, PDF | 🔴 |
| Quotation | Create, list, convert to invoice | 🔴 |
| Payment | Record, list, reconciliation | 🔴 |
| Basic reports | P&L, Balance Sheet | 🔴 |

### Phase 1C: Sales & CRM (Week 9-10)

| Task | Description | Priority |
|------|-------------|----------|
| Lead management | CRUD, status tracking | 🔴 |
| Pipeline | Kanban view, drag & drop | 🔴 |
| Deal management | CRUD, won/lost tracking | 🔴 |
| Customer 360 | Unified customer view | 🟡 |

### Phase 2: Mobile App (Week 11-12)

| Task | Description | Priority |
|------|-------------|----------|
| Mobile scaffold | Navigation, auth | 🔴 |
| Dashboard mobile | Key metrics | 🔴 |
| Quick actions | Approvals, updates | 🟡 |

---

## 📊 Database Schema (Core)

### Users & Auth

```sql
-- Tenants (companies)
tenants
  id, name, slug, settings, created_at

-- Users
users
  id, email, name, password_hash, avatar, tenant_id, created_at

-- Roles
roles
  id, name, tenant_id

-- User Roles
user_roles
  user_id, role_id

-- Permissions
permissions
  id, name, description

-- Role Permissions
role_permissions
  role_id, permission_id
```

### Core Business

```sql
-- Contacts (customers & suppliers)
contacts
  id, name, type, email, phone, address, tenant_id

-- Products
products
  id, name, sku, price, cost, stock, tenant_id

-- Invoices
invoices
  id, number, contact_id, status, total, due_date, tenant_id

-- Invoice Items
invoice_items
  id, invoice_id, product_id, quantity, price, total

-- Payments
payments
  id, invoice_id, amount, method, date, tenant_id
```

---

## 🎯 Prioritas Pengerjaan

### Yang Ringan (Mulai dari sini)

1. ✅ Dokumentasi (FEATURES.md, AGENT.md, ROADMAP.md) — **SELESAI**
2. ⬜ Monorepo setup (package.json, turborepo config)
3. ⬜ Database schema (Prisma)
4. ⬜ Design system basics (colors, typography)
5. ⬜ Layout components (sidebar, header)
6. ⬜ Auth pages (login, register)
7. ⬜ Error pages (404, 500)

### Yang Sedang

8. ⬜ Dashboard page
9. ⬜ Settings pages
10. ⬜ Audit trail view
11. ⬜ Contact management
12. ⬜ Product management

### Yang Besar

13. ⬜ Finance module (Invoice, Quotation, Payment)
14. ⬜ Sales & CRM (Pipeline, Leads)
15. ⬜ Mobile app
16. ⬜ AI features

---

**Next Step:** Mulai dari Phase 0 — Monorepo setup
