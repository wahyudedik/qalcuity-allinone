import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { formatZodError } from '@/lib/validation-schemas';
import { z } from 'zod';

const updateStockOpnameSchema = z.object({
    status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    notes: z.string().optional(),
});

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const opname = await prisma.stockOpname.findFirst({
            where: { id, tenantId },
            include: {
                warehouse: { select: { id: true, name: true, code: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true, stock: true } },
                    },
                },
            },
        });

        if (!opname) {
            return NextResponse.json(
                { success: false, error: 'Stock opname tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: opname });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const validation = updateStockOpnameSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.stockOpname.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Stock opname tidak ditemukan' },
                { status: 404 }
            );
        }

        // Validate status transitions
        if (validatedData.status) {
            const validTransitions: Record<string, string[]> = {
                DRAFT: ['IN_PROGRESS', 'CANCELLED'],
                IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
                COMPLETED: [],
                CANCELLED: [],
            };
            const allowed = validTransitions[existing.status] || [];
            if (!allowed.includes(validatedData.status)) {
                return NextResponse.json(
                    { success: false, error: `Transisi dari status ${existing.status} ke ${validatedData.status} tidak diizinkan` },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, unknown> = {};
        if (validatedData.status !== undefined) updateData.status = validatedData.status;
        if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

        const updated = await prisma.stockOpname.update({
            where: { id },
            data: updateData,
        });

        // Audit logging
        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'StockOpname',
            entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            newValues: updated as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
