import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createLoyaltyRewardSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:${ip}`, 60, 60000);
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
        const showAll = searchParams.get('showAll') === 'true';

        const where: Record<string, unknown> = { tenantId };
        if (!showAll) {
            where.isActive = true;
        }

        const rewards = await prisma.loyaltyReward.findMany({
            where,
            orderBy: { pointsCost: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: rewards.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                pointsCost: r.pointsCost,
                rewardType: r.rewardType,
                rewardValue: Number(r.rewardValue),
                isActive: r.isActive,
                stock: r.stock,
                createdAt: r.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can create rewards
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat reward' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createLoyaltyRewardSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const reward = await prisma.loyaltyReward.create({
            data: {
                tenantId,
                name: validatedData.name,
                description: validatedData.description || null,
                pointsCost: validatedData.pointsCost,
                rewardType: validatedData.rewardType,
                rewardValue: validatedData.rewardValue,
                stock: validatedData.stock ?? -1,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'LoyaltyReward',
            entityId: reward.id,
            newValues: { name: validatedData.name, pointsCost: validatedData.pointsCost, rewardType: validatedData.rewardType },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: reward.id,
                name: reward.name,
                description: reward.description,
                pointsCost: reward.pointsCost,
                rewardType: reward.rewardType,
                rewardValue: Number(reward.rewardValue),
                isActive: reward.isActive,
                stock: reward.stock,
                createdAt: reward.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
