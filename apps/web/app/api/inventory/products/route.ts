import { NextResponse } from 'next/server';

const mockProducts = [
    {
        id: 'SKU-001',
        sku: 'SKU-001',
        name: 'Widget A',
        description: 'High-quality widget untuk berbagai kebutuhan',
        category: 'Electronics',
        unitPrice: 100000,
        costPrice: 65000,
        currency: 'IDR',
        stock: 150,
        minStock: 20,
        unit: 'pcs',
        status: 'active',
        createdAt: '2026-06-01T10:00:00Z',
    },
    {
        id: 'SKU-002',
        sku: 'SKU-002',
        name: 'Component B',
        description: 'Komponen pendukung untuk assembly',
        category: 'Parts',
        unitPrice: 250000,
        costPrice: 150000,
        currency: 'IDR',
        stock: 8,
        minStock: 20,
        unit: 'pcs',
        status: 'active',
        createdAt: '2026-06-05T10:00:00Z',
    },
    {
        id: 'SKU-003',
        sku: 'SKU-003',
        name: 'Service C',
        description: 'Layanan konsultasi dan implementasi',
        category: 'Services',
        unitPrice: 5000000,
        costPrice: 2000000,
        currency: 'IDR',
        stock: 999,
        minStock: 0,
        unit: 'lot',
        status: 'active',
        createdAt: '2026-06-10T10:00:00Z',
    },
    {
        id: 'SKU-004',
        sku: 'SKU-004',
        name: 'Kit D',
        description: 'Bundle paket lengkap untuk pemula',
        category: 'Bundles',
        unitPrice: 750000,
        costPrice: 500000,
        currency: 'IDR',
        stock: 0,
        minStock: 10,
        unit: 'set',
        status: 'active',
        createdAt: '2026-06-15T10:00:00Z',
    },
    {
        id: 'SKU-005',
        sku: 'SKU-005',
        name: 'Module E',
        description: 'Software module untuk integrasi sistem',
        category: 'Software',
        unitPrice: 2500000,
        costPrice: 500000,
        currency: 'IDR',
        stock: 45,
        minStock: 10,
        unit: 'license',
        status: 'active',
        createdAt: '2026-06-20T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');

    let filtered = [...mockProducts];

    if (status) {
        filtered = filtered.filter((p) => p.status === status);
    }

    if (category) {
        filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (p) =>
                p.name.toLowerCase().includes(lowerSearch) ||
                p.sku.toLowerCase().includes(lowerSearch) ||
                p.description.toLowerCase().includes(lowerSearch)
        );
    }

    if (lowStock === 'true') {
        filtered = filtered.filter((p) => p.stock <= p.minStock);
    }

    return NextResponse.json({
        success: true,
        data: filtered,
        total: filtered.length,
        page: 1,
        limit: 10,
        totalPages: 1,
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.name || !body.sku) {
            return NextResponse.json(
                { success: false, error: 'Product name and SKU are required' },
                { status: 400 }
            );
        }

        // Check duplicate SKU
        if (mockProducts.some((p) => p.sku === body.sku)) {
            return NextResponse.json(
                { success: false, error: 'SKU already exists' },
                { status: 409 }
            );
        }

        const newProduct = {
            id: body.sku,
            ...body,
            stock: body.stock || 0,
            minStock: body.minStock || 0,
            status: 'active',
            createdAt: new Date().toISOString(),
        };

        mockProducts.push(newProduct);

        return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
