import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateLoyaltyMemberSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:members:GET:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const member = await prisma.loyaltyMember.findFirst({
            where: { id: params.id, tenantId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });

        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Member tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: member.id,
                memberCode: member.memberCode,
                name: member.name,
                email: member.email,
                phone: member.phone,
                contactId: member.contactId,
                tier: member.tier,
                points: member.points,
                totalSpent: Number(member.totalSpent),
                createdAt: member.createdAt.toISOString(),
                updatedAt: member.updatedAt.toISOString(),
                transactions: member.transactions.map((t) => ({
                    id: t.id,
                    type: t.type,
                    points: t.points,
                    description: t.description,
                    transactionId: t.transactionId,
                    createdAt: t.createdAt.toISOString(),
                })),
            },
        });
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
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateLoyaltyMemberSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existingMember = await prisma.loyaltyMember.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existingMember) {
            return NextResponse.json(
                { success: false, error: 'Member tidak ditemukan' },
                { status: 404 }
            );
        }

        const validatedData = validation.data;
        const updatedMember = await prisma.loyaltyMember.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.email !== undefined && { email: validatedData.email || null }),
                ...(validatedData.phone !== undefined && { phone: validatedData.phone || null }),
                ...(validatedData.tier !== undefined && { tier: validatedData.tier }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'LoyaltyMember',
            entityId: params.id,
            oldValues: { name: existingMember.name, tier: existingMember.tier },
            newValues: validatedData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedMember.id,
                memberCode: updatedMember.memberCode,
                name: updatedMember.name,
                email: updatedMember.email,
                phone: updatedMember.phone,
                tier: updatedMember.tier,
                points: updatedMember.points,
                totalSpent: Number(updatedMember.totalSpent),
                createdAt: updatedMember.createdAt.toISOString(),
                updatedAt: updatedMember.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
