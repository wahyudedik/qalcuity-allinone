import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:members:transactions:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;
        const type = searchParams.get('type');

        const where: Record<string, unknown> = {
            memberId: params.id,
            tenantId,
        };

        if (type) {
            where.type = type.toUpperCase();
        }

        // Verify member exists
        const member = await prisma.loyaltyMember.findFirst({
            where: { id: params.id, tenantId },
            select: { id: true, memberCode: true, name: true, points: true, tier: true },
        });

        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Member tidak ditemukan' },
                { status: 404 }
            );
        }

        const [transactions, total] = await Promise.all([
            prisma.loyaltyTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.loyaltyTransaction.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            member: {
                id: member.id,
                memberCode: member.memberCode,
                name: member.name,
                points: member.points,
                tier: member.tier,
            },
            data: transactions.map((t) => ({
                id: t.id,
                type: t.type,
                points: t.points,
                description: t.description,
                transactionId: t.transactionId,
                createdAt: t.createdAt.toISOString(),
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
