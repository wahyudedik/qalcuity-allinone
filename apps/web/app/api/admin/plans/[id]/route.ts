export const dynamic = 'force-dynamic';

/**
 * GET    /api/admin/plans/[id] — Get a single plan by ID
 * PUT    /api/admin/plans/[id] — Update a plan (SUPERADMIN only)
 * DELETE /api/admin/plans/[id] — Delete a plan (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requireAdminAuth, isSuperAdmin } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const updatePlanSchema = z.object({
    name: z.string().min(1, MSG.NAME_REQUIRED).max(100).optional(),
    slug: z.string().min(1, MSG.SLUG_REQUIRED).max(50).regex(/^[a-z0-9-]+$/, MSG.SLUG_ONLY_LOWERCASE_HYPHEN).optional(),
    description: z.string().max(500).optional(),
    priceMonthly: z.number().min(0, 'Price must not be negative').optional(),
    priceYearly: z.number().min(0).optional(),
    maxUsers: z.number().int().min(-1, 'Max users must be at least -1 (unlimited)').optional(),
    maxStorage: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    features: z.array(z.object({
        featureKey: z.string().min(1),
        enabled: z.boolean().default(true),
        limit: z.number().int().min(0).nullable().optional(),
    })).optional(),
});

// ─── GET /api/admin/plans/[id] ──────────────────────────────────────────────
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(_request);
        const rateLimitResult = checkRateLimit(`api:admin:plans:GET:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        await requireAdminAuth();

        const plan = await prisma.plan.findUnique({
            where: { id: params.id },
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
                { success: false, error: MSG.PLAN_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: plan.id,
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                priceMonthly: Number(plan.priceMonthly),
                priceYearly: plan.priceYearly != null ? Number(plan.priceYearly) : null,
                maxUsers: plan.maxUsers,
                maxStorage: plan.maxStorage,
                isActive: plan.isActive,
                sortOrder: plan.sortOrder,
                features: plan.features,
                tenantCount: plan._count.entitlements,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        return handleApiError(error);
    }
}

// ─── PUT /api/admin/plans/[id] ──────────────────────────────────────────────
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:admin:plans:PUT:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requireAdminAuth();

        if (!isSuperAdmin({ user: auth } as never)) {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang dapat mengubah paket' },
                { status: 403 }
            );
        }

        // Verify plan exists
        const existingPlan = await prisma.plan.findUnique({
            where: { id: params.id },
        });

        if (!existingPlan) {
            return NextResponse.json(
                { success: false, error: MSG.PLAN_NOT_FOUND },
                { status: 404 }
            );
        }

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

        const { features, ...planData } = validation.data;

        // Check slug uniqueness if slug is being changed
        if (planData.slug && planData.slug !== existingPlan.slug) {
            const slugExists = await prisma.plan.findUnique({
                where: { slug: planData.slug },
            });

            if (slugExists) {
                return NextResponse.json(
                    { success: false, error: MSG.SLUG_IN_USE },
                    { status: 409 }
                );
            }
        }

        // Build update data with sanitized fields
        const updateData: Record<string, unknown> = { ...planData };
        if (planData.name !== undefined) {
            updateData.name = sanitizeInput(planData.name);
        }
        if (planData.description !== undefined) {
            updateData.description = planData.description ? sanitizeInput(planData.description) : null;
        }

        // Update plan — if features are provided, replace them entirely
        const updatedPlan = await prisma.plan.update({
            where: { id: params.id },
            data: {
                ...updateData,
                ...(features !== undefined && {
                    features: {
                        deleteMany: {},
                        create: features.map((f) => ({
                            featureKey: f.featureKey,
                            enabled: f.enabled,
                            limit: f.limit ?? null,
                        })),
                    },
                }),
            },
            include: {
                features: true,
            },
        });

        // Log audit
        void logAudit({
            userId: auth.userId,
            tenantId: auth.tenantId,
            action: 'UPDATE',
            entity: 'Plan',
            entityId: updatedPlan.id,
            oldValues: {
                name: existingPlan.name,
                slug: existingPlan.slug,
                priceMonthly: Number(existingPlan.priceMonthly),
            },
            newValues: {
                name: updatedPlan.name,
                slug: updatedPlan.slug,
                priceMonthly: Number(updatedPlan.priceMonthly),
                featureCount: updatedPlan.features.length,
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: updatedPlan,
            message: `Paket "${updatedPlan.name}" berhasil diperbarui`,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        return handleApiError(error);
    }
}

// ─── DELETE /api/admin/plans/[id] ───────────────────────────────────────────
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:admin:plans:DELETE:${ip}`, 5, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requireAdminAuth();

        if (!isSuperAdmin({ user: auth } as never)) {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang dapat menghapus paket' },
                { status: 403 }
            );
        }

        // Verify plan exists
        const existingPlan = await prisma.plan.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        entitlements: true,
                    },
                },
            },
        });

        if (!existingPlan) {
            return NextResponse.json(
                { success: false, error: MSG.PLAN_NOT_FOUND },
                { status: 404 }
            );
        }

        // Prevent deletion if plan has active tenants
        if (existingPlan._count.entitlements > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Paket "${existingPlan.name}" masih digunakan oleh ${existingPlan._count.entitlements} tenant. Nonaktifkan paket terlebih dahulu.`,
                },
                { status: 409 }
            );
        }

        // Delete plan (features cascade delete via Prisma schema)
        await prisma.plan.delete({
            where: { id: params.id },
        });

        // Log audit
        void logAudit({
            userId: auth.userId,
            tenantId: auth.tenantId,
            action: 'DELETE',
            entity: 'Plan',
            entityId: params.id,
            oldValues: {
                name: existingPlan.name,
                slug: existingPlan.slug,
                priceMonthly: Number(existingPlan.priceMonthly),
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Paket "${existingPlan.name}" berhasil dihapus`,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        return handleApiError(error);
    }
}
