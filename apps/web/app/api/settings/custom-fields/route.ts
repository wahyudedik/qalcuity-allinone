import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createCustomFieldSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';

// ─── GET /api/settings/custom-fields?entity=product ──────────────────────────

/**
 * Dapatkan custom fields untuk tenant.
 * Query param: entity (optional) — filter by entity
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');

        const where: Record<string, unknown> = { tenantId, isActive: true };
        if (entity) {
            where.entity = entity;
        }

        const fields = await prisma.tenantCustomField.findMany({
            where: where as never,
            orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }],
        });

        return NextResponse.json({
            success: true,
            data: fields,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── POST /api/settings/custom-fields ────────────────────────────────────────

/**
 * Buat custom field baru untuk tenant.
 * Hanya ADMIN dan SUPERADMIN.
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat custom field' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = createCustomFieldSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { entity, fieldName, fieldLabel, fieldType, required, options, defaultValue, sortOrder } = validation.data;

        // Check if field already exists for this entity
        const existing = await prisma.tenantCustomField.findUnique({
            where: {
                tenantId_entity_fieldName: {
                    tenantId,
                    entity,
                    fieldName,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: `Field "${fieldName}" sudah ada untuk entity "${entity}"` },
                { status: 409 }
            );
        }

        // Create custom field
        const field = await prisma.tenantCustomField.create({
            data: {
                tenantId,
                entity,
                fieldName,
                fieldLabel,
                fieldType,
                required: required ?? false,
                options: options ?? undefined,
                defaultValue: defaultValue ?? undefined,
                sortOrder: sortOrder ?? 0,
            },
        });

        // Audit log
        await logAudit({
            tenantId,
            userId,
            action: 'CREATE',
            entity: 'TenantCustomField',
            entityId: field.id,
            newValues: { entity, fieldName, fieldLabel, fieldType } as Record<string, unknown>,
        });

        return NextResponse.json({
            success: true,
            data: field,
        }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
