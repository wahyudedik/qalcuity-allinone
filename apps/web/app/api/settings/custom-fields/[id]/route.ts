import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateCustomFieldSchema, formatZodError } from '@/lib/validation-schemas';

// ─── GET /api/settings/custom-fields/[id] ────────────────────────────────────

/**
 * Dapatkan detail custom field berdasarkan ID.
 */
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;
        const { id } = params;

        const field = await prisma.tenantCustomField.findFirst({
            where: { id, tenantId },
        });

        if (!field) {
            return NextResponse.json(
                { success: false, error: 'Custom field tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: field,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── PUT /api/settings/custom-fields/[id] ────────────────────────────────────

/**
 * Update custom field berdasarkan ID.
 * Hanya ADMIN dan SUPERADMIN.
 */
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengubah custom field' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();

        const validation = updateCustomFieldSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Check if field exists and belongs to this tenant
        const existing = await prisma.tenantCustomField.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Custom field tidak ditemukan' },
                { status: 404 }
            );
        }

        // Update field — cast to handle Prisma JSON type
        const updateData: Record<string, unknown> = { ...validation.data };
        if (updateData.options === null) {
            updateData.options = undefined; // Prisma doesn't accept null for Json optional
        }
        const updated = await prisma.tenantCustomField.update({
            where: { id },
            data: updateData as never,
        });

        // Audit log
        await logAudit({
            tenantId,
            userId,
            action: 'UPDATE',
            entity: 'TenantCustomField',
            entityId: updated.id,
            oldValues: existing as unknown as Record<string, unknown>,
            newValues: validation.data as Record<string, unknown>,
        });

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── DELETE /api/settings/custom-fields/[id] ─────────────────────────────────

/**
 * Hapus custom field berdasarkan ID.
 * Hanya ADMIN dan SUPERADMIN.
 * Menggunakan soft delete (set isActive = false).
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menghapus custom field' },
                { status: 403 }
            );
        }

        const { id } = params;

        // Check if field exists and belongs to this tenant
        const existing = await prisma.tenantCustomField.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Custom field tidak ditemukan' },
                { status: 404 }
            );
        }

        // Soft delete
        await prisma.tenantCustomField.update({
            where: { id },
            data: { isActive: false },
        });

        // Audit log
        await logAudit({
            tenantId,
            userId,
            action: 'DELETE',
            entity: 'TenantCustomField',
            entityId: id,
            oldValues: { entity: existing.entity, fieldName: existing.fieldName } as Record<string, unknown>,
        });

        return NextResponse.json({
            success: true,
            message: 'Custom field berhasil dihapus',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
