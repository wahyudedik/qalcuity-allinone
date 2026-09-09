import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createProjectBudgetSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

// =============================================================================
// GET /api/projects/[id]/budget — List budget line items
// =============================================================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        const where: Record<string, unknown> = { projectId: id, tenantId };
        if (category) {
            where.category = category.toUpperCase();
        }

        const budgets = await prisma.projectBudget.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        // Calculate summary
        const summary = budgets.reduce(
            (acc, item) => ({
                totalPlanned: acc.totalPlanned + Number(item.planned),
                totalActual: acc.totalActual + Number(item.actual),
            }),
            { totalPlanned: 0, totalActual: 0 }
        );

        // Group by category
        const byCategory: Record<string, { planned: number; actual: number; count: number }> = {};
        budgets.forEach((item) => {
            if (!byCategory[item.category]) {
                byCategory[item.category] = { planned: 0, actual: 0, count: 0 };
            }
            byCategory[item.category].planned += Number(item.planned);
            byCategory[item.category].actual += Number(item.actual);
            byCategory[item.category].count += 1;
        });

        return NextResponse.json({
            success: true,
            data: budgets.map((b) => ({
                id: b.id,
                category: b.category,
                name: b.name,
                description: b.description,
                planned: Number(b.planned),
                actual: Number(b.actual),
                notes: b.notes,
                createdAt: b.createdAt.toISOString(),
                updatedAt: b.updatedAt.toISOString(),
            })),
            summary: {
                totalPlanned: summary.totalPlanned,
                totalActual: summary.totalActual,
                totalRemaining: summary.totalPlanned - summary.totalActual,
                percentUsed: summary.totalPlanned > 0
                    ? Math.round((summary.totalActual / summary.totalPlanned) * 100)
                    : 0,
            },
            byCategory,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// =============================================================================
// POST /api/projects/[id]/budget — Create budget line item
// =============================================================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const validation = createProjectBudgetSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { category, name, description, planned, actual, notes } = validation.data;

        const budget = await prisma.projectBudget.create({
            data: {
                tenantId,
                projectId: id,
                category,
                name: name.trim(),
                description: description?.trim() || null,
                planned,
                actual: actual || 0,
                notes: notes?.trim() || null,
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'ProjectBudget',
            entityId: budget.id,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: budget.id,
                category: budget.category,
                name: budget.name,
                description: budget.description,
                planned: Number(budget.planned),
                actual: Number(budget.actual),
                notes: budget.notes,
                createdAt: budget.createdAt.toISOString(),
                updatedAt: budget.updatedAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
