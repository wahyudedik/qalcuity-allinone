import { NextResponse } from 'next/server';

const mockSupplierDetails: Record<string, {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    category: string;
    rating: number;
    status: string;
    totalOrders: number;
    lastOrder: string;
    createdAt: string;
    products: Array<{ name: string; price: number; leadTime: string }>;
}> = {
    'SUP-001': {
        id: 'SUP-001',
        name: 'PT Supplier ABC',
        contactPerson: 'Budi Santoso',
        email: 'sales@supplierabc.co.id',
        phone: '+62 21 5551234',
        address: 'Jl. Industri No. 10, Tangerang',
        category: 'Raw Materials',
        rating: 4.5,
        status: 'active',
        totalOrders: 45,
        lastOrder: '2026-07-20',
        createdAt: '2024-06-15T10:00:00Z',
        products: [
            { name: 'Raw Material A', price: 25000, leadTime: '3-5 hari' },
            { name: 'Raw Material B', price: 50000, leadTime: '5-7 hari' },
        ],
    },
    'SUP-002': {
        id: 'SUP-002',
        name: 'CV Supplier XYZ',
        contactPerson: 'Siti Rahayu',
        email: 'order@supplierxyz.co.id',
        phone: '+62 22 5555678',
        address: 'Jl. Raya No. 50, Bandung',
        category: 'Components',
        rating: 4.0,
        status: 'active',
        totalOrders: 32,
        lastOrder: '2026-07-25',
        createdAt: '2024-09-20T10:00:00Z',
        products: [
            { name: 'Component X', price: 15000, leadTime: '2-4 hari' },
            { name: 'Component Y', price: 30000, leadTime: '4-6 hari' },
        ],
    },
    'SUP-003': {
        id: 'SUP-003',
        name: 'PT Packaging Plus',
        contactPerson: 'Dewi Lestari',
        email: 'info@packagingplus.co.id',
        phone: '+62 31 5559012',
        address: 'Jl. Surabaya No. 88, Sidoarjo',
        category: 'Packaging',
        rating: 3.5,
        status: 'active',
        totalOrders: 18,
        lastOrder: '2026-06-30',
        createdAt: '2025-01-10T10:00:00Z',
        products: [
            { name: 'Packaging Box', price: 5000, leadTime: '1-3 hari' },
            { name: 'Bubble Wrap', price: 3000, leadTime: '1-2 hari' },
        ],
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const supplier = mockSupplierDetails[id];

    if (!supplier) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockSupplierDetails[id]) {
            return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
        }

        mockSupplierDetails[id] = { ...mockSupplierDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockSupplierDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockSupplierDetails[id]) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    delete mockSupplierDetails[id];

    return NextResponse.json({ success: true, data: null });
}
