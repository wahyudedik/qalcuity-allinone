export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { ROLE_HIERARCHY } from '@qalcuity/config';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status || 403 }
            );
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
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429 }
            );
        }

        // Determine which entity types this user can approve
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

        // Batch fetch all requesters in a single query (fixes N+1)
        const requesterIds = [...new Set(requests.map((r: { requestedBy: string }) => r.requestedBy))];
        const requesters = await prisma.user.findMany({
            where: { id: { in: requesterIds } },
            select: { id: true, name: true },
        });
        const requesterMap = new Map(requesters.map((r) => [r.id, r.name]));

        // Batch fetch all entities by type (fixes N+1)
        const invoiceIds = requests
            .filter((r: { entityType: string }) => r.entityType === 'INVOICE')
            .map((r: { entityId: string }) => r.entityId);
        const poIds = requests
            .filter((r: { entityType: string }) => r.entityType === 'PURCHASE_ORDER')
            .map((r: { entityId: string }) => r.entityId);
        const qtIds = requests
            .filter((r: { entityType: string }) => r.entityType === 'QUOTATION')
            .map((r: { entityId: string }) => r.entityId);

        const [invoices, purchaseOrders, quotations] = await Promise.all([
            invoiceIds.length > 0
                ? prisma.invoice.findMany({
                    where: { id: { in: invoiceIds } },
                    select: { id: true, invoiceNumber: true, total: true },
                })
                : [],
            poIds.length > 0
                ? prisma.purchaseOrder.findMany({
                    where: { id: { in: poIds } },
                    select: { id: true, poNumber: true, total: true },
                })
                : [],
            qtIds.length > 0
                ? prisma.quotation.findMany({
                    where: { id: { in: qtIds } },
                    select: { id: true, quotationNumber: true, total: true },
                })
                : [],
        ]);

        // Build lookup maps for each entity type
        const invoiceMap = new Map(
            invoices.map((inv) => [inv.id, { display: inv.invoiceNumber, amount: Number(inv.total) }])
        );
        const poMap = new Map(
            purchaseOrders.map((po) => [po.id, { display: po.poNumber, amount: Number(po.total) }])
        );
        const qtMap = new Map(
            quotations.map((qt) => [qt.id, { display: qt.quotationNumber, amount: Number(qt.total) }])
        );

        // Enrich with entity info and requester — all from in-memory maps
        const enriched = requests.map(
            (req: {
                id: string;
                entityType: string;
                entityId: string;
                currentLevel: number;
                status: string;
                requestedBy: string;
                createdAt: Date;
            }) => {
                let entityDisplay = req.entityId;
                let entityAmount: number | null = null;

                if (req.entityType === 'INVOICE') {
                    const inv = invoiceMap.get(req.entityId);
                    if (inv) {
                        entityDisplay = inv.display;
                        entityAmount = inv.amount;
                    }
                } else if (req.entityType === 'PURCHASE_ORDER') {
                    const po = poMap.get(req.entityId);
                    if (po) {
                        entityDisplay = po.display;
                        entityAmount = po.amount;
                    }
                } else if (req.entityType === 'QUOTATION') {
                    const qt = qtMap.get(req.entityId);
                    if (qt) {
                        entityDisplay = qt.display;
                        entityAmount = qt.amount;
                    }
                }

                return {
                    id: req.id,
                    entityType: req.entityType,
                    entityDisplay,
                    entityAmount,
                    currentLevel: req.currentLevel,
                    requesterName: requesterMap.get(req.requestedBy) || 'Unknown',
                    createdAt: req.createdAt.toISOString(),
                };
            }
        );

        return NextResponse.json({
            success: true,
            data: { count, requests: enriched },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
