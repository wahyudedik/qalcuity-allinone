export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createLoyaltyRewardSchema, updateLoyaltyRewardSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:${ip}`, 60, 60000);
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
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can create rewards
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_ADMIN_ONLY_CREATE },
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

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can update rewards
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        // Check reward exists
        const existingReward = await prisma.loyaltyReward.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingReward) {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateLoyaltyRewardSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const reward = await prisma.loyaltyReward.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.description !== undefined && { description: validatedData.description }),
                ...(validatedData.pointsCost !== undefined && { pointsCost: validatedData.pointsCost }),
                ...(validatedData.rewardType !== undefined && { rewardType: validatedData.rewardType }),
                ...(validatedData.rewardValue !== undefined && { rewardValue: validatedData.rewardValue }),
                ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
                ...(validatedData.stock !== undefined && { stock: validatedData.stock }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'LoyaltyReward',
            entityId: reward.id,
            newValues: validatedData,
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
                updatedAt: reward.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        // Only ADMIN+ can delete rewards
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        // Check reward exists
        const existingReward = await prisma.loyaltyReward.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingReward) {
            return NextResponse.json(
                { success: false, error: MSG.REWARD_NOT_FOUND },
                { status: 404 }
            );
        }

        // Soft delete — deactivate reward
        await prisma.loyaltyReward.update({
            where: { id: params.id },
            data: { isActive: false },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'LoyaltyReward',
            entityId: params.id,
            newValues: { name: existingReward.name },
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
