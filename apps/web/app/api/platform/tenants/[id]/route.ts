export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// ─── GET /api/platform/tenants/[id] ──────────────────────────────────
// Returns single tenant detail with stats, users, entitlement, and recent activity.
// Only accessible by SUPERADMIN role.
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    // 1. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: MSG.ID_REQUIRED },
                { status: 400 }
            );
        }

        // 2. Fetch single tenant with related data
        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, name: true, email: true, role: true },
                },
                entitlement: {
                    include: { plan: true },
                },
            },
        });

        if (!tenant) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // 3. Fetch stats in parallel
        const [totalInvoices, totalContacts, totalProducts] = await Promise.all([
            prisma.invoice.count({ where: { tenantId: id } }),
            prisma.contact.count({ where: { tenantId: id } }),
            prisma.product.count({ where: { tenantId: id } }),
        ]);

        // 4. Fetch recent activity (last 10 audit logs)
        const recentActivity = await prisma.auditLog.findMany({
            where: { tenantId: id },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                action: true,
                entity: true,
                entityId: true,
                ipAddress: true,
                createdAt: true,
            },
        });

        // 5. Build response matching TenantDetail interface
        const responseData = {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            slug: tenant.slug,
            phone: tenant.phone || null,
            website: tenant.website || null,
            address: tenant.address || null,
            status: tenant.subscriptionStatus?.toLowerCase() || "trial",
            plan: tenant.currentPlanSlug || "starter",
            planPrice: tenant.entitlement?.plan?.priceMonthly || 0,
            createdAt: tenant.createdAt.toISOString(),
            updatedAt: tenant.updatedAt.toISOString(),
            stats: {
                totalUsers: tenant.users.length,
                totalInvoices,
                totalContacts,
                totalProducts,
            },
            users: tenant.users,
            entitlement: tenant.entitlement
                ? {
                    id: tenant.entitlement.id,
                    plan: tenant.entitlement.plan?.name || tenant.entitlement.plan?.slug || "unknown",
                    status: tenant.entitlement.status,
                    startDate: tenant.entitlement.currentPeriodStart?.toISOString() || "",
                    endDate: tenant.entitlement.currentPeriodEnd?.toISOString() || null,
                    price: tenant.entitlement.plan?.priceMonthly || 0,
                }
                : null,
            recentActivity: recentActivity.map((log) => ({
                id: log.id,
                action: log.action,
                entity: log.entity,
                entityId: log.entityId || "",
                ipAddress: log.ipAddress || null,
                createdAt: log.createdAt.toISOString(),
            })),
        };

        return NextResponse.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/platform/tenants/[id] ──────────────────────────────────
// Updates a tenant (suspend, reactivate, change plan, etc.).
// Only accessible by SUPERADMIN role.
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    // 1. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = params;
        const body = await request.json();

        // 2. Check tenant exists
        const existing = await prisma.tenant.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // 3. Build update data
        const updateData: Record<string, unknown> = {};

        if (body.status) {
            updateData.subscriptionStatus = body.status;
        }

        if (body.currentPlanSlug) {
            updateData.currentPlanSlug = body.currentPlanSlug;
        }

        if (body.name) {
            updateData.name = body.name;
        }

        if (body.email) {
            updateData.email = body.email;
        }

        // 4. Update tenant
        const updated = await prisma.tenant.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                slug: updated.slug,
                status: updated.subscriptionStatus,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
