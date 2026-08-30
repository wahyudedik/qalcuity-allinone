# 🗺️ Qalcuity All-in-One — Product Roadmap

> **Vision:** Menjadi B2B Operating System #1 untuk UKM & Mid-Market Indonesia
> **Last Updated:** August 29, 2026

---

## 📋 Daftar Isi

1. [NOW](#-now-current-sprint)
2. [NEXT](#-next-next-2-4-weeks)
3. [LATER](#-later-future-phases)
4. [BLOCKED](#-blocked)
5. [COMPLETED](#-completed)
6. [Phase Overview](#-phase-overview)
7. [Success Metrics](#-success-metrics)
8. [Risks & Mitigation](#-risks--mitigation)

---

## 🟢 NOW (Current Sprint)

> **Phase 1 (MVP Stabilization)** — August 2026
> Fokus: Stabilisasi MVP, bug fixes, production readiness

### Active Tasks

| # | Task | Module | Priority | Status |
|---|------|--------|----------|--------|
| 1 | CoA & Reconciliation — migrate from in-memory to persistent DB store | Finance | High | `in_progress` |
| 2 | ~~Settings pages — complete CRUD for company, notifications, security, team~~ ✅ Done | ~~Settings~~ | ~~Medium~~ | ~~`in_progress`~~ ✅ |
| 3 | Email notification — real SMTP integration (currently placeholder) | Integration | Medium | `in_progress` |
| 4 | Payment gateway — real Midtrans/Xendit integration | Integration | Medium | `in_progress` |
| 5 | AI Chat — replace mock responses with real LLM integration | AI | Low | `in_progress` |
| 6 | Landing page & documentation | Marketing | Low | `in_progress` |

### Known Issues Being Fixed

| # | Issue | Severity | Module |
|---|-------|----------|--------|
| 1 | CoA & Reconciliation use in-memory store (not persistent across restarts) | Medium | Finance |
| 2 | AI Chat uses mock responses (no real LLM integration yet) | Low | AI |
| 3 | SMTP config is placeholder — emails not actually sent | Medium | Notifications |
| 4 | ~~Settings pages may have incomplete CRUD operations~~ ✅ Fixed | ~~Medium~~ | Settings |
| 5 | ~~Float type for monetary fields (should be Decimal for PostgreSQL prod)~~ ✅ Fixed | ~~Low~~ | Database |
| 6 | Rate limiter is in-memory (not suitable for multi-instance deployment) | Low | API |

---

## 🔵 NEXT (Next 2-4 weeks)

> **Phase 2 Start** — September-Oktober 2026
> Fokus: Field Service, Advanced Reporting, Basic AI, Omnichannel, Bank Reconciliation

### Planned Tasks

| # | Task | Module | Phase |
|---|------|--------|-------|
| 1 | Field Service Module — job scheduling, technician assignment, mobile checklist | Operations | Phase 2 |
| 2 | Advanced Reporting — custom report builder, pivot table, scheduled reports | Reporting | Phase 2 |
| 3 | Natural Language Query — real NLP for business data queries | AI | Phase 2 |
| 4 | Document Extraction — PDF/OCR processing for invoices, PO, KTP | AI | Phase 2 |
| 5 | Bank Reconciliation (auto) — connect to real bank feeds | Finance | Phase 2 |
| 6 | Omnichannel Support — WhatsApp, Email, Instagram integration | Support | Phase 2 |
| 7 | Offline capability — Service worker, local cache for mobile/desktop | Platform | Phase 2 |
| 8 | Full inventory module — stock opname, multi-warehouse, batch tracking | Inventory | Phase 2 |

---

## 🟡 LATER (Future Phases)

> **Phase 3-4** — 2027
> Fokus: Full AI Agent Suite, Advanced Multi-entity, Marketplace, White-label, Enterprise

### Phase 3: Full AI Agent Suite (March-May 2027)

| # | Task | Module |
|---|------|--------|
| 1 | Finance Agent — auto-generate invoice, anomaly detection, cash flow prediction | AI |
| 2 | Sales Agent — win probability, next best action, lead scoring | AI |
| 3 | Inventory Agent — stockout prediction, auto-reorder, demand forecasting | AI |
| 4 | HR Agent — contract generation, leave prediction, attrition risk | AI |
| 5 | Support Agent — auto-categorize, suggested reply, sentiment analysis | AI |
| 6 | AI Template Generator — contract, JD, email template generation | AI |
| 7 | Anomaly Detection — fraud, data error, compliance alerts | AI |

### Phase 3: Advanced Multi-entity (March-May 2027)

| # | Task | Module |
|---|------|--------|
| 1 | Multi-entity support — cabang, anak perusahaan | Platform |
| 2 | Multi-currency — base currency, exchange rates | Platform |
| 3 | Consolidated reporting — cross-entity reports | Reporting |

### Phase 3: Marketplace Integration (March-May 2027)

| # | Task | Module |
|---|------|--------|
| 1 | Shopee integration — product sync, order management | Integration |
| 2 | Tokopedia integration — product sync, order management | Integration |
| 3 | Lazada integration — product sync, order management | Integration |

### Phase 4: Enterprise & Scale (June-November 2027)

| # | Task | Module |
|---|------|--------|
| 1 | White-label platform — custom branding, reseller portal | Platform |
| 2 | SSO integration — SAML 2.0, OAuth 2.0 | Security |
| 3 | Advanced approval workflows — conditional routing, delegation | Platform |
| 4 | Open API v2 — GraphQL, webhook builder, API sandbox | Integration |
| 5 | Predictive analytics — revenue forecasting, churn prediction | AI |
| 6 | Self-learning capabilities — model improvement from usage | AI |
| 7 | Coretax integration — e-Faktur, PPh 21, PPN | Tax |
| 8 | SOC 2 Type II compliance | Security |

---

## 🔴 BLOCKED

> Item yang terhambat oleh dependency atau issue

| # | Item | Blocked By | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Coretax Integration | Coretax API docs belum available | Tax compliance delayed | Monitor release, prepare adapter pattern |
| 2 | Real LLM Integration | API key & cost decision pending | AI features use mock data | Continue with mock, prepare architecture |
| 3 | ~~PostgreSQL Production Migration~~ | ~~Dev environment still on SQLite~~ | ~~Float precision issues in production~~ | ✅ Migrated to PostgreSQL, Decimal type |

---

## ✅ COMPLETED

> Semua item yang sudah selesai dikerjakan

### Phase 1 — MVP Foundation (August 2026)

#### Core Platform
- [x] Authentication — NextAuth JWT with CredentialsProvider
- [x] RBAC — 4 roles (SUPERADMIN, ADMIN, MEMBER, VIEWER)
- [x] RBAC Defense-in-depth — 3 layers: middleware + API route + UI visibility (35 routes + 22 pages)
- [x] Registration flow
- [x] Session management — JWT strategy with role + tenantId
- [x] Password hashing — bcryptjs
- [x] Dashboard layout — unified real-time view
- [x] Audit Trail — all mutations logged with old/new values (77 audit calls, 10 endpoints)
- [x] Rate Limiting — in-memory rate limiter per IP
- [x] Health Check — `/api/health` endpoint
- [x] Global Search — Ctrl+K across all modules
- [x] Dark Mode — class-based toggle (Tailwind)
- [x] i18n — Bahasa Indonesia + English, 20+ pages localized
- [x] Responsive Design — mobile-first, 44x44px touch targets
- [x] Responsive Tables — dual layout (mobile cards + desktop tables) on 17 pages
- [x] Zod Validation — 14+ schemas, 19 API routes validated
- [x] Lucide Icons — consistent icon system across all modules
- [x] Empty States — all CRUD pages
- [x] Toast Notifications — CRUD operation feedback
- [x] Confirmation Dialogs — delete on 14+ pages
- [x] Navigation Links — cross-entity navigation
- [x] Loading States — 9 loading.tsx files for detail pages

#### Finance & Accounting
- [x] Chart of Account — full CRUD tree view with hierarchical relationships
- [x] Invoice management — create, read, update, delete
- [x] Quotation management — create, read, update, delete
- [x] Payment recording — create, read, update, delete
- [x] Purchase Order management — create, read, update, delete
- [x] Bank Reconciliation — manual page + API route

#### Sales & CRM
- [x] Lead management — CRUD
- [x] Contact management — CRUD
- [x] Deal management — CRUD with pipeline stages
- [x] Pipeline board — Kanban view with 6 stages
- [x] Pipeline list view — table with sorting & filtering

#### HR & People Ops
- [x] Employee database — CRUD
- [x] Attendance management — CRUD
- [x] Leave management — CRUD with approval workflow
- [x] Payroll management — CRUD

#### Inventory & Supply Chain
- [x] Product catalog — CRUD
- [x] Supplier management — CRUD
- [x] Category management — CRUD
- [x] Stock movements — tracking

#### Settings & Admin
- [x] Profile settings — CRUD with i18n
- [x] Company settings — with logo upload, CRUD with i18n
- [x] Team management — CRUD with i18n
- [x] Notification settings — SMTP config, CRUD with i18n
- [x] Security settings — CRUD with i18n
- [x] Integrations settings — CRUD with i18n
- [x] Billing & Subscription — plan selection, manual transfer, superadmin approval

#### Reporting
- [x] Advanced Reporting — 12 report types
- [x] Export — CSV, Excel, Print
- [x] Charts — Bar, Pie, Line (custom implementation)

#### AI Features (Basic)
- [x] AI Chat — floating button component
- [x] AI Hub — centralized page at `/dashboard/ai`
- [x] AI Insights — business insight cards on dashboard
- [x] AI Sidebar Menu — dedicated menu item

#### Platforms
- [x] Web App — core Next.js application
- [x] Desktop App — Electron wrapper
- [x] Mobile App — React Native/Expo with SearchBar, LoadingSkeleton, pull-to-refresh

#### Infrastructure
- [x] Seed data — comprehensive demo data for all modules
- [x] Deploy scripts — PM2 health check, configurable port

### Changelog

| Date | Change | Impact |
|------|--------|--------|
| 2026-08-29 | Zod Validation — 14+ schemas, 19 API routes validated | Input security |
| 2026-08-29 | Audit Logging — 77 audit calls across 10 mutation endpoints | Compliance |
| 2026-08-29 | RBAC Defense-in-depth — 3 layers, 35 API routes + 22 pages | Access control |
| 2026-08-29 | Responsive Tables — dual layout on 17 pages | Mobile UX |
| 2026-08-29 | i18n Expansion — 20+ pages localized, 200+ new keys | Internationalization |
| 2026-08-29 | Settings Pages — 6 pages completed with full i18n | Settings |
| 2026-08-29 | Detail Pages — 9 loading.tsx, delete on 6 pages, 48 i18n keys | CRUD completeness |
| 2026-08-29 | Pipeline Fix — stage name mismatch, CLOSED_WON/LOST added | CRM |
| 2026-08-29 | Sidebar Fix — navigation reorder, billing path fix | Navigation |
| 2026-08-28 | Billing & Subscription — Plan selection, manual transfer, superadmin approve/reject | Revenue management |
| 2026-08-28 | Role Superadmin — RBAC 4 role, sidebar filtering, middleware protection | Access control |
| 2026-08-28 | AI Features — Chat, Hub, Insights, sidebar menu | AI foundation |
| 2026-08-28 | Advanced Reporting — 12 report types, export, charts | Business intelligence |
| 2026-08-28 | Payment Gateway — Midtrans/Xendit config + processing API | Payment processing |
| 2026-08-28 | Email Notification — SMTP config + email templates | Communication |
| 2026-08-28 | File Upload — drag & drop component + logo upload | Document management |
| 2026-08-28 | Bank Reconciliation — manual page + API | Financial reconciliation |
| 2026-08-28 | Desktop App — Electron wrapper | Desktop platform |
| 2026-08-28 | Mobile App Polish — SearchBar, LoadingSkeleton, pull-to-refresh | Mobile UX |
| 2026-08-28 | Chart of Accounts — full CRUD tree view | Finance foundation |
| 2026-08-28 | Seed data — comprehensive demo data | Demo & testing |
| 2026-08-28 | Empty states, Toast notifications, Confirmation dialogs | UX improvements |
| 2026-08-28 | Mobile responsive, Navigation links, Lucide icons | UI consistency |
| 2026-08-18 | i18n support, All modules localized | Internationalization |
| 2026-08-06 | Dashboard stats, Audit trail, Global search, Dark mode | Core features |

---

## 📊 Phase Overview

```
2026 Q3          2026 Q4          2027 Q1          2027 Q2          2027 Q3          2027 Q4
   │                │                │                │                │                │
   ▼                ▼                ▼                ▼                ▼                ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│ MVP  │   →    │Phase1│   →    │Phase2│   →    │Phase3│   →    │Phase4│   →    │Full  │
│Done ✅│        │ NOW  │        │ NEXT │        │LATER │        │LATER │        │Suite │
└──────┘        └──────┘        └──────┘        └──────┘        └──────┘        └──────┘
   │                │                │                │                │                │
 Aug '26        Sep-Oct '26     Nov '26-Feb '27  Mar-May '27    Jun-Aug '27    Sep-Nov '27
```

| Phase | Duration | Focus | Key Deliverables | Status |
|-------|----------|-------|------------------|--------|
| **MVP** | Aug 2026 (Completed) | Core platform + Finance + CRM + HR + Inventory | Foundation ready | ✅ `completed` |
| **Phase 1** | Sep-Oct 2026 (NOW) | Stabilization, bug fixes, production readiness | Production-ready MVP | 🟢 `in_progress` |
| **Phase 2** | Nov 2026-Feb 2027 | Field Service, Advanced Reporting, Basic AI | First paying customers | 🔵 `planned` |
| **Phase 3** | Mar-May 2027 | Full AI Agent Suite, Multi-entity, Marketplace | Differentiated features | 🟡 `planned` |
| **Phase 4** | Jun-Nov 2027 | Enterprise, White-label, Predictive AI | Scale & monetization | 🟡 `planned` |

### Success Criteria Per Phase

| Phase | Metric | Target |
|-------|--------|--------|
| **MVP** | Core flows working | 100% |
| **MVP** | Critical bugs | < 5 |
| **Phase 1** | Beta users | 50 companies |
| **Phase 1** | User satisfaction | > 3.5/5 |
| **Phase 2** | Paying customers | 20 companies |
| **Phase 2** | MRR | Rp 10 juta |
| **Phase 3** | Paying customers | 100 companies |
| **Phase 3** | MRR | Rp 50 juta |
| **Phase 4** | Paying customers | 500 companies |
| **Phase 4** | MRR | Rp 250 juta |

---

## 📈 Success Metrics

### North Star Metric

**Monthly Recurring Revenue (MRR)**

### Supporting Metrics

| Category | Metric | Target (Dec 2027) |
|----------|--------|-------------------|
| **Growth** | MRR | Rp 500 juta |
| **Growth** | Total customers | 500 |
| **Growth** | Customer growth rate | 15% MoM |
| **Retention** | Monthly churn | < 5% |
| **Retention** | NPS | > 50 |
| **Engagement** | DAU/MAU ratio | > 40% |
| **Engagement** | AI feature usage | > 60% |
| **Efficiency** | CAC payback | < 6 months |
| **Efficiency** | LTV/CAC ratio | > 3x |

### Key Milestones

| Date | Milestone | Status |
|------|-----------|--------|
| **Aug 2026** | MVP Development Complete | ✅ Done |
| **Oct 2026** | MVP Beta Launch | 🟢 In Progress |
| **Dec 2026** | MVP → Production | 🔵 Planned |
| **Feb 2027** | 20 Paying Customers | 🔵 Planned |
| **May 2027** | 100 Paying Customers | 🔵 Planned |
| **Aug 2027** | White-label Launch | 🟡 Later |
| **Nov 2027** | 500 Customers | 🟡 Later |

---

## ⚠️ Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scope creep** | High | High | Strict MVP scope, feature flags |
| **Performance issues** | Medium | High | Load testing, optimization sprints |
| **Security breach** | Low | Critical | Security audit, bug bounty |
| **Integration failures** | Medium | Medium | Fallback options, mock services |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low adoption** | Medium | High | Early customer feedback, pivots |
| **Pricing resistance** | Medium | Medium | Tiered pricing, free trial |
| **Competitor response** | High | Medium | Speed to market, differentiation |
| **Regulatory changes** | Low | High | Compliance monitoring |

---

## 📝 Documentation References

| Document | Purpose | Location |
|----------|---------|----------|
| **AGENT.md** | AI Agent development rules | [`AGENT.md`](AGENT.md) |
| **FEATURES.md** | Feature list with status | [`FEATURES.md`](FEATURES.md) |
| **CURRENT.md** | Current state & known issues | [`CURRENT.md`](CURRENT.md) |
| **ARCHITECTURE.md** | System architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **DATABASE.md** | Database schema | [`docs/DATABASE.md`](docs/DATABASE.md) |
| **SECURITY.md** | Security rules | [`docs/SECURITY.md`](docs/SECURITY.md) |
| **UI_UX.md** | UI/UX guidelines | [`docs/UI_UX.md`](docs/UI_UX.md) |

---

**Last Updated:** August 29, 2026
**Maintainer:** Qalcuity Product Team
