/**
 * GET /api/admin/plans/[id] — Get plan details
 * PUT /api/admin/plans/[id] — Update plan (SUPERADMIN only)
 * DELETE /api/admin/plans/[id] — Delete plan (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth, isSuperAdmin } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { invalidateEntitlementCache } from '@/lib/entitlement';
import { z } from 'zod';

const updatePlanSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    priceMonthly: z.number().int().min(0).optional(),
    priceYearly: z.number().int().min(0).optional().nullable(),
    maxUsers: z.number().int().min(-1).optional(),
    maxStorage: z.number().int().min(0).optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    features: z.array(z.object({
        featureKey: z.string().min(1),
        enabled: z.boolean(),
        limit: z.number().int().min(0).nullable().optional(),
    })).optional(),
});

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAdminAuth();
        const { id } = params;

        const plan = await prisma.plan.findUnique({
            where: { id },
            include: {
                features: true,
                _count: {
                    select: {
                        entitlements: true,
                    },
                },
            },
        });

        if (!plan) {
            return NextResponse.json(
                { success: false, error: 'Paket tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...plan,
                tenantCount: plan._count.entitlements,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        console.error('[AdminPlan] Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data paket' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAdminAuth();

        if (!isSuperAdmin({ user: auth } as never)) {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang dapat mengubah paket' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();

        const validation = updatePlanSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validasi gagal',
                    details: validation.error.issues.map((i) => ({
                        field: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 400 }
            );
        }

        // Check plan exists
        const existingPlan = await prisma.plan.findUnique({
            where: { id },
            include: { features: true },
        });

        if (!existingPlan) {
            return NextResponse.json(
                { success: false, error: 'Paket tidak ditemukan' },
                { status: 404 }
            );
        }

        const { features, ...planUpdateData } = validation.data;

        // Sanitize name if provided
        if (planUpdateData.name) {
            planUpdateData.name = sanitizeInput(planUpdateData.name);
        }

        // Update plan
        const updatedPlan = await prisma.plan.update({
            where: { id },
            data: planUpdateData,
            include: {
                features: true,
            },
        });

        // Update features if provided
        if (features) {
            // Delete existing features and recreate
            await prisma.planFeature.deleteMany({
                where: { planId: id },
            });

            await prisma.planFeature.createMany({
                data: features.map((f) => ({
                    planId: id,
                    featureKey: f.featureKey,
                    enabled: f.enabled,
                    limit: f.limit ?? null,
                })),
            });

            // Invalidate cache for all tenants on this plan
            const entitlements = await prisma.tenantEntitlement.findMany({
                where: { planId: id },
                select: { tenantId: true },
            });

            for (const ent of entitlements) {
                invalidateEntitlementCache(ent.tenantId);
            }
        }

        // Log audit
        void logAudit({
            userId: auth.userId,
            tenantId: auth.tenantId,
            action: 'UPDATE',
            entity: 'Plan',
            entityId: id,
            oldValues: {
                name: existingPlan.name,
                priceMonthly: existingPlan.priceMonthly,
            } as Record<string, unknown>,
            newValues: {
                ...planUpdateData,
                featuresUpdated: !!features,
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: updatedPlan,
            message: `Paket "${updatedPlan.name}" berhasil diupdate`,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        console.error('[AdminPlan] Error updating plan:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengupdate paket' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAdminAuth();

        if (!isSuperAdmin({ user: auth } as never)) {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang dapat menghapus paket' },
                { status: 403 }
            );
        }

        const { id } = params;

        // Check plan exists
        const plan = await prisma.plan.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        entitlements: true,
                    },
                },
            },
        });

        if (!plan) {
            return NextResponse.json(
                { success: false, error: 'Paket tidak ditemukan' },
                { status: 404 }
            );
        }

        // Prevent deleting plan that has active tenants
        if (plan._count.entitlements > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Paket "${plan.name}" masih digunakan oleh ${plan._count.entitlements} tenant. Nonaktifkan paket terlebih dahulu.`,
                },
                { status: 400 }
            );
        }

        // Delete plan (features cascade)
        await prisma.plan.delete({
            where: { id },
        });

        // Log audit
        void logAudit({
            userId: auth.userId,
            tenantId: auth.tenantId,
            action: 'DELETE',
            entity: 'Plan',
            entityId: id,
            oldValues: {
                name: plan.name,
                slug: plan.slug,
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Paket "${plan.name}" berhasil dihapus`,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        console.error('[AdminPlan] Error deleting plan:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal menghapus paket' },
            { status: 500 }
        );
    }
}
