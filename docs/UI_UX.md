# 🎨 Qalcuity — UI/UX Architecture

> **Last Updated:** 30 Agustus 2026
> **Current Version:** v1.0.0-beta.1

---

## 📋 Daftar Isi

1. [Design System](#1-design-system)
2. [Component Patterns](#2-component-patterns)
3. [Navigation](#3-navigation)
4. [Responsive Design](#4-responsive-design)
5. [i18n](#5-i18n)
6. [Icons](#6-icons)
7. [Dark Mode](#7-dark-mode)

---

## 1. Design System

### Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Styling** | Tailwind CSS | 3.4 |
| **Design Tokens** | `@qalcuity/ui` | — |
| **Icons** | Lucide React | 1.31+ |
| **Font** | Inter (Google Fonts) | — |
| **Dark Mode** | class-based toggle | — |

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Clean & Professional** | Minimal visual noise, focus on data |
| **Mobile-First** | Designed for touch, scales to desktop |
| **Consistent** | Unified patterns across all modules |
| **Accessible** | Readable contrast, keyboard navigable |
| **Fast** | Minimal load times, optimistic updates |

### Visual Identity

| Aspect | Choice |
|--------|--------|
| **Style** | Modern SaaS dashboard |
| **Border radius** | CSS variable `--radius: 0.5rem` |
| **Shadows** | Subtle, layered (Tailwind defaults) |
| **Borders** | 1px solid, color from `--border` |
| **Animations** | Minimal, functional (transitions on hover/focus) |

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Header (h-16)                                      │
│  ┌──────┬──────────────────────────────────────┐    │
│  │      │  Page Content                         │    │
│  │ Side │  ┌──────────────────────────────────┐ │    │
│  │ bar  │  │ Breadcrumb / Title                │ │    │
│  │      │  ├──────────────────────────────────┤ │    │
│  │(w-64)│  │ Filters / Actions bar             │ │    │
│  │      │  ├──────────────────────────────────┤ │    │
│  │      │  │ Data Table / Content              │ │    │
│  │      │  │                                   │ │    │
│  │      │  ├──────────────────────────────────┤ │    │
│  │      │  │ Pagination / Footer               │ │    │
│  │      │  └──────────────────────────────────┘ │    │
│  └──────┴──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 2. Component Patterns

### Responsive Tables

> **Semua list pages harus memiliki dual layout: mobile cards + desktop tables.**

- **Desktop (>768px):** Tabel dengan sorting & filtering
- **Mobile (≤768px):** Card-based layout dengan info yang sama
- Gunakan pattern yang sudah ada di pages lain sebagai referensi
- Pastikan semua kolom tabel terwakili di card view

**Coverage:** 17 pages dengan dual layout

### Loading States

> **Semua detail pages WAJIB memiliki `loading.tsx` file.**

- Letakkan di path yang sama dengan `page.tsx`
- Gunakan skeleton/placeholder yang sesuai dengan konten
- Konsisten dengan loading patterns di halaman lain

**Coverage:** 9 `loading.tsx` files

| Page | Path |
|------|------|
| Dashboard | `app/dashboard/loading.tsx` |
| Invoice Detail | `app/dashboard/finance/invoices/[id]/loading.tsx` |
| PO Detail | `app/dashboard/finance/purchase-orders/[id]/loading.tsx` |
| Quotation Detail | `app/dashboard/finance/quotations/[id]/loading.tsx` |
| Contact Detail | `app/dashboard/crm/contacts/[id]/loading.tsx` |
| Lead Detail | `app/dashboard/crm/leads/[id]/loading.tsx` |
| Deal Detail | `app/dashboard/crm/deals/[id]/loading.tsx` |
| Employee Detail | `app/dashboard/hr/employees/[id]/loading.tsx` |
| Supplier Detail | `app/dashboard/inventory/suppliers/[id]/loading.tsx` |

### Empty States

- All CRUD pages have empty state UI
- Shows when no data is available
- Includes call-to-action button for creating first item

### Error Handling

- `error.tsx` for all module sections
- Error boundary with retry capability
- Module-level error isolation

**Coverage:** `error.tsx` files for CRM, Finance, HR, Inventory sections

### Modals

- Reusable Modal component
- Confirmation dialogs for delete operations
- Covering 14+ pages

### Toast Notifications

- Success/error feedback for all CRUD operations
- Non-intrusive positioning
- Auto-dismiss after timeout

---

## 3. Navigation

### Sidebar Structure

```
┌──────────────────────┐
│  Logo + Company Name │
├──────────────────────┤
│  Dashboard           │
├──────────────────────┤
│  Finance             │
│  ├─ Invoices         │
│  ├─ Payments         │
│  ├─ Purchase Orders  │
│  ├─ Quotations       │
│  ├─ Accounts (CoA)   │
│  └─ Reconciliation   │
├──────────────────────┤
│  CRM                 │
│  ├─ Contacts         │
│  ├─ Leads            │
│  ├─ Deals            │
│  └─ Pipeline         │
├──────────────────────┤
│  HR                  │
│  ├─ Employees        │
│  ├─ Attendance       │
│  ├─ Leaves           │
│  └─ Payroll          │
├──────────────────────┤
│  Inventory           │
│  ├─ Products         │
│  ├─ Categories       │
│  ├─ Suppliers        │
│  └─ Stock            │
├──────────────────────┤
│  Reports             │
│  AI                  │
├──────────────────────┤
│  Settings (Admin)    │
│  Audit Trail (Admin) │
└──────────────────────┘
```

### Role-based Menu Filtering

| Role | Visible Menus |
|------|--------------|
| **SUPERADMIN** | All menus |
| **ADMIN** | All menus (including Settings, Audit Trail) |
| **MEMBER** | All EXCEPT Settings, Audit Trail |
| **VIEWER** | All EXCEPT Settings, Audit Trail |

### Global Search

- **Shortcut:** Ctrl+K (Cmd+K on Mac)
- **Scope:** Across all modules
- **API:** `/api/search`

### Breadcrumbs

- Present for deep pages (e.g., Finance > Invoices > INV-001)
- Clickable for navigation

---

## 4. Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| **Mobile** | ≤ 768px | Card-based, single column |
| **Tablet** | 769-1024px | Condensed table, sidebar collapsible |
| **Desktop** | > 1024px | Full table, sidebar visible |

### Touch Targets

- Minimum 44x44px for all interactive elements
- Mobile-first approach

### Mobile Patterns

- Pull-to-refresh on list pages
- Card-based data display
- Bottom navigation (future)
- Swipe gestures (future)

---

## 5. i18n

### Languages

| Language | Status | Keys |
|----------|--------|------|
| **Bahasa Indonesia** | ✅ Primary | 200+ |
| **English** | ✅ Secondary | 200+ |

### Implementation

- **Provider:** Custom i18n provider ([`apps/web/lib/i18n.tsx`](apps/web/lib/i18n.tsx))
- **Translation files:** [`apps/web/messages/id.json`](apps/web/messages/id.json), [`apps/web/messages/en.json`](apps/web/messages/en.json)
- **Coverage:** 20+ pages localized

### Usage Pattern

```typescript
import { useTranslation } from '@/lib/i18n';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

---

## 6. Icons

### Library

- **Package:** Lucide React
- **Consistency:** All icons from single library (no emoji)
- **Coverage:** All modules

### Usage Pattern

```typescript
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

// Consistent sizing
<Plus className="h-4 w-4" />   // Small (buttons, inline)
<Edit className="h-5 w-5" />   // Medium (table actions)
<Eye className="h-6 w-6" />    // Large (page headers)
```

### Icon Categories

| Category | Icons Used |
|----------|-----------|
| **Actions** | Plus, Edit, Trash2, Eye, Download, Upload |
| **Navigation** | ChevronRight, ArrowLeft, Menu, X |
| **Status** | Check, AlertTriangle, Clock, XCircle |
| **Modules** | DollarSign, Users, Package, FileText, BarChart3 |
| **Finance** | CreditCard, Receipt, Banknote, Wallet |
| **CRM** | Contact, Lead, Deal, Kanban |
| **HR** | UserCheck, Calendar, Clock, Briefcase |

---

## 7. Dark Mode

### Implementation

- **Method:** CSS class-based toggle (`dark` class on `<html>`)
- **Toggle:** Header button (sun/moon icon)
- **Persistence:** localStorage

### Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `0 0% 100%` | `222.2 84% 4.9%` |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` |
| `--card` | `0 0% 100%` | `222.2 84% 4.9%` |
| `--primary` | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` |
| `--secondary` | `210 40% 96.1%` | `217.2 32.6% 17.5%` |
| `--muted` | `210 40% 96.1%` | `217.2 32.6% 17.5%` |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` |
| `--border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` |
| `--ring` | `221.2 83.2% 53.3%` | `224.3 76.3% 48%` |

---

**Last Updated:** August 30, 2026
**Maintainer:** Qalcuity Design Team
