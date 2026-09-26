export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';
import { z } from 'zod';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const acquireLockSchema = z.object({
    entityType: z.string().min(1, 'Entity type is required').max(50),
    entityId: z.string().min(1, 'Entity ID is required').max(255),
    lockType: z.enum(['edit', 'delete', 'period_close']).default('edit'),
    durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours').default(30),
    reason: z.string().max(500).optional().nullable(),
});

// ─── GET: List active locks ─────────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:locks:${ip}`, 100, 60000);
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
        const entityType = searchParams.get('entityType');
        const lockedBy = searchParams.get('lockedBy');

        const where: Record<string, unknown> = { tenantId };
        if (entityType) where.entityType = entityType;
        if (lockedBy) where.lockedBy = lockedBy;

        const locks = await prisma.lockRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const now = new Date();
        const data = locks.map((lock) => ({
            id: lock.id,
            entityType: lock.entityType,
            entityId: lock.entityId,
            lockedBy: lock.lockedBy,
            lockType: lock.lockType,
            expiresAt: lock.expiresAt.toISOString(),
            reason: lock.reason,
            isExpired: lock.expiresAt < now,
            minutesRemaining: Math.max(0, Math.round((lock.expiresAt.getTime() - now.getTime()) / (1000 * 60))),
            createdAt: lock.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Acquire lock ─────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:locks:POST:${ip}`, 30, 60000);
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

        const validated = acquireLockSchema.parse(sanitizedBody);

        // Check existing lock
        const existing = await prisma.lockRecord.findUnique({
            where: {
                tenantId_entityType_entityId: {
                    tenantId,
                    entityType: validated.entityType,
                    entityId: validated.entityId,
                },
            },
        });

        if (existing) {
            // Check if lock has expired
            if (existing.expiresAt < new Date()) {
                // Expired — delete and re-acquire
                await prisma.lockRecord.delete({ where: { id: existing.id } });
            } else if (existing.lockedBy !== userId) {
                // Lock held by another user
                return NextResponse.json(
                    {
                        success: false,
                        error: `Record is locked by another user until ${existing.expiresAt.toISOString()}`,
                        code: 'RECORD_LOCKED',
                        lock: {
                            lockedBy: existing.lockedBy,
                            expiresAt: existing.expiresAt.toISOString(),
                            lockType: existing.lockType,
                        },
                    },
                    { status: 409 }
                );
            } else {
                // Same user — extend lock
                const newExpiry = new Date(Date.now() + validated.durationMinutes * 60 * 1000);
                const updated = await prisma.lockRecord.update({
                    where: { id: existing.id },
                    data: { expiresAt: newExpiry },
                });

                return NextResponse.json({
                    success: true,
                    data: {
                        id: updated.id,
                        entityType: updated.entityType,
                        entityId: updated.entityId,
                        lockedBy: updated.lockedBy,
                        lockType: updated.lockType,
                        expiresAt: updated.expiresAt.toISOString(),
                        reason: updated.reason,
                        createdAt: updated.createdAt.toISOString(),
                    },
                    message: 'Lock extended',
                });
            }
        }

        // Acquire new lock
        const expiresAt = new Date(Date.now() + validated.durationMinutes * 60 * 1000);
        const lock = await prisma.lockRecord.create({
            data: {
                tenantId,
                entityType: validated.entityType,
                entityId: validated.entityId,
                lockedBy: userId,
                lockType: validated.lockType,
                expiresAt,
                reason: validated.reason,
            },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'LockRecord',
            entityId: lock.id,
            newValues: toAuditPayload({
                entityType: validated.entityType,
                entityId: validated.entityId,
                lockType: validated.lockType,
                durationMinutes: validated.durationMinutes,
            }),
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: lock.id,
                entityType: lock.entityType,
                entityId: lock.entityId,
                lockedBy: lock.lockedBy,
                lockType: lock.lockType,
                expiresAt: lock.expiresAt.toISOString(),
                reason: lock.reason,
                createdAt: lock.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
