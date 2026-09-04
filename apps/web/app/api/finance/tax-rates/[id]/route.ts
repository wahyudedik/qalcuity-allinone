import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateTaxRateSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError, apiNotFound, apiForbidden } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const taxRate = await prisma.taxRate.findFirst({
            where: { id, tenantId },
        });

        if (!taxRate) {
            return apiNotFound('Tax Rate');
        }

        return NextResponse.json({
            success: true,
            data: {
                id: taxRate.id,
                name: taxRate.name,
                code: taxRate.code,
                rate: Number(taxRate.rate),
                type: taxRate.type,
                isActive: taxRate.isActive,
                isDefault: taxRate.isDefault,
                createdAt: taxRate.createdAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
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

        // Hanya ADMIN+ yang boleh update tax rate
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateTaxRateSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify tax rate belongs to tenant
        const existing = await prisma.taxRate.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return apiNotFound('Tax Rate');
        }

        const validatedData = validation.data;

        // Cek duplikasi code jika code berubah
        if (validatedData.code && validatedData.code !== existing.code) {
            const duplicate = await prisma.taxRate.findUnique({
                where: { tenantId_code: { tenantId, code: validatedData.code } },
            });
            if (duplicate) {
                return NextResponse.json(
                    { success: false, error: 'Kode pajak sudah digunakan' },
                    { status: 409 }
                );
            }
        }

        // Jika isDefault=true, unset default lain untuk type yang sama
        if (validatedData.isDefault) {
            const taxType = validatedData.type || existing.type;
            await prisma.taxRate.updateMany({
                where: { tenantId, type: taxType, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        const data: Record<string, unknown> = {};
        if (validatedData.name !== undefined) data.name = validatedData.name;
        if (validatedData.code !== undefined) data.code = validatedData.code;
        if (validatedData.rate !== undefined) data.rate = validatedData.rate;
        if (validatedData.type !== undefined) data.type = validatedData.type;
        if (validatedData.isActive !== undefined) data.isActive = validatedData.isActive;
        if (validatedData.isDefault !== undefined) data.isDefault = validatedData.isDefault;

        const taxRate = await prisma.taxRate.update({
            where: { id },
            data,
        });

        void logAudit({
            userId, tenantId, action: 'UPDATE', entity: 'TaxRate', entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            newValues: data, request,
        });

        return NextResponse.json({ success: true, data: taxRate });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        // Hanya ADMIN+ yang boleh delete tax rate
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const existing = await prisma.taxRate.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return apiNotFound('Tax Rate');
        }

        await prisma.taxRate.delete({ where: { id } });

        void logAudit({
            userId, tenantId, action: 'DELETE', entity: 'TaxRate', entityId: id,
            oldValues: existing as unknown as Record<string, unknown>, request,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
