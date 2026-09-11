export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createLoyaltyMemberSchema, updateLoyaltyMemberSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

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
                { success: false, error: MSG.TOO_MANY_REQUESTS },
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
                { success: false, error: MSG.TOO_MANY_REQUESTS },
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

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:members:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can update loyalty members
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        // Check member exists
        const existingMember = await prisma.loyaltyMember.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingMember) {
            return NextResponse.json(
                { success: false, error: MSG.MEMBER_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateLoyaltyMemberSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate email within tenant (excluding current member)
        if (validatedData.email) {
            const duplicateEmail = await prisma.loyaltyMember.findFirst({
                where: {
                    tenantId,
                    email: validatedData.email,
                    id: { not: params.id },
                },
            });
            if (duplicateEmail) {
                return NextResponse.json(
                    { success: false, error: MSG.PRODUCT_SKU_DUPLICATE },
                    { status: 400 }
                );
            }
        }

        const member = await prisma.loyaltyMember.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.email !== undefined && { email: validatedData.email }),
                ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
                ...(validatedData.tier !== undefined && { tier: validatedData.tier }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'LoyaltyMember',
            entityId: member.id,
            newValues: validatedData,
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
                updatedAt: member.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:members:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can delete loyalty members
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        // Check member exists
        const existingMember = await prisma.loyaltyMember.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingMember) {
            return NextResponse.json(
                { success: false, error: MSG.MEMBER_NOT_FOUND },
                { status: 404 }
            );
        }

        // Hard delete member (cascade will handle transactions)
        await prisma.loyaltyMember.delete({
            where: { id: params.id },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'LoyaltyMember',
            entityId: params.id,
            newValues: { memberCode: existingMember.memberCode, name: existingMember.name },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.REWARD_DEACTIVATED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
