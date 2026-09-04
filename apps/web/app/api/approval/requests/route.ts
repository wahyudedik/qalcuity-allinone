import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createApprovalRequestSchema, formatZodError } from '@/lib/validation-schemas';
import { createApprovalRequest, getApprovalLevels } from '@/lib/approval';
import { checkAutoApproval } from '@/lib/auto-approval';
import { notifyApprover } from '@/lib/approval-notifications';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:requests:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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
        if (role !== 'ADMIN' && role !== 'SUPERADMIN' && role !== 'SUPERADMIN') {
            const eligibleLevels = await getApprovalLevels(tenantId, where.entityType as string || '');
            const ROLE_HIERARCHY: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, SUPERADMIN: 3 };
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

        // Enrich with level names and requester info
        const enrichedRequests = await Promise.all(
            requests.map(async (req) => {
                const level = await prisma.approvalLevel.findFirst({
                    where: {
                        tenantId,
                        entityType: req.entityType,
                        level: req.currentLevel,
                    },
                });

                const requester = await prisma.user.findUnique({
                    where: { id: req.requestedBy },
                    select: { id: true, name: true, email: true },
                });

                return {
                    ...req,
                    levelName: level?.name || `Level ${req.currentLevel}`,
                    requesterName: requester?.name || 'Unknown',
                    requesterEmail: requester?.email || '',
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: enrichedRequests,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:requests:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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
        const ROLE_HIERARCHY: Record<string, number> = {
            VIEWER: 0,
            MEMBER: 1,
            ADMIN: 2,
            SUPERADMIN: 3,
        };

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
