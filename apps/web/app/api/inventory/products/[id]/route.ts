import { NextResponse } from 'next/server';

const mockProductDetails: Record<string, {
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    unit: string;
    supplier: string;
    status: string;
    createdAt: string;
}> = {
    'PRD-001': {
        id: 'PRD-001',
        sku: 'WDT-001',
        name: 'Widget Premium',
        description: 'Widget berkualitas tinggi untuk industri manufaktur',
        category: 'Widget',
        price: 150000,
        cost: 75000,
        stock: 250,
        minStock: 50,
        unit: 'pcs',
        supplier: 'PT Supplier ABC',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
    },
    'PRD-002': {
        id: 'PRD-002',
        sku: 'CMP-001',
        name: 'Component Kit',
        description: 'Kit komponen untuk perakitan widget',
        category: 'Component',
        price: 50000,
        cost: 25000,
        stock: 120,
        minStock: 30,
        unit: 'kit',
        supplier: 'CV Supplier XYZ',
        status: 'active',
        createdAt: '2026-02-20T10:00:00Z',
    },
    'PRD-003': {
        id: 'PRD-003',
        sku: 'SVC-001',
        name: 'Service Maintenance',
        description: 'Jasa maintenance bulanan untuk peralatan',
        category: 'Service',
        price: 5000000,
        cost: 2000000,
        stock: 999,
        minStock: 0,
        unit: 'paket',
        supplier: '-',
        status: 'active',
        createdAt: '2026-03-10T10:00:00Z',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const product = mockProductDetails[id];

    if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockProductDetails[id]) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }

        mockProductDetails[id] = { ...mockProductDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockProductDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockProductDetails[id]) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    delete mockProductDetails[id];

    return NextResponse.json({ success: true, data: null });
}
