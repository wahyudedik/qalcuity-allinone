import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({
                success: true,
                data: { count: 0, requests: [] },
            });
        }

        const { tenantId, role } = auth;

        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(
            `api:dashboard-approvals:${tenantId}:${ip}`,
            30,
            60000
        );
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak permintaan.' },
                { status: 429 }
            );
        }

        // Determine which entity types this user can approve
        const ROLE_HIERARCHY: Record<string, number> = {
            VIEWER: 0,
            MEMBER: 1,
            ADMIN: 2,
            SUPERADMIN: 3,
        };
        const userLevel = ROLE_HIERARCHY[role] ?? 0;

        const levels = await prisma.approvalLevel.findMany({
            where: { tenantId, isActive: true },
        });

        const eligibleEntityTypes = levels
            .filter(
                (l: { requiredRole: string }) =>
                    userLevel >= (ROLE_HIERARCHY[l.requiredRole] ?? 0)
            )
            .map((l: { entityType: string }) => l.entityType);

        // For ADMIN/SUPERADMIN, show all pending; for others, only eligible
        const whereCondition: Record<string, unknown> = {
            tenantId,
            status: 'PENDING',
        };

        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            if (eligibleEntityTypes.length === 0) {
                // User cannot approve anything
                return NextResponse.json({
                    success: true,
                    data: { count: 0, requests: [] },
                });
            }
            whereCondition.entityType = { in: eligibleEntityTypes };
        }

        const [count, requests] = await Promise.all([
            prisma.approvalRequest.count({ where: whereCondition }),
            prisma.approvalRequest.findMany({
                where: whereCondition,
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);

        // Enrich with entity info and requester
        const enriched = await Promise.all(
            requests.map(
                async (req: {
                    id: string;
                    entityType: string;
                    entityId: string;
                    currentLevel: number;
                    status: string;
                    requestedBy: string;
                    createdAt: Date;
                }) => {
                    const requester = await prisma.user.findUnique({
                        where: { id: req.requestedBy },
                        select: { name: true },
                    });

                    let entityDisplay = req.entityId;
                    let entityAmount: number | null = null;

                    if (req.entityType === 'INVOICE') {
                        const inv = await prisma.invoice.findUnique({
                            where: { id: req.entityId },
                            select: { invoiceNumber: true, total: true },
                        });
                        if (inv) {
                            entityDisplay = inv.invoiceNumber;
                            entityAmount = Number(inv.total);
                        }
                    } else if (req.entityType === 'PURCHASE_ORDER') {
                        const po = await prisma.purchaseOrder.findUnique({
                            where: { id: req.entityId },
                            select: { poNumber: true, total: true },
                        });
                        if (po) {
                            entityDisplay = po.poNumber;
                            entityAmount = Number(po.total);
                        }
                    } else if (req.entityType === 'QUOTATION') {
                        const qt = await prisma.quotation.findUnique({
                            where: { id: req.entityId },
                            select: { quotationNumber: true, total: true },
                        });
                        if (qt) {
                            entityDisplay = qt.quotationNumber;
                            entityAmount = Number(qt.total);
                        }
                    }

                    return {
                        id: req.id,
                        entityType: req.entityType,
                        entityDisplay,
                        entityAmount,
                        currentLevel: req.currentLevel,
                        requesterName: requester?.name || 'Unknown',
                        createdAt: req.createdAt.toISOString(),
                    };
                }
            )
        );

        return NextResponse.json({
            success: true,
            data: { count, requests: enriched },
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
