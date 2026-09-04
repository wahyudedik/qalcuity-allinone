import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ─── GET /api/platform/billing ───────────────────────────────────────────────
// Returns billing overview: MRR, ARR, churn rate, payment history, overdue alerts.
// Only accessible by SUPERADMIN role.
export async function GET(request: Request) {
    // 1. Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:platform:billing:GET:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 2. Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. RBAC check — SUPERADMIN only
    const role = (session.user as { role?: string }).role;
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const filterStatus = searchParams.get("status") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // 3. Get all active subscriptions for MRR calculation
        const activeSubscriptions = await prisma.tenantSubscription.findMany({
            where: { status: "ACTIVE" },
            include: { plan: true, tenant: { select: { id: true, name: true, email: true } } },
        });

        const mrr = activeSubscriptions.reduce(
            (sum: number, sub) => sum + Number(sub.plan?.price ?? 0),
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

        // 7. Plan distribution
        const planDistribution = await prisma.tenantSubscription.groupBy({
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
                    totalActiveSubscriptions: activeSubscriptions.length,
                    totalTenants,
                    totalOverdueAmount,
                    overdueCount: overdueInvoices.length,
                },
                activeSubscriptions: activeSubscriptions.map((sub) => ({
                    id: sub.id,
                    tenantName: sub.tenant?.name || "Unknown",
                    tenantEmail: sub.tenant?.email || "",
                    plan: sub.plan?.name || "Unknown",
                    price: Number(sub.plan?.price ?? 0),
                    status: sub.status,
                    startDate: sub.startDate.toISOString(),
                    endDate: sub.endDate?.toISOString() || null,
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
        console.error("[Platform Billing Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
