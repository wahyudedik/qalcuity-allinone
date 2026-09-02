/**
 * GET /api/admin/plans — List all plans
 * POST /api/admin/plans — Create a new plan (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth, isSuperAdmin } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

type PlanWithFeatures = Prisma.PlanGetPayload<{
    include: { features: true; _count: { select: { entitlements: true } } };
}>;

const createPlanSchema = z.object({
    name: z.string().min(1, 'Nama plan wajib diisi').max(100),
    slug: z.string().min(1, 'Slug wajib diisi').max(50).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
    description: z.string().max(500).optional(),
    priceMonthly: z.number().int().min(0, 'Harga bulanan tidak boleh negatif'),
    priceYearly: z.number().int().min(0).optional(),
    maxUsers: z.number().int().min(-1, 'Max users minimal -1 (unlimited)'),
    maxStorage: z.number().int().min(0).optional(),
    sortOrder: z.number().int().default(0),
    features: z.array(z.object({
        featureKey: z.string().min(1),
        enabled: z.boolean().default(true),
        limit: z.number().int().min(0).nullable().optional(),
    })).optional(),
});

export async function GET() {
    try {
        const auth = await requireAdminAuth();

        const plans = await prisma.plan.findMany({
            include: {
                features: true,
                _count: {
                    select: {
                        entitlements: true,
                    },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: plans.map((plan: PlanWithFeatures) => ({
                id: plan.id,
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                priceMonthly: plan.priceMonthly,
                priceYearly: plan.priceYearly,
                maxUsers: plan.maxUsers,
                maxStorage: plan.maxStorage,
                isActive: plan.isActive,
                sortOrder: plan.sortOrder,
                features: plan.features,
                tenantCount: plan._count.entitlements,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt,
            })),
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        console.error('[AdminPlans] Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data paket' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAdminAuth();

        if (!isSuperAdmin({ user: auth } as never)) {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang dapat membuat paket' },
                { status: 403 }
            );
        }

        const body = await request.json();

        const validation = createPlanSchema.safeParse(body);
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

        // Check slug uniqueness
        const existing = await prisma.plan.findUnique({
            where: { slug: planData.slug },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Slug sudah digunakan' },
                { status: 409 }
            );
        }

        // Create plan with features
        const plan = await prisma.plan.create({
            data: {
                ...planData,
                name: sanitizeInput(planData.name),
                description: planData.description ? sanitizeInput(planData.description) : null,
                features: features
                    ? {
                        create: features.map((f) => ({
                            featureKey: f.featureKey,
                            enabled: f.enabled,
                            limit: f.limit ?? null,
                        })),
                    }
                    : undefined,
            },
            include: {
                features: true,
            },
        });

        // Log audit
        void logAudit({
            userId: auth.userId,
            tenantId: auth.tenantId,
            action: 'CREATE',
            entity: 'Plan',
            entityId: plan.id,
            newValues: {
                name: plan.name,
                slug: plan.slug,
                priceMonthly: plan.priceMonthly,
                featureCount: plan.features.length,
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: plan,
            message: `Paket "${plan.name}" berhasil dibuat`,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }
        console.error('[AdminPlans] Error creating plan:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal membuat paket' },
            { status: 500 }
        );
    }
}
