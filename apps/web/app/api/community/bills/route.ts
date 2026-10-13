export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

/** Serialize Decimal → number untuk response JSON. */
function serializeBill(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        amountDue: row.amountDue !== null && row.amountDue !== undefined ? Number(row.amountDue) : 0,
        amountPaid: row.amountPaid !== null && row.amountPaid !== undefined ? Number(row.amountPaid) : 0,
    };
}

/**
 * GET /api/community/bills — daftar tagihan iuran (community:finance).
 *
 * In-route hasPermission('community:finance') WAJIB — fallback role-hierarchy di
 * requirePermissionForRoute melewatkan system ADMIN tanpa permission community.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-bills:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const period = searchParams.get('period');
        const memberId = searchParams.get('memberId');
        const duesTypeId = searchParams.get('duesTypeId');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

        const where: Record<string, unknown> = {
            tenantId: auth.tenantId,
            deletedAt: null,
        };
        if (status && ['UNPAID', 'PARTIAL', 'PAID', 'VOID'].includes(status)) where.status = status;
        if (period) where.period = period;
        if (memberId) where.memberId = memberId;
        if (duesTypeId) where.duesTypeId = duesTypeId;

        const [rows, total] = await Promise.all([
            prisma.communityDuesBill.findMany({
                where,
                include: {
                    member: { select: { id: true, code: true, fullName: true } },
                    duesType: { select: { id: true, code: true, name: true } },
                },
                orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.communityDuesBill.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializeBill(row as unknown as Record<string, unknown>)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
