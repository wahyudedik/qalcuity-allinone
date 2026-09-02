import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { createCategorySchema, formatZodError } from '@/lib/validation-schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// GET /api/inventory/categories — List categories with product count and total value
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { tenantId } = auth
        // Rate limiting (using tenant-based key since no request param)
        const rateLimitResult = checkRateLimit(`api:categories:${tenantId}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }

        const categories = await prisma.category.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            include: {
                products: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        price: true,
                        stock: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        })

        const data = categories.map((category: any) => ({
            id: category.id,
            name: category.name,
            description: category.description || '',
            productCount: category.products.length,
            totalValue: category.products.reduce(
                (sum: number, product: { price?: unknown; stock?: number }) => sum + Number(product.price || 0) * (product.stock || 0),
                0
            ),
        }))

        return NextResponse.json({ success: true, data })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

// POST /api/inventory/categories — Create a new category
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:categories:POST:${ip}`, 30, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 })
        }

        const body = await request.json()

        const validation = createCategorySchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }
        const validatedData = validation.data

        const name = validatedData.name.trim()

        // Check for duplicate name within tenant
        const existing = await prisma.category.findFirst({
            where: {
                tenantId,
                name,
                isActive: true,
            },
        })

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Kategori dengan nama tersebut sudah ada' },
                { status: 409 }
            )
        }

        const category = await prisma.category.create({
            data: {
                name,
                description: validatedData.description ? validatedData.description.trim() : null,
                tenantId,
            },
            select: {
                id: true,
                name: true,
                description: true,
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Category',
            entityId: category.id,
            newValues: { name, description: category.description },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: category.id,
                name: category.name,
                description: category.description || '',
                productCount: 0,
                totalValue: 0,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

// DELETE /api/inventory/categories?id=xxx — Delete a category
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID kategori diperlukan' },
                { status: 400 }
            )
        }

        // Verify the category belongs to this tenant
        const existing = await prisma.category.findFirst({
            where: { id, tenantId, isActive: true },
            select: { id: true, name: true },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Kategori tidak ditemukan' },
                { status: 404 }
            )
        }

        // Soft-delete by setting isActive to false
        await prisma.category.update({
            where: { id },
            data: { isActive: false },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Category',
            entityId: id,
            oldValues: { name: existing.name },
        })

        return NextResponse.json({
            success: true,
            message: 'Kategori berhasil dihapus',
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
