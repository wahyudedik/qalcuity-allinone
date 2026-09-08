import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateTableStatusSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
    AVAILABLE: ['OCCUPIED', 'RESERVED', 'CLEANING', 'DISABLED'],
    OCCUPIED: ['AVAILABLE', 'CLEANING', 'RESERVED'],
    RESERVED: ['OCCUPIED', 'AVAILABLE', 'DISABLED'],
    CLEANING: ['AVAILABLE', 'DISABLED'],
    DISABLED: ['AVAILABLE'],
};

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:tables:[id]:status:PATCH:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateTableStatusSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { status: newStatus } = validation.data;

        const existing = await prisma.posTable.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Validate status transition
        const allowedTransitions = VALID_TRANSITIONS[existing.status] || [];
        if (!allowedTransitions.includes(newStatus)) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_STATUS_TRANSITION_INVALID },
                { status: 400 }
            );
        }

        // If setting to OCCUPIED, clear currentSessionId when transitioning to AVAILABLE
        const updateData: Record<string, unknown> = { status: newStatus };
        if (newStatus === 'AVAILABLE') {
            updateData.currentSessionId = null;
        }

        const table = await prisma.posTable.update({
            where: { id },
            data: updateData,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTable',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: newStatus },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: table.id,
                number: table.number,
                status: table.status,
                updatedAt: table.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
