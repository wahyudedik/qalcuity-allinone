import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const lowStock = searchParams.get('lowStock');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId: auth.tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { description: { contains: search } },
            ];
        }

        if (category) {
            where.categoryId = category;
        }

        if (lowStock === 'true') {
            where.stock = { lte: prisma.product.fields.minStock };
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    _count: { select: { stockMovements: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.product.count({ where }),
        ]);

        const data = products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            unit: p.unit,
            price: p.price,
            cost: p.cost,
            stock: p.stock,
            minStock: p.minStock,
            isActive: p.isActive,
            categoryId: p.categoryId,
            categoryName: p.category?.name || null,
            isLowStock: p.stock <= p.minStock,
            createdAt: p.createdAt.toISOString(),
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
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuth();
        const body = await request.json();

        if (!body.name || !body.sku) {
            return NextResponse.json(
                { success: false, error: 'Name and SKU are required' },
                { status: 400 }
            );
        }

        const product = await prisma.product.create({
            data: {
                tenantId: auth.tenantId,
                sku: body.sku,
                name: body.name,
                description: body.description || null,
                unit: body.unit || 'pcs',
                price: body.price || 0,
                cost: body.cost || 0,
                stock: body.stock || 0,
                minStock: body.minStock || 0,
                categoryId: body.categoryId || null,
            },
        });

        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        if (message.includes('Unique constraint')) {
            return NextResponse.json(
                { success: false, error: 'SKU already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requireAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.product.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            );
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(typeof updateData.sku === 'string' && { sku: updateData.sku }),
                ...(typeof updateData.name === 'string' && { name: updateData.name }),
                ...(typeof updateData.description === 'string' && { description: updateData.description }),
                ...(typeof updateData.unit === 'string' && { unit: updateData.unit }),
                ...(typeof updateData.price === 'number' && { price: updateData.price }),
                ...(typeof updateData.cost === 'number' && { cost: updateData.cost }),
                ...(typeof updateData.stock === 'number' && { stock: updateData.stock }),
                ...(typeof updateData.minStock === 'number' && { minStock: updateData.minStock }),
                ...(typeof updateData.categoryId === 'string' && { categoryId: updateData.categoryId }),
                ...(typeof updateData.isActive === 'boolean' && { isActive: updateData.isActive }),
            },
        });

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.product.findFirst({
            where: { id, tenantId: auth.tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            );
        }

        await prisma.product.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
