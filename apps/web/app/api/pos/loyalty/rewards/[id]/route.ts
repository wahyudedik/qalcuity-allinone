import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { formatZodError } from '@/lib/validation-schemas';
import { z } from 'zod';

const updateRewardSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    pointsCost: z.number().int().min(1).optional(),
    rewardType: z.enum(['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_ITEM', 'VOUCHER']).optional(),
    rewardValue: z.number().min(0).optional(),
    stock: z.number().int().optional(),
});

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengubah reward' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateRewardSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existingReward = await prisma.loyaltyReward.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existingReward) {
            return NextResponse.json(
                { success: false, error: 'Reward tidak ditemukan' },
                { status: 404 }
            );
        }

        const validatedData = validation.data;
        const updatedReward = await prisma.loyaltyReward.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.description !== undefined && { description: validatedData.description || null }),
                ...(validatedData.pointsCost !== undefined && { pointsCost: validatedData.pointsCost }),
                ...(validatedData.rewardType !== undefined && { rewardType: validatedData.rewardType }),
                ...(validatedData.rewardValue !== undefined && { rewardValue: validatedData.rewardValue }),
                ...(validatedData.stock !== undefined && { stock: validatedData.stock }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'LoyaltyReward',
            entityId: params.id,
            oldValues: { name: existingReward.name },
            newValues: validatedData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedReward.id,
                name: updatedReward.name,
                description: updatedReward.description,
                pointsCost: updatedReward.pointsCost,
                rewardType: updatedReward.rewardType,
                rewardValue: Number(updatedReward.rewardValue),
                isActive: updatedReward.isActive,
                stock: updatedReward.stock,
                createdAt: updatedReward.createdAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:rewards:DELETE:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menghapus reward' },
                { status: 403 }
            );
        }

        const existingReward = await prisma.loyaltyReward.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existingReward) {
            return NextResponse.json(
                { success: false, error: 'Reward tidak ditemukan' },
                { status: 404 }
            );
        }

        // Soft delete: set isActive to false
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
            oldValues: { name: existingReward.name, isActive: true },
            newValues: { isActive: false },
            request,
        });

        return NextResponse.json({
            success: true,
            message: 'Reward berhasil dinonaktifkan',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
