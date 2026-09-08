import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// ─── GET /api/platform/tenants/[id] ───────────────────────────────────────────
// Returns detailed tenant information.
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

        // 3. Fetch tenant with relations
        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, name: true, email: true, role: true },
                    orderBy: { createdAt: "desc" },
                },
                subscriptions: {
                    include: { plan: true },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                _count: {
                    select: {
                        users: true,
                        invoices: true,
                        contacts: true,
                        products: true,
                    },
                },
            },
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "Tenant not found" },
                { status: 404 }
            );
        }

        // 4. Get recent activity (audit logs)
        const recentActivity = await prisma.auditLog.findMany({
            where: { tenantId: id },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        // 5. Format response
        const activeSubscription = tenant.subscriptions.find(
            (s) => s.status === "ACTIVE" || s.status === "TRIAL"
        );

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
                status: tenant.subscriptionStatus,
                plan: activeSubscription?.plan?.name || tenant.currentPlanSlug || "starter",
                planPrice: activeSubscription?.plan?.price || 0,
                createdAt: tenant.createdAt.toISOString(),
                updatedAt: tenant.updatedAt.toISOString(),
                stats: {
                    totalUsers: tenant._count.users,
                    totalInvoices: tenant._count.invoices,
                    totalContacts: tenant._count.contacts,
                    totalProducts: tenant._count.products,
                },
                users: tenant.users.map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                })),
                subscriptions: tenant.subscriptions.map((s) => ({
                    id: s.id,
                    plan: s.plan?.name || "Unknown",
                    status: s.status,
                    startDate: s.startDate.toISOString(),
                    endDate: s.endDate?.toISOString() || null,
                    price: s.plan?.price || 0,
                })),
                recentActivity: recentActivity.map((log) => ({
                    id: log.id,
                    action: log.action,
                    entity: log.entity,
                    entityId: log.entityId,
                    ipAddress: log.ipAddress,
                    createdAt: log.createdAt.toISOString(),
                })),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/platform/tenants/[id] ───────────────────────────────────────────
// Updates tenant status (suspend/reactivate).
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
        const { status, name, email, phone, address, website } = body;

        // 3. Check tenant exists
        const existing = await prisma.tenant.findUnique({
            where: { id },
        });
        if (!existing) {
            return NextResponse.json(
                { error: "Tenant not found" },
                { status: 404 }
            );
        }

        // 4. Build update data
        const updateData: Record<string, unknown> = {};
        if (status !== undefined) {
            // Validate status transitions
            const validStatuses = ["ACTIVE", "TRIAL", "SUSPENDED", "CANCELLED", "PENDING_PAYMENT"];
            if (!validStatuses.includes(status)) {
                return NextResponse.json(
                    { error: "Invalid status" },
                    { status: 400 }
                );
            }
            updateData.subscriptionStatus = status;
        }
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (website !== undefined) updateData.website = website;

        // 5. Update tenant
        const updated = await prisma.tenant.update({
            where: { id },
            data: updateData,
        });

        // 6. If suspending, also update active subscriptions
        if (status === "SUSPENDED") {
            await prisma.tenantSubscription.updateMany({
                where: {
                    tenantId: id,
                    status: "ACTIVE",
                },
                data: { status: "SUSPENDED" },
            });
        } else if (status === "ACTIVE") {
            // Reactivate: set subscriptions back to ACTIVE if they were SUSPENDED
            await prisma.tenantSubscription.updateMany({
                where: {
                    tenantId: id,
                    status: "SUSPENDED",
                },
                data: { status: "ACTIVE" },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                status: updated.subscriptionStatus,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/platform/tenants/[id] ────────────────────────────────────────
// Soft-deletes a tenant (sets deletedAt).
// Only accessible by SUPERADMIN role.
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    // 1. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = params;

        // 3. Check tenant exists
        const existing = await prisma.tenant.findUnique({
            where: { id },
        });
        if (!existing) {
            return NextResponse.json(
                { error: "Tenant not found" },
                { status: 404 }
            );
        }

        // 4. Soft delete
        const updated = await prisma.tenant.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                subscriptionStatus: "CANCELLED",
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                status: updated.subscriptionStatus,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
