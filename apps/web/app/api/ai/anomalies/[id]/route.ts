import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const patchAnomalySchema = z.object({
    status: z.enum(['OPEN', 'INVESTIGATING', 'DISMISSED', 'BLOCKED']),
    statusNote: z.string().max(500).optional(),
});

// ─── PATCH: Update anomaly status ────────────────────────────────────────────

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        // 2. RBAC check — ADMIN or SUPERADMIN only
        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: MSG.ANOMALY_ADMIN_ONLY },
                { status: 403 }
            );
        }

        const tenantId = session.user.tenantId;
        const { id } = params;

        // 3. Validate body
        const body = await req.json();
        const validation = patchAnomalySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: MSG.ANOMALY_INVALID_STATUS, details: validation.error.issues },
                { status: 400 }
            );
        }

        const { status, statusNote } = validation.data;

        // 4. Find anomaly (with tenant isolation)
        const anomaly = await prisma.anomalyDetection.findFirst({
            where: { id, tenantId },
        });

        if (!anomaly) {
            return NextResponse.json(
                { success: false, error: MSG.ANOMALY_NOT_FOUND },
                { status: 404 }
            );
        }

        // 5. Audit logging
        void logAudit({
            userId: session.user.id || 'unknown',
            tenantId,
            action: 'UPDATE',
            entity: 'AnomalyDetection',
            entityId: id,
            oldValues: { status: anomaly.status, statusNote: anomaly.statusNote },
            newValues: { status, statusNote: statusNote || null },
            request: req,
        });

        // 6. Update status
        const updated = await prisma.anomalyDetection.update({
            where: { id },
            data: {
                status,
                statusNote: statusNote || null,
                statusChangedBy: session.user.id || null,
                statusChangedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
