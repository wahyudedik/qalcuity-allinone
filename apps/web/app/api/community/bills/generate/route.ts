export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { generateCommunityBillsSchema, formatZodError } from '@/lib/validation-schemas';
import { periodBounds } from '@/lib/community';

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * POST /api/community/bills/generate — mass-generate tagihan iuran per periode (community:finance).
 *
 * Idempotent: kombinasi [tenantId, memberId, duesTypeId, period] unik di DB —
 * menjalankan ulang untuk periode yang sama hanya me-skip tagihan yang sudah ada
 * (tidak ada duplikat). Nomor tagihan deterministik: TAG/<period>/<kodeWarga>-<kodeIuran>.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-bills-generate:${ip}`, 10, 60_000);
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

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = generateCommunityBillsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;
        const { period } = parsed.data;
        const { start, end } = periodBounds(period);

        const members = await prisma.communityMember.findMany({
            where: { tenantId, deletedAt: null, status: 'ACTIVE' },
            select: { id: true, code: true },
            orderBy: { code: 'asc' },
        });

        const duesTypes = await prisma.communityDuesType.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, code: true, amount: true, startDate: true, endDate: true },
            orderBy: { code: 'asc' },
        });

        let created = 0;
        let skipped = 0;

        for (const member of members) {
            for (const duesType of duesTypes) {
                // Hormati rentang berlaku jenis iuran terhadap periode tagihan
                if (duesType.startDate && duesType.startDate > end) continue; // mulai setelah periode berakhir
                if (duesType.endDate && duesType.endDate < start) continue; // berakhir sebelum periode mulai

                try {
                    await prisma.communityDuesBill.create({
                        data: {
                            tenantId,
                            billNumber: `TAG/${period}/${member.code}-${duesType.code}`,
                            memberId: member.id,
                            duesTypeId: duesType.id,
                            period,
                            amountDue: duesType.amount,
                            dueDate: end,
                            createdBy: userId,
                        },
                    });
                    created += 1;
                } catch (error) {
                    // Unique constraint [tenantId, memberId, duesTypeId, period] → sudah ada, skip
                    if (isUniqueViolation(error)) {
                        skipped += 1;
                    } else {
                        throw error;
                    }
                }
            }
        }

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityDuesBill',
            entityId: `generate:${period}`,
            newValues: { period, created, skipped, members: members.length, duesTypes: duesTypes.length },
            request,
        });

        return NextResponse.json({
            success: true,
            data: { period, created, skipped },
            message: MSG_COMMUNITY.GENERATED_OK,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
