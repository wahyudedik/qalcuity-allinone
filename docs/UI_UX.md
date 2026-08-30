# UI/UX

> Dokumentasi desain UI/UX Qalcuity — Design system, components, patterns.
> Last Updated: 2026-08-28

---

## Table of Contents

1. [Design Language](#1-design-language)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing System](#4-spacing-system)
5. [Component Library](#5-component-library)
6. [Icons](#6-icons)
7. [Loading States](#7-loading-states)
8. [Empty States](#8-empty-states)
9. [Error States](#9-error-states)
10. [Responsive Breakpoints](#10-responsive-breakpoints)
11. [Mobile Patterns](#11-mobile-patterns)
12. [Accessibility](#12-accessibility)
13. [Dark Mode](#13-dark-mode)

---

## 1. Design Language

### Principles

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
│  │      │  │                                   │ │    │
│  │      │  ├──────────────────────────────────┤ │    │
│  │      │  │ Pagination / Footer               │ │    │
│  │      │  └──────────────────────────────────┘ │    │
│  └──────┴──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 2. Color System

### Light Mode

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `222.2 84% 4.9%` | Primary text |
| `--card` | `0 0% 100%` | Card background |
| `--card-foreground` | `222.2 84% 4.9%` | Card text |
| `--popover` | `0 0% 100%` | Popover background |
| `--popover-foreground` | `222.2 84% 4.9%` | Popover text |
| `--primary` | `221.2 83.2% 53.3%` | Primary buttons, links |
| `--primary-foreground` | `210 40% 98%` | Text on primary |
| `--secondary` | `210 40% 96.1%` | Secondary buttons |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | Text on secondary |
| `--muted` | `210 40% 96.1%` | Muted backgrounds |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Muted text |
| `--accent` | `210 40% 96.1%` | Accent backgrounds |
| `--accent-foreground` | `222.2 47.4% 11.2%` | Text on accent |
| `--destructive` | `0 84.2% 60.2%` | Delete/danger actions |
| `--destructive-foreground` | `210 40% 98%` | Text on destructive |
| `--border` | `214.3 31.8% 91.4%` | Borders |
| `--input` | `214.3 31.8% 91.4%` | Input borders |
| `--ring` | `221.2 83.2% 53.3%` | Focus rings |

### Dark Mode

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `222.2 84% 4.9%` | Page background |
| `--foreground` | `210 40% 98%` | Primary text |
| `--card` | `222.2 84% 4.9%` | Card background |
| `--primary` | `217.2 91.2% 59.8%` | Primary buttons |
| `--secondary` | `217.2 32.6% 17.5%` | Secondary backgrounds |
| `--muted` | `217.2 32.6% 17.5%` | Muted backgrounds |
| `--destructive` | `0 62.8% 30.6%` | Danger actions |
| `--border` | `217.2 32.6% 17.5%` | Borders |
| `--ring` | `224.3 76.3% 48%` | Focus rings |

### Semantic Colors

| Color | Light | Dark | Usage |
|-------|-------|------|-------|
| **Primary (Blue)** | `#3b82f6` | `#60a5fa` | Primary actions, links |
| **Success (Green)** | `#22c55e` | `#4ade80` | Success states, positive |
| **Warning (Amber)** | `#f59e0b` | `#fbbf24` | Warnings, caution |
| **Danger (Red)** | `#ef4444` | `#f87171` | Errors, destructive |
| **Info (Blue)** | `#3b82f6` | `#60a5fa` | Informational |

### Primary Blue Scale

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#eff6ff` | Light background |
| 100 | `#dbeafe` | Hover background |
| 200 | `#bfdbfe` | Border |
| 300 | `#93c5fd` | Muted |
| 400 | `#60a5fa` | Icons |
| 500 | `#3b82f6` | Primary |
| 600 | `#2563eb` | Hover |
| 700 | `#1d4ed8` | Active |
| 800 | `#1e40af` | Dark |
| 900 | `#1e3a8a` | Darkest |
| 950 | `#172554` | Text on light |

---

## 3. Typography

### Font Family

```css
font-family: 'Inter', system-ui, sans-serif;
```

**Loaded via:** Google Fonts (`@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap")`)

**Config:** [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js) → `fontFamily.sans`

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Captions, secondary text |
| Regular | 400 | Body text |
| Medium | 500 | Labels, emphasis |
| Semi-bold | 600 | Headings, buttons |
| Bold | 700 | Page titles |
| Extra-bold | 800 | Display text |

### Type Scale

| Element | Tailwind Class | Size | Weight |
|---------|---------------|------|--------|
| **Page Title** | `text-2xl font-bold` | 24px | 700 |
| **Section Title** | `text-xl font-semibold` | 20px | 600 |
| **Card Title** | `text-lg font-semibold` | 18px | 600 |
| **Subtitle** | `text-base font-medium` | 16px | 500 |
| **Body** | `text-sm` | 14px | 400 |
| **Small/Caption** | `text-xs` | 12px | 400 |
| **Table Header** | `text-xs font-medium uppercase` | 12px | 500 |
| **Button** | `text-sm font-medium` | 14px | 500 |

### Anti-Aliasing

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 4. Spacing System

### Tailwind Default Scale

| Token | Value | Common Usage |
|-------|-------|-------------|
| `p-1` / `m-1` | 4px | Tight spacing |
| `p-2` / `m-2` | 8px | Small spacing |
| `p-3` / `m-3` | 12px | Card padding |
| `p-4` / `m-4` | 16px | Standard padding |
| `p-5` / `m-5` | 20px | Section spacing |
| `p-6` / `m-6` | 24px | Large section spacing |
| `p-8` / `m-8` | 32px | Page padding |

### Layout Spacing

| Element | Spacing |
|---------|---------|
| **Sidebar width** | `w-64` (256px) |
| **Header height** | `h-16` (64px) |
| **Container max-width** | `max-w-7xl` (1280px) |
| **Container padding** | `px-4 sm:px-6 lg:px-8` |
| **Card padding** | `p-6` (24px) |
| **Table cell padding** | `px-4 py-3` |
| **Button padding** | `px-4 py-2` |
| **Input padding** | `px-3 py-2` |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.5rem` (8px) | Base radius |
| `rounded-lg` | `var(--radius)` | Cards, modals |
| `rounded-md` | `calc(var(--radius) - 2px)` | Buttons, inputs |
| `rounded-sm` | `calc(var(--radius) - 4px)` | Small elements |
| `rounded-full` | `9999px` | Avatars, badges |

---

## 5. Component Library

### Buttons

```tsx
// Primary button
<button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium">

// Secondary button
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium">

// Destructive button
<button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium">

// Ghost button
<button className="hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium">
```

### Forms

| Component | Pattern |
|-----------|---------|
| **Input** | `border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring` |
| **Select** | Same as input with `<select>` |
| **Textarea** | Same as input with `<textarea>` |
| **Label** | `text-sm font-medium` above input |
| **Error** | `text-destructive text-xs mt-1` below input |

### Tables

```tsx
// Table structure
<table className="w-full text-sm">
  <thead>
    <tr className="border-b bg-muted/50">
      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b hover:bg-muted/50">
      <td className="px-4 py-3">Cell</td>
    </tr>
  </tbody>
</table>
```

### Modals

- **Component:** [`apps/web/components/ui/modal.tsx`](apps/web/components/ui/modal.tsx)
- **Pattern:** Overlay + centered card + close button
- **Actions:** Footer with cancel/confirm buttons

### Cards

```tsx
<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-sm text-muted-foreground">Content</p>
</div>
```

### Badges / Status

| Status | Classes |
|--------|---------|
| **Active/Paid** | `bg-success-50 text-success-600` |
| **Pending** | `bg-warning-50 text-warning-600` |
| **Inactive/Cancelled** | `bg-danger-50 text-danger-600` |
| **Draft** | `bg-muted text-muted-foreground` |

### Search Modal

- **Component:** [`apps/web/components/ui/search-modal.tsx`](apps/web/components/ui/search-modal.tsx)
- **Trigger:** Ctrl+K keyboard shortcut
- **Scope:** Global search across all modules

### File Upload

- **Component:** [`apps/web/components/ui/file-upload.tsx`](apps/web/components/ui/file-upload.tsx)
- **Pattern:** Drag & drop zone + file input
- **Usage:** Logo upload, billing proof upload

### Charts

- **Component:** [`apps/web/components/ui/charts.tsx`](apps/web/components/ui/charts.tsx)
- **Types:** Bar, Pie, Line charts
- **Usage:** Dashboard, Reports

### Error Boundary

- **Component:** [`apps/web/components/ui/error-boundary.tsx`](apps/web/components/ui/error-boundary.tsx)
- **Pattern:** Catch errors + fallback UI + retry button

---

## 6. Icons

### Library

**Lucide React** v1.31+ — [`lucide-react`](https://lucide.dev/)

### Consistent Usage

All icons across the application use Lucide React. No emoji icons in production code.

### Common Icons by Module

| Module | Icons Used |
|--------|-----------|
| **Navigation** | LayoutDashboard, ChevronRight, X, Settings |
| **Finance** | Receipt, FileText, CreditCard, BookOpen, Wallet, ShoppingCart |
| **CRM** | TrendingUp, Target, Users, Handshake |
| **Inventory** | Package, Boxes, Tags, Truck |
| **HR** | UsersRound, ClipboardCheck, CalendarOff |
| **Reports** | ScrollText |
| **AI** | Zap, Sparkles |
| **Actions** | Plus, Edit, Trash2, Search, Filter, Download, Upload |

### Icon Sizing

| Context | Size | Tailwind |
|---------|------|----------|
| **Sidebar menu** | 20px | `h-5 w-5` |
| **Table actions** | 16px | `h-4 w-4` |
| **Button icons** | 16px | `h-4 w-4` |
| **Page header** | 24px | `h-6 w-6` |
| **Large feature** | 32px | `h-8 w-8` |

---

## 7. Loading States

### Loading Skeleton

- **Component:** [`apps/web/components/ui/loading-skeleton.tsx`](apps/web/components/ui/loading-skeleton.tsx)
- **Pattern:** Animated gray bars mimicking content shape

```tsx
// Table loading skeleton
<div className="space-y-3">
  {[...Array(5)].map((_, i) => (
    <div key={i} className="h-12 animate-pulse rounded bg-muted" />
  ))}
</div>
```

### Page-Level Loading

- **Next.js loading.tsx files** in each route segment
- **Pattern:** Full-page skeleton matching the page layout

| Page | Loading File |
|------|-------------|
| Dashboard | [`apps/web/app/dashboard/loading.tsx`](apps/web/app/dashboard/loading.tsx) |
| Invoices | [`apps/web/app/dashboard/finance/invoices/loading.tsx`](apps/web/app/dashboard/finance/invoices/loading.tsx) |
| Products | [`apps/web/app/dashboard/inventory/products/loading.tsx`](apps/web/app/dashboard/inventory/products/loading.tsx) |
| Employees | [`apps/web/app/dashboard/hr/employees/loading.tsx`](apps/web/app/dashboard/hr/employees/loading.tsx) |
| ... | (All CRUD pages have loading.tsx) |

### Inline Loading

```tsx
// Button loading state
<button disabled={isLoading}>
  {isLoading ? "Saving..." : "Save"}
</button>

// Or with spinner
<button disabled={isLoading}>
  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
  Save
</button>
```

### Mobile Loading

- **Component:** [`apps/mobile/components/LoadingSkeleton.tsx`](apps/mobile/components/LoadingSkeleton.tsx)
- **Component:** [`apps/mobile/components/LoadingView.tsx`](apps/mobile/components/LoadingView.tsx)
- **Pattern:** Pull-to-refresh + skeleton

---

## 8. Empty States

### Pattern

Every CRUD list page has an empty state when no data exists.

```
┌─────────────────────────────────────────┐
│                                         │
│           📦 (icon)                     │
│                                         │
│     No [entities] yet                   │
│                                         │
│  Create your first [entity] to get      │
│  started.                               │
│                                         │
│        [Create Button]                  │
│                                         │
└─────────────────────────────────────────┘
```

### Implementation

```tsx
<div className="flex flex-col items-center justify-center py-12">
  <Package className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold mb-2">No products yet</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Create your first product to get started.
  </p>
  <Button onClick={handleCreate}>
    <Plus className="h-4 w-4 mr-2" />
    Add Product
  </Button>
</div>
```

---

## 9. Error States

### Page-Level Errors

- **Component:** [`apps/web/app/error.tsx`](apps/web/app/error.tsx) (global)
- **Module-specific:** `error.tsx` in each module layout (finance, hr, inventory, crm, settings)

```
┌─────────────────────────────────────────┐
│                                         │
│           ⚠️ (icon)                     │
│                                         │
│     Something went wrong                │
│                                         │
│  An error occurred while loading        │
│  this page.                             │
│                                         │
│        [Try Again]                      │
│                                         │
└─────────────────────────────────────────┘
```

### API Error Handling

```typescript
// Standard error response
{
  "error": "Not Found",
  "message": "Invoice with id xxx not found"
}

// HTTP Status Codes
200 → Success
201 → Created
400 → Bad Request (validation error)
401 → Unauthorized (not logged in)
403 → Forbidden (insufficient role)
404 → Not Found
409 → Conflict (duplicate)
429 → Too Many Requests (rate limit)
500 → Internal Server Error
```

### Toast Notifications

- **Success:** Green toast on successful CRUD operations
- **Error:** Red toast on failed operations
- **Pattern:** Auto-dismiss after 3-5 seconds

---

## 10. Responsive Breakpoints

### Tailwind Default Breakpoints

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### Layout Behavior

| Element | Mobile (<1024px) | Desktop (≥1024px) |
|---------|-----------------|-------------------|
| **Sidebar** | Hidden (hamburger menu) | Fixed left (w-64) |
| **Header** | Full width + hamburger | Full width |
| **Content** | Full width | Below header, right of sidebar |
| **Table** | Horizontal scroll | Full width |
| **Cards** | Stack vertically | Grid layout |
| **Modals** | Full width bottom sheet | Centered card |

### Container Padding

```css
.container {
  @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
}
```

---

## 11. Mobile Patterns

### Touch Targets

All interactive elements have minimum 44x44px touch targets.

| Element | Min Size |
|---------|----------|
| **Buttons** | 44px height |
| **Links** | 44px touch area |
| **Table rows** | 48px height |
| **Checkboxes** | 44x44px |
| **Icons** | 44x44px touch area |

### Mobile Navigation

```
┌─────────────────────────────────┐
│ ☰  Qalcuity          🔔  👤   │  ← Header with hamburger
├─────────────────────────────────┤
│                                 │
│  Page Content                   │
│  (full width)                   │
│                                 │
│                                 │
├─────────────────────────────────┤
│  (Bottom tabs - planned)        │
└─────────────────────────────────┘
```

### Pull-to-Refresh

- **Mobile app:** [`apps/mobile/components/SearchBar.tsx`](apps/mobile/components/SearchBar.tsx)
- **Pattern:** Pull down to refresh data

### Mobile Components

| Component | File | Purpose |
|-----------|------|---------|
| EmptyView | [`apps/mobile/components/EmptyView.tsx`](apps/mobile/components/EmptyView.tsx) | Empty state |
| ErrorView | [`apps/mobile/components/ErrorView.tsx`](apps/mobile/components/ErrorView.tsx) | Error state |
| LoadingSkeleton | [`apps/mobile/components/LoadingSkeleton.tsx`](apps/mobile/components/LoadingSkeleton.tsx) | Loading state |
| LoadingView | [`apps/mobile/components/LoadingView.tsx`](apps/mobile/components/LoadingView.tsx) | Full-page loading |
| SearchBar | [`apps/mobile/components/SearchBar.tsx`](apps/mobile/components/SearchBar.tsx) | Search with filter |

---

## 12. Accessibility

### Current Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| **Semantic HTML** | ✅ | `<nav>`, `<main>`, `<header>`, `<table>` |
| **Focus visible** | ✅ | Tailwind `focus:ring-2 focus:ring-ring` |
| **Color contrast** | ✅ | WCAG AA compliant (HSL values) |
| **Keyboard navigation** | ⚠️ Partial | Tab navigation works, some gaps |
| **ARIA labels** | 🔲 | Not systematically applied |
| **Screen reader** | 🔲 | Not tested |
| **Reduced motion** | 🔲 | No `prefers-reduced-motion` handling |

### Focus Management

```css
/* Focus ring for interactive elements */
*:focus-visible {
  @apply ring-2 ring-ring ring-offset-2;
}
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open global search |
| `Escape` | Close modals/overlays |
| `Tab` | Navigate between elements |
| `Enter` | Submit forms, activate buttons |

### Color Contrast Ratios

| Combination | Ratio | WCAG Level |
|-------------|-------|------------|
| Primary on White | 4.6:1 | AA ✅ |
| Muted on White | 3.8:1 | AA (large text) ✅ |
| White on Primary | 4.6:1 | AA ✅ |
| Foreground on Background | 15.4:1 | AAA ✅ |

---

## 13. Dark Mode

### Implementation

- **Method:** CSS class (`darkMode: "class"` in Tailwind config)
- **Toggle:** Client-side state (localStorage or context)
- **Config:** [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js)

### CSS Variables

Light and dark mode values are defined in [`apps/web/app/globals.css`](apps/web/app/globals.css):

```css
:root { /* Light mode values */ }
.dark { /* Dark mode values */ }
```

### Usage Pattern

```tsx
// Tailwind dark mode classes
<div className="bg-white dark:bg-gray-900">
  <span className="text-gray-900 dark:text-gray-100">
    Adaptive text
  </span>
  <span className="text-muted-foreground">
    Uses CSS variables (auto-adapts)
  </span>
</div>
```

### Best Practices

1. **Prefer CSS variables** over explicit dark: classes when possible
2. **Use semantic tokens** (`bg-card`, `text-foreground`) over raw colors
3. **Test both modes** before committing changes
4. **Avoid hardcoded colors** in components

---

## File Reference

| File | Purpose |
|------|---------|
| [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js) | Tailwind configuration (colors, fonts, radius) |
| [`apps/web/app/globals.css`](apps/web/app/globals.css) | CSS variables (light/dark), base styles |
| [`apps/web/components/ui/charts.tsx`](apps/web/components/ui/charts.tsx) | Chart components |
| [`apps/web/components/ui/error-boundary.tsx`](apps/web/components/ui/error-boundary.tsx) | Error boundary |
| [`apps/web/components/ui/file-upload.tsx`](apps/web/components/ui/file-upload.tsx) | File upload component |
| [`apps/web/components/ui/loading-skeleton.tsx`](apps/web/components/ui/loading-skeleton.tsx) | Loading skeleton |
| [`apps/web/components/ui/modal.tsx`](apps/web/components/ui/modal.tsx) | Modal component |
| [`apps/web/components/ui/search-modal.tsx`](apps/web/components/ui/search-modal.tsx) | Global search (Ctrl+K) |
| [`apps/web/components/layout/sidebar.tsx`](apps/web/components/layout/sidebar.tsx) | Navigation sidebar |
| [`apps/web/components/layout/header.tsx`](apps/web/components/layout/header.tsx) | Page header |
| [`apps/web/components/layout/dashboard-layout.tsx`](apps/web/components/layout/dashboard-layout.tsx) | Dashboard layout wrapper |
