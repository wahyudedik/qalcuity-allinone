import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateCustomFieldSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError, apiNotFound, apiForbidden } from '@/lib/api-error';

// ─── GET /api/settings/custom-fields/[id] ────────────────────────────────────

/**
 * Dapatkan detail custom field berdasarkan ID.
 */
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`settings:custom-fields:[id]:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

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
            return apiNotFound('Custom Field');
        }

        return NextResponse.json({
            success: true,
            data: field,
        });
    } catch (error) {
        return handleApiError(error);
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
        const ip = getClientIp(request);
        const rl = checkRateLimit(`settings:custom-fields:[id]:PUT:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = updateCustomFieldSchema.safeParse(sanitizedBody);
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
            return apiNotFound('Custom Field');
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
        return handleApiError(error);
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
        const ip = getClientIp(request);
        const rl = checkRateLimit(`settings:custom-fields:[id]:DELETE:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const { id } = params;

        // Check if field exists and belongs to this tenant
        const existing = await prisma.tenantCustomField.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return apiNotFound('Custom Field');
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
        return handleApiError(error);
    }
}
