export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';
import { getSLAColor, type SLAColor } from '@/lib/sla-monitor';
import { z } from 'zod';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createSLATrackerSchema = z.object({
    entityType: z.string().min(1, 'Entity type is required').max(50),
    entityId: z.string().min(1, 'Entity ID is required').max(255),
    stage: z.string().min(1, 'Stage is required').max(50),
    targetHours: z.number().int().min(1, 'Target hours must be at least 1').max(8760, 'Target hours cannot exceed 8760'),
    notes: z.string().max(1000).optional().nullable(),
});

// ─── GET: List all SLA trackers with color coding ───────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sla-trackers:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'active';
        const entityType = searchParams.get('entityType');

        const where: Record<string, unknown> = { tenantId };
        if (status !== 'all') where.status = status;
        if (entityType) where.entityType = entityType;

        const trackers = await prisma.sLATracker.findMany({
            where,
            orderBy: { deadline: 'asc' },
        });

        const data = trackers.map((t) => {
            const sla = getSLAColor(t.deadline, t.completedAt, t.startedAt);
            return {
                id: t.id,
                entityType: t.entityType,
                entityId: t.entityId,
                stage: t.stage,
                targetHours: t.targetHours,
                startedAt: t.startedAt.toISOString(),
                deadline: t.deadline.toISOString(),
                completedAt: t.completedAt?.toISOString() || null,
                status: t.status,
                escalatedTo: t.escalatedTo,
                notes: t.notes,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
                slaColor: sla.color,
                slaPercentRemaining: sla.percentRemaining,
                slaHoursRemaining: sla.hoursRemaining,
                slaLabel: sla.label,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Create SLA tracker (manual) ──────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sla-trackers:POST:${ip}`, 30, 60000);
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
        const sanitizedBody = sanitizeObject(body);

        const validated = createSLATrackerSchema.parse(sanitizedBody);

        // Check for existing active tracker for this entity
        const existing = await prisma.sLATracker.findFirst({
            where: {
                tenantId,
                entityType: validated.entityType,
                entityId: validated.entityId,
                status: 'active',
            },
        });

        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'An active SLA tracker already exists for this entity',
                    code: 'SLA_TRACKER_EXISTS',
                    existingTracker: {
                        id: existing.id,
                        deadline: existing.deadline.toISOString(),
                        status: existing.status,
                    },
                },
                { status: 409 }
            );
        }

        const now = new Date();
        const deadline = new Date(now.getTime() + validated.targetHours * 60 * 60 * 1000);

        const tracker = await prisma.sLATracker.create({
            data: {
                tenantId,
                entityType: validated.entityType,
                entityId: validated.entityId,
                stage: validated.stage,
                targetHours: validated.targetHours,
                deadline,
                status: 'active',
                notes: validated.notes,
            },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'SLATracker',
            entityId: tracker.id,
            newValues: toAuditPayload(validated),
            request,
        });

        const sla = getSLAColor(tracker.deadline, tracker.completedAt, tracker.startedAt);

        return NextResponse.json({
            success: true,
            data: {
                id: tracker.id,
                entityType: tracker.entityType,
                entityId: tracker.entityId,
                stage: tracker.stage,
                targetHours: tracker.targetHours,
                startedAt: tracker.startedAt.toISOString(),
                deadline: tracker.deadline.toISOString(),
                status: tracker.status,
                notes: tracker.notes,
                createdAt: tracker.createdAt.toISOString(),
                slaColor: sla.color,
                slaLabel: sla.label,
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
