import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createLoyaltyMemberSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

async function generateMemberCode(tenantId: string): Promise<string> {
    const count = await prisma.loyaltyMember.count({ where: { tenantId } });
    return `LMS-${String(count + 1).padStart(5, '0')}`;
}

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:members:${ip}`, 60, 60000);
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
        const search = searchParams.get('search');
        const tier = searchParams.get('tier');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { memberCode: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (tier) {
            where.tier = tier.toUpperCase();
        }

        const [members, total] = await Promise.all([
            prisma.loyaltyMember.findMany({
                where,
                include: {
                    _count: { select: { transactions: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.loyaltyMember.count({ where }),
        ]);

        const data = members.map((m) => ({
            id: m.id,
            memberCode: m.memberCode,
            name: m.name,
            email: m.email,
            phone: m.phone,
            tier: m.tier,
            points: m.points,
            totalSpent: Number(m.totalSpent),
            transactionCount: m._count.transactions,
            createdAt: m.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
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
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:members:POST:${ip}`, 30, 60000);
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
        const sanitizedBody = sanitizeObject(body);
        const validation = createLoyaltyMemberSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;
        const memberCode = await generateMemberCode(tenantId);

        const member = await prisma.loyaltyMember.create({
            data: {
                tenantId,
                memberCode,
                name: validatedData.name,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                contactId: validatedData.contactId || null,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'LoyaltyMember',
            entityId: member.id,
            newValues: { memberCode, name: validatedData.name, email: validatedData.email },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: member.id,
                memberCode: member.memberCode,
                name: member.name,
                email: member.email,
                phone: member.phone,
                tier: member.tier,
                points: member.points,
                totalSpent: Number(member.totalSpent),
                createdAt: member.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
