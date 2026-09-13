export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-error";

// â”€â”€â”€ GET /api/platform/billing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns billing overview: MRR, ARR, churn rate, payment history, overdue alerts.
// Only accessible by SUPERADMIN role.
export async function GET(request: Request) {
    // 1. Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:platform:billing:GET:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 2. Auth + RBAC check â€” SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { searchParams } = new URL(request.url);
        const filterStatus = searchParams.get("status") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // 3. Get all active entitlements for MRR calculation (Plan model)
        // Note: priceMonthly is on the related Plan model, not TenantEntitlement,
        // so Prisma aggregate() cannot sum it directly. Using findMany with a safety limit.
        const activeEntitlements = await prisma.tenantEntitlement.findMany({
            where: { status: "active" },
            include: { plan: { select: { priceMonthly: true, name: true } }, tenant: { select: { id: true, name: true, email: true } } },
            take: 10000,
        });

        const mrr = activeEntitlements.reduce(
            (sum: number, ent) => sum + Number(ent.plan?.priceMonthly ?? 0),
            0
        );
        const arr = mrr * 12;

        // 4. Calculate churn rate (cancelled in last 30 days vs total)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [cancelledLast30, totalTenants] = await Promise.all([
            prisma.tenant.count({
                where: {
                    subscriptionStatus: "CANCELLED",
                    updatedAt: { gte: thirtyDaysAgo },
                },
            }),
            prisma.tenant.count(),
        ]);

        const churnRate = totalTenants > 0
            ? Math.round((cancelledLast30 / totalTenants) * 100 * 100) / 100
            : 0;

        // 5. Get payment history (invoices)
        const invoiceWhere: Record<string, unknown> = {};
        if (filterStatus) {
            invoiceWhere.status = filterStatus.toUpperCase();
        }

        const [invoices, totalInvoices] = await Promise.all([
            prisma.invoice.findMany({
                where: invoiceWhere,
                include: {
                    tenant: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.invoice.count({ where: invoiceWhere }),
        ]);

        // 6. Get overdue invoices
        const now = new Date();
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
                dueDate: { lt: now },
            },
            include: {
                tenant: { select: { id: true, name: true, email: true } },
            },
            orderBy: { dueDate: "asc" },
            take: 20,
        });

        const totalOverdueAmount = overdueInvoices.reduce(
            (sum: number, inv) => sum + Number(inv.total ?? 0),
            0
        );

        // 7. Plan distribution (from TenantEntitlement)
        const planDistribution = await prisma.tenantEntitlement.groupBy({
            by: ["status"],
            _count: true,
        });

        // 8. Format response
        return NextResponse.json({
            success: true,
            data: {
                overview: {
                    mrr,
                    arr,
                    churnRate,
                    totalActiveSubscriptions: activeEntitlements.length,
                    totalTenants,
                    totalOverdueAmount,
                    overdueCount: overdueInvoices.length,
                },
                activeSubscriptions: activeEntitlements.map((ent) => ({
                    id: ent.id,
                    tenantName: ent.tenant?.name || "Unknown",
                    tenantEmail: ent.tenant?.email || "",
                    plan: ent.plan?.name || "Unknown",
                    price: Number(ent.plan?.priceMonthly ?? 0),
                    status: ent.status.toUpperCase(),
                    startDate: ent.currentPeriodStart.toISOString(),
                    endDate: ent.currentPeriodEnd.toISOString(),
                })),
                paymentHistory: invoices.map((inv) => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`,
                    tenantName: inv.tenant?.name || "Unknown",
                    tenantEmail: inv.tenant?.email || "",
                    amount: Number(inv.total ?? 0),
                    status: inv.status,
                    dueDate: inv.dueDate?.toISOString() || null,
                    createdAt: inv.createdAt.toISOString(),
                })),
                pagination: {
                    page,
                    limit,
                    total: totalInvoices,
                    totalPages: Math.ceil(totalInvoices / limit),
                },
                overdueInvoices: overdueInvoices.map((inv) => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`,
                    tenantName: inv.tenant?.name || "Unknown",
                    amount: Number(inv.total ?? 0),
                    dueDate: inv.dueDate?.toISOString() || null,
                })),
                planDistribution: planDistribution.map((pd) => ({
                    status: pd.status,
                    count: pd._count,
                })),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
