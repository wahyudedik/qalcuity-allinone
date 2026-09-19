# 🔍 Investigasi Error: `totalUsers` TypeError di Production

**Date:** 2026-09-18  
**Status:** Root Cause Identified  
**Severity:** 🔴 High — Crash di halaman Tenant Detail (Platform Admin)

---

## Error Details

```
TypeError: Cannot read properties of undefined (reading 'totalUsers')
at T (page-0a34275f2d205a0b.js:1:9471)
```

- **Lokasi:** Client-side React rendering error di production (https://qalcuity.com)
- **Chunk:** `page-0a34275f2d205a0b.js` — minified Next.js build chunk
- **Error Pattern:** Mencoba mengakses property `totalUsers` pada object `undefined`

---

## 🔴 Root Cause (Confirmed)

### File Sumber Error
**[`apps/web/app/platform/tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx:421) — Line 421**

```tsx
<p className="text-lg font-bold text-gray-900 dark:text-white">
    {tenant.stats.totalUsers}  // ← CRASH: tenant.stats is undefined
</p>
```

### API Endpoint Terkait
**[`apps/web/app/api/platform/tenants/[id]/route.ts`](apps/web/app/api/platform/tenants/[id]/route.ts:13) — GET Handler**

### Penyebab

GET handler di file [`[id]/route.ts`](apps/web/app/api/platform/tenants/[id]/route.ts:13) **adalah salinan dari list endpoint** dan TIDAK menggunakan parameter `id` dari URL. Handler ini mengembalikan **array of tenants (list)** alih-alih **single tenant detail dengan `stats`**.

#### Alur Error Lengkap:

1. **Detail page** memanggil `fetch(/api/platform/tenants/${tenantId})` — route ini match ke [`[id]/route.ts`](apps/web/app/api/platform/tenants/[id]/route.ts:13)
2. **GET handler** mengabaikan `id` parameter dan mengembalikan response format list:
   ```json
   {
     "success": true,
     "data": [
       { "id": "...", "name": "...", "userCount": 5, ... },
       { "id": "...", "name": "...", "userCount": 3, ... }
     ],
     "pagination": { "page": 1, "limit": 10, "total": 25, ... }
   }
   ```
3. **Page component** melakukan `setTenant(data.data)` — `tenant` menjadi **ARRAY** (bukan object)
4. **Null guard** `if (error || !tenant)` di [line 320](apps/web/app/platform/tenants/[id]/page.tsx:320) **PASS** karena array adalah truthy
5. **Access** `tenant.stats` → `undefined` (array tidak punya property `stats`)
6. **Access** `tenant.stats.totalUsers` → **TypeError: Cannot read properties of undefined (reading 'totalUsers')**

#### Bukti di Code:

**GET handler di [`[id]/route.ts`](apps/web/app/api/platform/tenants/[id]/route.ts:13):**
```typescript
// ❌ Signature tidak mengambil params (id)
export async function GET(request: Request) {
    // ❌ Tidak ada extract id dari params
    const { searchParams } = new URL(request.url);
    // ... list logic, bukan detail logic
    
    // ❌ Return array, bukan single object
    return NextResponse.json({
        success: true,
        data: formattedTenants,  // ← ARRAY of tenants
        pagination: { ... },
    });
}
```

**Page component di [`tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx:169):**
```typescript
// Memanggil endpoint detail
const res = await fetch(`/api/platform/tenants/${tenantId}`);
const data = await res.json();
if (data.success && data.data) {
    setTenant(data.data);  // ← data.data adalah ARRAY, bukan single object
}
```

**Render di [`tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx:421):**
```typescript
// tenant adalah array, tenant.stats = undefined
{tenant.stats.totalUsers}  // ← CRASH
```

---

## ✅ Page Lain yang Aman (Verified)

### 1. Platform Dashboard — [`apps/web/app/platform/page.tsx`](apps/web/app/platform/page.tsx:252)
- **Status:** ✅ Aman
- `stats` diinisialisasi dengan `defaultStats` (memiliki `totalUsers: 0`)
- Fetch menggunakan `?? 0` fallback untuk semua field
- `stats.totalUsers` selalu bernilai number

### 2. Monitoring Page — [`apps/web/app/platform/monitoring/page.tsx`](apps/web/app/platform/monitoring/page.tsx:491)
- **Status:** ✅ Aman
- `db = data?.database` (line 264) menggunakan optional chaining
- Akses `db.totalUsers` (line 491) di-guard oleh `{db && (` (line 469)
- Jika `db` undefined, section tidak di-render

---

## 🔧 Recommended Fix

### Fix 1: Implement Proper GET Handler di `[id]/route.ts` (PRIMARY FIX)

Ganti GET handler di [`apps/web/app/api/platform/tenants/[id]/route.ts`](apps/web/app/api/platform/tenants/[id]/route.ts:13) dengan handler yang benar — mengambil `id` dari params dan mengembalikan single tenant detail dengan `stats`:

```typescript
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = params;
        
        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                users: { select: { id: true, name: true, email: true, role: true } },
                entitlement: { include: { plan: true } },
            },
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Count stats for this specific tenant
        const [totalUsers, totalInvoices, totalContacts, totalProducts] = await Promise.all([
            prisma.user.count({ where: { tenantId: id } }),
            prisma.invoice.count({ where: { tenantId: id } }),
            prisma.contact.count({ where: { tenantId: id } }),
            prisma.product.count({ where: { tenantId: id } }),
        ]);

        // Get recent activity for this tenant
        const recentActivity = await prisma.auditLog.findMany({
            where: { tenantId: id },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email,
                slug: tenant.slug,
                phone: tenant.phone,
                website: tenant.website,
                address: tenant.address,
                status: tenant.subscriptionStatus?.toLowerCase() || "trial",
                plan: tenant.currentPlanSlug || "starter",
                planPrice: tenant.entitlement?.plan?.priceMonthly || 0,
                createdAt: tenant.createdAt.toISOString(),
                updatedAt: tenant.updatedAt.toISOString(),
                stats: {
                    totalUsers,
                    totalInvoices,
                    totalContacts,
                    totalProducts,
                },
                users: tenant.users,
                entitlement: tenant.entitlement ? {
                    id: tenant.entitlement.id,
                    plan: tenant.entitlement.plan?.name || "Unknown",
                    status: tenant.entitlement.status,
                    startDate: tenant.entitlement.currentPeriodStart?.toISOString() || "",
                    endDate: tenant.entitlement.currentPeriodEnd?.toISOString() || null,
                    price: tenant.entitlement.plan?.priceMonthly || 0,
                } : null,
                recentActivity: recentActivity.map((a) => ({
                    id: a.id,
                    action: a.action,
                    entity: a.entity,
                    entityId: a.entityId,
                    ipAddress: a.ipAddress,
                    createdAt: a.createdAt.toISOString(),
                })),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
```

### Fix 2: Defenisif — Tambah Optional Chaining di Page Component

Sebagai defense-in-depth, tambahkan optional chaining di [`tenants/[id]/page.tsx`](apps/web/app/platform/tenants/[id]/page.tsx:421):

```tsx
// Sebelum:
{tenant.stats.totalUsers}

// Sesudah:
{tenant.stats?.totalUsers ?? 0}
```

Dan juga untuk property lain yang mengakses `tenant.stats`:
- Line 447: `tenant.stats.totalInvoices.toLocaleString()` → `tenant.stats?.totalInvoices?.toLocaleString() ?? '0'`
- Line 460: `tenant.stats.totalProducts` → `tenant.stats?.totalProducts ?? 0`

---

## 📋 Additional Issue (Minor)

### Mismatch `recentActivity` vs `recentAlerts`

Di [`apps/web/app/platform/page.tsx:126`](apps/web/app/platform/page.tsx:126), `fetchActivities` mengakses `data.data.recentActivity`, tapi monitoring API mengembalikan field `recentAlerts` (bukan `recentActivity`). Ini menyebabkan activities selalu kosong di platform dashboard.

```typescript
// Di page.tsx:
if (data.success && data.data?.recentActivity) {  // ← field salah
    setActivities(data.data.recentActivity);

// Di monitoring API response:
"recentAlerts": [...]  // ← field yang benar
```

**Fix:** Ganti `data.data?.recentActivity` menjadi `data.data?.recentAlerts` di page.tsx, atau tambahkan field `recentActivity` di monitoring API response.

---

## 📊 Ringkasan

| Aspek | Detail |
|-------|--------|
| **Error** | `TypeError: Cannot read properties of undefined (reading 'totalUsers')` |
| **File Sumber** | [`apps/web/app/platform/tenants/[id]/page.tsx:421`](apps/web/app/platform/tenants/[id]/page.tsx:421) |
| **API Endpoint** | `GET /api/platform/tenants/[id]` → [`apps/web/app/api/platform/tenants/[id]/route.ts:13`](apps/web/app/api/platform/tenants/[id]/route.ts:13) |
| **Root Cause** | GET handler di `[id]/route.ts` adalah salinan list endpoint — return array bukan single object |
| **Impact** | Crash saat SUPERADMIN membuka halaman detail tenant manapun |
| **Fix Priority** | 🔴 High — Fix GET handler + tambah optional chaining sebagai defense |
| **Secondary Issue** | Mismatch field `recentActivity` vs `recentAlerts` di platform dashboard |

---

*Report generated: 2026-09-18 10:21 WIB*
