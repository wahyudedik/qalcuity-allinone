# 🗺️ Qalcuity All-in-One — Product Roadmap

> **Vision:** Menjadi B2B Operating System #1 untuk UKM & Mid-Market Indonesia

### 📌 Business Model

> **Qalcuity = Aplikasi + Server + AI built-in.** Developer hanya menyediakan aplikasi SaaS dan server. User menyewa aplikasi dan mendapatkan update fitur berkala. **Tidak ada biaya integrasi dari sisi Qalcuity** — user yang bayar API pihak ketiga (WhatsApp, Shopee, Payment Gateway, dll) langsung ke provider masing-masing.

### 🖥️ Platform Strategy

| Platform | Target Users | Key Features |
|----------|-------------|--------------|
| **Web App** | Admin, Finance, HR, Manager | Full features, admin panel, reporting |
| **Desktop App** | Staff, Operator | Offline mode, heavy data entry |
| **Mobile App** | Field team, Sales, Management | Quick actions, approvals, notifications |

---

## 📋 Daftar Isi

1. [Vision & Strategy](#1-vision--strategy)
2. [Timeline Overview](#2-timeline-overview)
3. [Phase 1: MVP Foundation](#3-phase-1-mvp-foundation)
4. [Phase 2: Core Modules](#4-phase-2-core-modules)
5. [Phase 3: Advanced Features](#5-phase-3-advanced-features)
6. [Phase 4: Enterprise & Scale](#6-phase-4-enterprise--scale)
7. [Key Milestones](#7-key-milestones)
8. [Success Metrics](#8-success-metrics)
9. [Risks & Mitigation](#9-risks--mitigation)
10. [Resource Planning](#10-resource-planning)

---

## 1. Vision & Strategy

### Product Vision

> "All-in-One B2B Operating System untuk UKM & Mid-Market Indonesia — Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja."

### Strategic Pillars

| Pillar | Description |
|--------|-------------|
| **Unified Platform** | Satu aplikasi untuk semua kebutuhan bisnis (Web, Desktop, Mobile) |
| **AI-Native** | AI built-in, bukan sekadar fitur tambahan |
| **Compliance** | Built-in untuk regulasi Indonesia (Coretax, PDP) |
| **Offline-Capable** | Desktop & Mobile bisa offline, sync saat online |
| **Modularity** | Bisa pakai per modul, bayar sesuai kebutuhan |
| **User-Managed Integration** | User kelola integrasi pihak ketiga sendiri via dashboard |

### Target Market

| Segment | Size | Priority |
|---------|------|----------|
| **UMKM** (1-5 karyawan) | ~64 juta usaha | Phase 1-2 |
| **UKM** (6-25 karyawan) | ~500K usaha | Phase 1-2 |
| **Mid-market** (26-100 karyawan) | ~50K usaha | Phase 2-3 |
| **Enterprise** (100+ karyawan) | ~10K usaha | Phase 3-4 |

### Competitive Landscape

| Competitor | Weakness | Our Advantage |
|------------|----------|---------------|
| Jurnal.id | Limited AI, basic HR | AI-native, full HR module |
| Mekari | Fragmented products | Unified platform |
| Zoho | Poor localization | Indonesia-first |
| Odoo | Complex setup | Easy onboarding |

---

## 2. Timeline Overview

```
2026 Q3          2026 Q4          2027 Q1          2027 Q2          2027 Q3          2027 Q4
   │                │                │                │                │                │
   ▼                ▼                ▼                ▼                ▼                ▼
┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐        ┌──────┐
│ MVP  │   →    │Phase1│   →    │Phase2│   →    │Phase3│   →    │Phase4│   →    │Full  │
│Launch│        │  +   │        │  +   │        │  +   │        │  +   │        │Suite │
└──────┘        └──────┘        └──────┘        └──────┘        └──────┘        └──────┘
   │                │                │                │                │                │
   │                │                │                │                │                │
 Aug '26        Nov '26         Feb '27         May '27         Aug '27         Nov '27
```

### Quick Summary

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **MVP** | Aug-Oct 2026 (12 weeks) | Core platform + Finance | Foundation ready for beta |
| **Phase 1** | Nov 2026-Feb 2027 (14 weeks) | Sales + Inventory + Mobile | First paying customers |
| **Phase 2** | Mar-May 2027 (12 weeks) | HR + Operations + AI | Full module coverage |
| **Phase 3** | Jun-Aug 2027 (12 weeks) | Advanced AI + Integrations | Differentiated features |
| **Phase 4** | Sep-Nov 2027 (12 weeks) | Enterprise + White-label | Scale & monetization |

---

## 3. Phase 1: MVP Foundation

**Duration:** August - October 2026 (12 weeks)
**Goal:** Launch beta dengan core features yang usable

### Week 1-4: Infrastructure & Core Platform

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 1 | Setup CI/CD pipeline | DevOps | ⬜ |
| 1 | Database schema design | Backend | ⬜ |
| 1-2 | Authentication & authorization | Backend | ⬜ |
| 2-3 | Core UI components (design system) | Frontend | ⬜ |
| 3-4 | Dashboard layout | Frontend | ⬜ |
| 3-4 | Web App (core utama) | Frontend | ⬜ |
| 4 | Multi-role access control | Backend | ⬜ |
| 4 | Integration Hub (dashboard) | Full-stack | ⬜ |

### Week 5-8: Finance Module (Basic)

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 5-6 | Chart of Account setup | Backend | ⬜ |
| 5-6 | Invoice creation & management | Full-stack | ⬜ |
| 6-7 | Quotation management | Full-stack | ⬜ |
| 7-8 | Payment recording | Backend | ⬜ |
| 7-8 | Basic financial reports | Full-stack | ⬜ |
| 8 | Bank reconciliation (manual) | Backend | ⬜ |

### Week 9-12: Sales CRM (Basic) + Mobile + AI

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 9-10 | Lead management | Full-stack | ⬜ |
| 9-10 | Pipeline (Kanban view) | Frontend | ⬜ |
| 10-11 | Deal management | Full-stack | ⬜ |
| 11 | Quote → Invoice flow | Full-stack | ⬜ |
| 11-12 | Mobile app (iOS & Android) | Mobile | ⬜ |
| 11-12 | Basic AI insights | AI/ML | ⬜ |
| 12 | Integration Hub v1 | Full-stack | ⬜ |

### MVP Deliverables

- [ ] Web App (core utama) — auth, dashboard, audit trail
- [ ] Finance module (invoice, quotation, payment)
- [ ] Sales CRM (leads, pipeline, deals)
- [ ] Mobile App (iOS & Android) — basic features
- [ ] Integration Hub — dashboard untuk user-managed integrations
- [ ] AI basic — insights cards di dashboard
- [ ] Landing page & documentation

### MVP Success Criteria

| Metric | Target |
|--------|--------|
| Beta users | 50 companies |
| User satisfaction | > 3.5/5 |
| Critical bugs | < 5 |
| Core flows working | 100% |

---

## 4. Phase 2: Core Modules

**Duration:** November 2026 - February 2027 (14 weeks)
**Goal:** First paying customers, full basic modules

### Week 1-4: Inventory Module

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 1-2 | Product catalog | Full-stack | ⬜ |
| 2-3 | Stock management | Backend | ⬜ |
| 3 | Purchase order | Full-stack | ⬜ |
| 3-4 | Supplier management | Full-stack | ⬜ |
| 4 | Basic reports | Full-stack | ⬜ |

### Week 5-8: Desktop App + Advanced Finance

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 5-6 | Desktop App (Electron) | Desktop | ⬜ |
| 6-7 | Offline sync engine | Backend | ⬜ |
| 7-8 | Desktop-specific UI | Frontend | ⬜ |

### Week 9-12: Finance Advanced + Tax + Mobile Enhancement

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 9-10 | Bank reconciliation (auto) | Backend | ⬜ |
| 9-10 | Expense management | Full-stack | ⬜ |
| 10-11 | e-Faktur integration | Backend | ⬜ |
| 11-12 | PPh 21 calculation | Backend | ⬜ |
| 11-12 | Coretax readiness | Backend | ⬜ |
| 11-12 | Advanced financial reports | Full-stack | ⬜ |

### Week 13-14: Mobile Enhancement + Launch Prep

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 13 | Offline mode (Mobile) | Mobile | ⬜ |
| 13 | Push notifications | Mobile | ⬜ |
| 13 | Payment gateway integration | Backend | ⬜ |
| 14 | AI suggestions (basic) | AI/ML | ⬜ |
| 14 | Landing page update | Marketing | ⬜ |
| 14 | Documentation | Tech Writer | ⬜ |
| 14 | Beta → Production migration | DevOps | ⬜ |

### Phase 2 Deliverables

- [ ] Full inventory module
- [ ] Desktop App (Electron) — offline capable
- [ ] Advanced finance (bank reconciliation, tax)
- [ ] Enhanced mobile (offline, notifications)
- [ ] AI features v2
- [ ] Payment gateway integration

### Phase 2 Success Criteria

| Metric | Target |
|--------|--------|
| Paying customers | 20 companies |
| MRR | Rp 10 juta |
| NPS | > 30 |
| Churn rate | < 10% monthly |

---

## 5. Phase 3: Advanced Features

**Duration:** March - May 2027 (12 weeks)
**Goal:** HR + Operations modules, advanced AI

### Week 1-4: HR Module

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 1-2 | Employee database | Full-stack | ⬜ |
| 2-3 | Attendance (GPS check-in) | Full-stack | ⬜ |
| 3 | Leave management | Full-stack | ⬜ |
| 3-4 | Payroll (basic) | Backend | ⬜ |
| 4 | Template builder (basic) | Full-stack | ⬜ |

### Week 5-8: Operations & Project

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 5-6 | Project management | Full-stack | ⬜ |
| 6-7 | Task & time tracking | Full-stack | ⬜ |
| 7-8 | Field service (basic) | Full-stack | ⬜ |
| 8 | Quality checklist | Full-stack | ⬜ |

### Week 9-12: Advanced AI

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 9-10 | Natural language query | AI/ML | ⬜ |
| 10-11 | Document extraction | AI/ML | ⬜ |
| 11-12 | AI template generator | AI/ML | ⬜ |
| 11-12 | Anomaly detection | AI/ML | ⬜ |

### Phase 3 Deliverables

- [ ] Full HR module (attendance, leave, payroll, templates)
- [ ] Project management
- [ ] Field service basic
- [ ] Advanced AI features
- [ ] Document extraction

### Phase 3 Success Criteria

| Metric | Target |
|--------|--------|
| Paying customers | 100 companies |
| MRR | Rp 50 juta |
| AI feature usage | > 40% of users |
| NPS | > 40 |

---

## 6. Phase 4: Enterprise & Scale

**Duration:** June - November 2027 (24 weeks)
**Goal:** Enterprise features, white-label, full ecosystem

### Week 1-8: Enterprise Features

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 1-4 | Multi-entity support | Backend | ⬜ |
| 3-6 | Advanced approval workflows | Backend | ⬜ |
| 5-8 | SSO integration | Backend | ⬜ |
| 5-8 | Advanced security features | Security | ⬜ |

### Week 9-16: Integration Dashboard Advanced

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 9-12 | Integration Dashboard v2 (marketplace templates) | Backend | ⬜ |
| 9-12 | OAuth 2.0 flow (user authorize sendiri) | Backend | ⬜ |
| 11-14 | Shipping integration templates | Backend | ⬜ |
| 13-16 | Open API v2 | Backend | ⬜ |
| 13-16 | Webhook builder (user-custom) | Full-stack | ⬜ |
| 13-16 | API documentation & sandbox | Full-stack | ⬜ |

### Week 17-24: White-label & Advanced AI

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 17-20 | White-label platform | Full-stack | ⬜ |
| 17-20 | Reseller portal | Full-stack | ⬜ |
| 21-24 | Full AI Agent suite | AI/ML | ⬜ |
| 21-24 | Predictive analytics | AI/ML | ⬜ |

### Phase 4 Deliverables

- [ ] Multi-entity & advanced security
- [ ] Integration Dashboard v2 (templates, OAuth flow, webhooks)
- [ ] White-label platform
- [ ] Full AI Agent suite
- [ ] Open API v2

### Phase 4 Success Criteria

| Metric | Target |
|--------|--------|
| Paying customers | 500 companies |
| MRR | Rp 250 juta |
| White-label partners | 10 agencies |
| Enterprise customers | 20 companies |

---

## 7. Key Milestones

### 2026

| Date | Milestone | Dependencies |
|------|-----------|--------------|
| **Aug 2026** | MVP Development Start | Team hired |
| **Oct 2026** | MVP Beta Launch | MVP complete |
| **Nov 2026** | First 50 Beta Users | Marketing push |
| **Dec 2026** | MVP → Production | Beta feedback |
| **Dec 2026** | First Paying Customer | Sales ready |

### 2027

| Date | Milestone | Dependencies |
|------|-----------|--------------|
| **Feb 2027** | 20 Paying Customers | Product-market fit |
| **Mar 2027** | HR Module Launch | HR development |
| **May 2027** | 100 Paying Customers | Growth marketing |
| **Jun 2027** | Enterprise Tier Launch | Enterprise features |
| **Aug 2027** | White-label Launch | White-label ready |
| **Nov 2027** | 500 Customers | Scale operations |
| **Dec 2027** | Series A Readiness | Metrics achieved |

---

## 8. Success Metrics

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

### OKR Framework

#### Objective 1: Achieve Product-Market Fit
- KR1: 100 paying customers by May 2027
- KR2: NPS > 40 by Q2 2027
- KR3: Monthly churn < 8% by Q2 2027

#### Objective 2: Build AI-Powered Differentiation
- KR1: AI features used by > 40% of users
- KR2: AI accuracy > 90% for key features
- KR3: Time saved > 5 hours/user/week

#### Objective 3: Scale Revenue
- KR1: MRR Rp 250 juta by Nov 2027
- KR2: ACV > Rp 10 juta for mid-market
- KR3: White-label contributing 20% of revenue

---

## 9. Risks & Mitigation

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

### Resource Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Key person departure** | Medium | High | Documentation, knowledge sharing |
| **Hiring delays** | High | Medium | Contractor network, outsourcing |
| **Budget overrun** | Medium | High | Monthly reviews, contingency |

---

## 10. Resource Planning

### Team Structure

#### Phase 1 (MVP): 10 people

| Role | Count | Responsibility |
|------|-------|----------------|
| **Product Manager** | 1 | Strategy, roadmap, priorities |
| **Tech Lead** | 1 | Architecture, code review |
| **Backend Engineer** | 2 | API, database, integrations |
| **Frontend Engineer** | 2 | Web App (core utama), design system |
| **Mobile Engineer** | 2 | iOS & Android apps |
| **DevOps** | 1 | Infrastructure, CI/CD |
| **UI/UX Designer** | 1 | Design system, user flows |

#### Phase 2: 14 people (+4)

| Role | Count | Responsibility |
|------|-------|----------------|
| **Desktop Engineer** | 1 | Desktop App (Electron) |
| **HR Module Lead** | 1 | HR module development |
| **AI/ML Engineer** | 1 | AI features |
| **QA Engineer** | 1 | Testing, quality |

#### Phase 3: 18 people (+4)

| Role | Count | Responsibility |
|------|-------|----------------|
| **Security Engineer** | 1 | Security, compliance |
| **Data Engineer** | 1 | Data pipeline, analytics |
| **Technical Writer** | 1 | Documentation |
| **Customer Success** | 1 | Onboarding, support |

#### Phase 4: 26 people (+8)

| Role | Count | Responsibility |
|------|-------|----------------|
| **Enterprise Sales** | 2 | Enterprise customers |
| **Solution Architect** | 1 | Custom implementations |
| **Partner Manager** | 1 | White-label partners |
| **Support Engineer** | 2 | User support, integration help |
| **Additional Engineers** | 3 | Scale & features |

### Budget Allocation

#### Phase 1 (MVP): Rp 500 juta

| Category | Amount | Percentage |
|----------|--------|------------|
| **Salaries** | Rp 350 juta | 70% |
| **Infrastructure** | Rp 50 juta | 10% |
| **Tools & Licenses** | Rp 30 juta | 6% |
| **Marketing** | Rp 40 juta | 8% |
| **Contingency** | Rp 30 juta | 6% |

#### Annual Budget Growth

| Year | Budget | Revenue Target | Burn Rate |
|------|--------|----------------|-----------|
| 2026 | Rp 750 juta | Rp 50 juta | Rp 60 juta/bulan |
| 2027 | Rp 3 miliar | Rp 3 miliar | Rp 250 juta/bulan |
| 2028 | Rp 10 miliar | Rp 15 miliar | Break-even |

---

## 📅 Weekly Status Updates

### August 2026

| Week | Progress | Blockers | Next Week |
|------|----------|----------|-----------|
| W1 (Aug 1-7) | - | - | Kickoff, setup |
| W2 (Aug 8-14) | - | - | - |
| W3 (Aug 15-21) | - | - | - |
| W4 (Aug 22-31) | - | - | - |

*Fill in weekly as development progresses*

---

## 📌 Platform Summary

| Platform | Development | Target Users | Key Differentiator |
|----------|-------------|-------------|-------------------|
| **Web App** | Phase 1 (MVP) | Admin, Finance, HR, Manager | Core utama, full features |
| **Mobile App** | Phase 1 (MVP) | Field team, Sales, Management | Offline mode, quick actions |
| **Desktop App** | Phase 2 | Staff, Operator | Offline capable, heavy data entry |

### Integration Philosophy

> **User-Managed Integrations** — Qalcuity menyediakan Integration Dashboard tempat user plug API key mereka sendiri. User yang bayar ke provider pihak ketiga (WhatsApp, Shopee, Xendit, dll). Qalcuity **tidak membeli atau menyediakan** API pihak ketiga.

| Integration Type | Method | User Action | Siapa Bayar |
|-----------------|--------|-------------|-------------|
| **API Key** | User masukkan API key di dashboard | Self-service | User ke provider |
| **OAuth 2.0** | User authorize via browser | Click & connect | User ke provider |
| **Webhook** | User set URL endpoint | Configuration | Gratis |
| **CSV Import** | User upload file | Manual upload | Gratis |

### Revenue Model

| Revenue Stream | Description |
|---------------|-------------|
| **Subscription** | Sewa aplikasi bulanan/tahunan per tier |
| **Add-on Modules** | Module tambahan (Field Service, Advanced AI, dll) |
| **White-label** | Reseller bisa jual ulang dengan branding sendiri |
| **Enterprise** | Custom deployment untuk perusahaan besar |

---

## 🔄 Change Log

| Date | Change | Author |
|------|--------|--------|
| Aug 3, 2026 | Initial roadmap created | Product Team |

---

## 📞 Contacts

| Role | Name | Email |
|------|------|-------|
| **Product Manager** | TBD | product@qalcuity.com |
| **Tech Lead** | TBD | tech@qalcuity.com |
| **CEO** | TBD | ceo@qalcuity.com |

---

**Last Updated:** August 3, 2026
**Maintainer:** Qalcuity Product Team
