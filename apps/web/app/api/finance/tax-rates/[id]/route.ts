export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createTaxRateSchema, updateTaxRateSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError, apiForbidden } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-rates:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const activeOnly = searchParams.get('active') === 'true';

        const where: Record<string, unknown> = { tenantId };
        if (type) where.type = type.toUpperCase();
        if (activeOnly) where.isActive = true;

        const taxRates = await prisma.taxRate.findMany({
            where,
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        const data = taxRates.map((tr) => ({
            id: tr.id,
            name: tr.name,
            code: tr.code,
            rate: Number(tr.rate),
            type: tr.type,
            isActive: tr.isActive,
            isDefault: tr.isDefault,
            createdAt: tr.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-rates:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh create tax rate
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createTaxRateSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Cek duplikasi code per tenant
        const existing = await prisma.taxRate.findUnique({
            where: { tenantId_code: { tenantId, code: validatedData.code } },
        });
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Kode pajak sudah digunakan' },
                { status: 409 }
            );
        }

        // Jika isDefault=true, unset default lain untuk type yang sama
        if (validatedData.isDefault) {
            const taxType = validatedData.type || 'VAT';
            await prisma.taxRate.updateMany({
                where: { tenantId, type: taxType, isDefault: true },
                data: { isDefault: false },
            });
        }

        const taxRate = await prisma.taxRate.create({
            data: {
                tenantId,
                name: validatedData.name,
                code: validatedData.code,
                rate: validatedData.rate,
                type: validatedData.type || 'VAT',
                isActive: validatedData.isActive ?? true,
                isDefault: validatedData.isDefault ?? false,
            },
        });

        void logAudit({
            userId, tenantId, action: 'CREATE', entity: 'TaxRate', entityId: taxRate.id,
            newValues: taxRate as unknown as Record<string, unknown>, request,
        });

        return NextResponse.json({ success: true, data: taxRate }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-rates:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh update tax rate
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const { id } = params;

        const existing = await prisma.taxRate.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
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

        const validatedData = validation.data;

        // Cek duplikasi code per tenant (jika code diubah)
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

        const updateData: Record<string, unknown> = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.code !== undefined) updateData.code = validatedData.code;
        if (validatedData.rate !== undefined) updateData.rate = validatedData.rate;
        if (validatedData.type !== undefined) updateData.type = validatedData.type;
        if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
        if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault;

        const taxRate = await prisma.taxRate.update({
            where: { id },
            data: updateData,
        });

        void logAudit({
            userId, tenantId, action: 'UPDATE', entity: 'TaxRate', entityId: id,
            oldValues: { name: existing.name, code: existing.code, rate: existing.rate, type: existing.type, isActive: existing.isActive },
            newValues: { name: taxRate.name, code: taxRate.code, rate: taxRate.rate, type: taxRate.type, isActive: taxRate.isActive },
            request,
        });

        return NextResponse.json({ success: true, data: taxRate });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-rates:DELETE:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh delete tax rate
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const { id } = params;

        const existing = await prisma.taxRate.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        // Cek apakah tax rate digunakan di invoice manapun (berdasarkan taxCode snapshot)
        const invoiceCount = await prisma.invoice.count({
            where: {
                tenantId,
                taxCode: existing.code,
            },
        });
        if (invoiceCount > 0) {
            return NextResponse.json(
                { success: false, error: `Tax rate ini digunakan di ${invoiceCount} invoice dan tidak dapat dihapus` },
                { status: 400 }
            );
        }

        await prisma.taxRate.delete({ where: { id } });

        void logAudit({
            userId, tenantId, action: 'DELETE', entity: 'TaxRate', entityId: id,
            oldValues: { name: existing.name, code: existing.code, rate: existing.rate, type: existing.type },
            request,
        });

        return NextResponse.json({ success: true, message: 'Tax rate berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
