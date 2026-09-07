import { NextResponse } from "next/server";
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

// ─── GET /api/platform/tenants ────────────────────────────────────────────────
// Returns paginated list of all tenants with stats.
// Only accessible by SUPERADMIN role.
export async function GET(request: Request) {
    // 1. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";
        const plan = searchParams.get("plan") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        // 3. Build where clause
        const where: Record<string, unknown> = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
            ];
        }

        if (status) {
            where.subscriptionStatus = status.toUpperCase();
        }

        if (plan) {
            where.currentPlanSlug = plan.toLowerCase();
        }

        // 4. Query tenants with stats
        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                include: {
                    users: { select: { id: true } },
                    subscriptions: {
                        where: { status: "ACTIVE" },
                        include: { plan: true },
                        take: 1,
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.tenant.count({ where }),
        ]);

        // 5. Format response
        const formattedTenants = tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            slug: tenant.slug,
            plan: tenant.currentPlanSlug || "starter",
            status: tenant.subscriptionStatus?.toLowerCase() || "trial",
            userCount: tenant.users.length,
            mrr: tenant.subscriptions[0]?.plan?.price || 0,
            createdAt: tenant.createdAt.toISOString(),
            updatedAt: tenant.updatedAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data: formattedTenants,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("[Platform Tenants Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

// ─── POST /api/platform/tenants ───────────────────────────────────────────────
// Creates a new tenant (provisioning).
// Only accessible by SUPERADMIN role.
export async function POST(request: Request) {
    // 1. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const { name, email, slug, plan } = body;

        // 3. Validate required fields
        if (!name || !email || !slug) {
            return NextResponse.json(
                { error: "Name, email, and slug are required" },
                { status: 400 }
            );
        }

        // 4. Check slug uniqueness
        const existing = await prisma.tenant.findUnique({
            where: { slug },
        });
        if (existing) {
            return NextResponse.json(
                { error: "Tenant with this slug already exists" },
                { status: 409 }
            );
        }

        // 5. Create tenant
        const tenant = await prisma.tenant.create({
            data: {
                name,
                email,
                slug,
                subscriptionStatus: "TRIAL",
                currentPlanSlug: plan || "starter",
                settings: {},
            },
        });

        // 6. Create trial subscription if plan specified
        if (plan) {
            const planRecord = await prisma.subscriptionPlan.findUnique({
                where: { slug: plan },
            });
            if (planRecord) {
                const trialEnd = new Date();
                trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

                await prisma.tenantSubscription.create({
                    data: {
                        tenantId: tenant.id,
                        planId: planRecord.id,
                        status: "TRIAL",
                        startDate: new Date(),
                        endDate: trialEnd,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email,
                slug: tenant.slug,
                status: tenant.subscriptionStatus,
            },
        }, { status: 201 });
    } catch (error) {
        console.error("[Platform Tenants Create Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
