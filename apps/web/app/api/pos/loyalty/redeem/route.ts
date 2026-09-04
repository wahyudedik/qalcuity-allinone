import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { redeemLoyaltyPointsSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:loyalty:redeem:POST:${ip}`, 30, 60000);
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
        const validation = redeemLoyaltyPointsSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { memberId, rewardId } = validation.data;

        // Find member
        const member = await prisma.loyaltyMember.findFirst({
            where: { id: memberId, tenantId },
        });

        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Member tidak ditemukan' },
                { status: 404 }
            );
        }

        // Find reward
        const reward = await prisma.loyaltyReward.findFirst({
            where: { id: rewardId, tenantId, isActive: true },
        });

        if (!reward) {
            return NextResponse.json(
                { success: false, error: 'Reward tidak ditemukan atau sudah tidak aktif' },
                { status: 404 }
            );
        }

        // Check stock
        if (reward.stock === 0) {
            return NextResponse.json(
                { success: false, error: 'Reward sudah habis' },
                { status: 400 }
            );
        }

        // Check points balance
        if (member.points < reward.pointsCost) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Poin tidak mencukupi. Dibutuhkan ${reward.pointsCost} poin, tersedia ${member.points} poin`,
                },
                { status: 400 }
            );
        }

        // Process redemption in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Deduct points from member
            const updatedMember = await tx.loyaltyMember.update({
                where: { id: memberId },
                data: {
                    points: { decrement: reward.pointsCost },
                },
            });

            // Create loyalty transaction (negative points for redemption)
            const loyaltyTx = await tx.loyaltyTransaction.create({
                data: {
                    tenantId,
                    memberId,
                    type: 'REDEEM',
                    points: -reward.pointsCost,
                    description: `Redeem: ${reward.name}`,
                },
            });

            // Decrement stock if not unlimited (-1)
            if (reward.stock !== -1) {
                await tx.loyaltyReward.update({
                    where: { id: rewardId },
                    data: { stock: { decrement: 1 } },
                });
            }

            return { updatedMember, loyaltyTx };
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'LoyaltyTransaction',
            entityId: result.loyaltyTx.id,
            newValues: {
                memberId,
                rewardId,
                rewardName: reward.name,
                pointsRedeemed: reward.pointsCost,
                remainingPoints: result.updatedMember.points,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                transactionId: result.loyaltyTx.id,
                reward: {
                    id: reward.id,
                    name: reward.name,
                    rewardType: reward.rewardType,
                    rewardValue: Number(reward.rewardValue),
                },
                pointsRedeemed: reward.pointsCost,
                remainingPoints: result.updatedMember.points,
                createdAt: result.loyaltyTx.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
