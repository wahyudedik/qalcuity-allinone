import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createWarehouseSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const activeOnly = searchParams.get('activeOnly');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
                { city: { contains: search } },
            ];
        }

        if (activeOnly === 'true') {
            where.isActive = true;
        }

        const [warehouses, total] = await Promise.all([
            prisma.warehouse.findMany({
                where,
                include: {
                    _count: { select: { products: true, stockOpnames: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.warehouse.count({ where }),
        ]);

        const data = warehouses.map((w) => ({
            id: w.id,
            name: w.name,
            code: w.code,
            address: w.address,
            city: w.city,
            phone: w.phone,
            email: w.email,
            manager: w.manager,
            isActive: w.isActive,
            isDefault: w.isDefault,
            productCount: w._count.products,
            opnameCount: w._count.stockOpnames,
            createdAt: w.createdAt.toISOString(),
            updatedAt: w.updatedAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createWarehouseSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }
        const validatedData = validation.data;

        // If isDefault, unset other defaults
        if (validatedData.isDefault) {
            await prisma.warehouse.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                tenantId,
                name: validatedData.name,
                code: validatedData.code,
                address: validatedData.address || null,
                city: validatedData.city || null,
                phone: validatedData.phone || null,
                email: validatedData.email || null,
                manager: validatedData.manager || null,
                isDefault: validatedData.isDefault || false,
            },
        });

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Warehouse', entityId: warehouse.id, newValues: { name: warehouse.name, code: warehouse.code } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
