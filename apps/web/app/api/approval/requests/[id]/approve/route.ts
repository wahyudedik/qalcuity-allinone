export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createApprovalRequestSchema, formatZodError } from '@/lib/validation-schemas';
import { createApprovalRequest, getApprovalLevels } from '@/lib/approval';
import { checkAutoApproval } from '@/lib/auto-approval';
import { notifyApprover } from '@/lib/approval-notifications';
import { handleApiError } from '@/lib/api-error';
import { ROLE_HIERARCHY } from '@qalcuity/config';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:requests:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, role } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const entityType = searchParams.get('entityType');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (entityType) {
            where.entityType = entityType.toUpperCase();
        }

        // For non-admin users, only show requests where user can approve
        // (based on eligible approval levels)
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            const eligibleLevels = await getApprovalLevels(tenantId, where.entityType as string || '');
            const userLevel = ROLE_HIERARCHY[role] ?? 0;

            const eligibleEntityTypes = eligibleLevels
                .filter((l: { isActive: boolean; requiredRole: string }) => {
                    const reqLevel = ROLE_HIERARCHY[l.requiredRole] ?? 0;
                    return l.isActive && userLevel >= reqLevel;
                })
                .map((l: { entityType: string }) => l.entityType);

            if (eligibleEntityTypes.length > 0) {
                where.entityType = { in: eligibleEntityTypes };
            }
        }

        const [requests, total] = await Promise.all([
            prisma.approvalRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.approvalRequest.count({ where }),
        ]);

        // Batch fetch all requesters in a single query (fixes N+1)
        const requesterIds = [...new Set(requests.map((r) => r.requestedBy))];
        const requesters = await prisma.user.findMany({
            where: { id: { in: requesterIds } },
            select: { id: true, name: true, email: true },
        });
        const requesterMap = new Map(requesters.map((r) => [r.id, { name: r.name, email: r.email }]));

        // Batch fetch all approval levels for this tenant in a single query (fixes N+1)
        const entityTypes = [...new Set(requests.map((r) => r.entityType))];
        const allLevels = await prisma.approvalLevel.findMany({
            where: { tenantId, entityType: { in: entityTypes } },
        });
        const levelMap = new Map(
            allLevels.map((l) => [`${l.entityType}:${l.level}`, l.name])
        );

        // Enrich with level names and requester info — all from in-memory maps
        const enrichedRequests = requests.map((req) => {
            const levelKey = `${req.entityType}:${req.currentLevel}`;
            const requester = requesterMap.get(req.requestedBy);

            return {
                ...req,
                levelName: levelMap.get(levelKey) || `Level ${req.currentLevel}`,
                requesterName: requester?.name || 'Unknown',
                requesterEmail: requester?.email || '',
            };
        });

        return NextResponse.json({
            success: true,
            data: enrichedRequests,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:requests:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const validation = createApprovalRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { entityType, entityId } = validation.data;

        // Check auto-approval rules first
        const autoApprovalResult = await checkAutoApproval(
            tenantId,
            entityType,
            entityId,
            userId,
            request
        );

        if (autoApprovalResult.autoApproved) {
            return NextResponse.json({
                success: true,
                data: null,
                message: 'Auto-approved berdasarkan threshold amount',
                autoApproved: true,
            });
        }

        const approvalRequest = await createApprovalRequest({
            tenantId,
            entityType,
            entityId,
            userId,
            request,
        });

        if (!approvalRequest) {
            // No approval levels — auto-approved
            return NextResponse.json({
                success: true,
                data: null,
                message: 'Tidak ada approval level yang dikonfigurasi — auto-approved',
            });
        }

        // Send notification to approvers asynchronously
        // Find eligible approvers for level 1
        const levels = await getApprovalLevels(tenantId, entityType);

        const firstActiveLevel = levels.find(
            (l: { isActive: boolean; requiredRole: string; entityType: string; level: number }) => l.isActive
        );
        if (firstActiveLevel) {
            const requiredLevel = ROLE_HIERARCHY[firstActiveLevel.requiredRole] ?? 0;
            const eligibleUsers = await prisma.user.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    role: {
                        in: Object.entries(ROLE_HIERARCHY)
                            .filter(([, level]) => level >= requiredLevel)
                            .map(([role]) => role),
                    },
                },
                select: { id: true },
            });

            // Notify each eligible approver (fire-and-forget)
            for (const user of eligibleUsers) {
                void notifyApprover(approvalRequest.id, user.id);
            }
        }

        return NextResponse.json({ success: true, data: approvalRequest }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
