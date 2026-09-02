import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createTaxRateSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-rates:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:tax-rates:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh create tax rate
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat data pajak' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = createTaxRateSchema.safeParse(body);
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
