export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

// ─── DELETE: Release lock ────────────────────────────────────────────────────

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:locks:DELETE:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const lock = await prisma.lockRecord.findFirst({
            where: {
                id: params.id,
                tenantId,
            },
        });

        if (!lock) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND, code: 'DATA_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Only the lock holder or an admin can release the lock
        if (lock.lockedBy !== userId) {
            const session = await getServerSession(authOptions);
            const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN';

            if (!isAdmin) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Only the lock holder or an admin can release this lock',
                        code: 'LOCK_FORBIDDEN',
                    },
                    { status: 403 }
                );
            }
        }

        await prisma.lockRecord.delete({ where: { id: params.id } });

        await logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'LockRecord',
            entityId: params.id,
            oldValues: {
                entityType: lock.entityType,
                entityId: lock.entityId,
                lockedBy: lock.lockedBy,
                lockType: lock.lockType,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            message: 'Lock released successfully',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
