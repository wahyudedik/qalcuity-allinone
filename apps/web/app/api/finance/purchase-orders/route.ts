import { NextResponse } from 'next/server';

const mockPurchaseOrders = [
    {
        id: 'PO-001',
        poNumber: 'PO-2026-001',
        supplierName: 'PT Supplier Jaya',
        supplierEmail: 'sales@supplierjaya.com',
        subtotal: 7500000,
        tax: 750000,
        total: 8250000,
        currency: 'IDR',
        status: 'received',
        expectedDelivery: '2026-07-20',
        actualDelivery: '2026-07-18',
        items: [
            { description: 'Raw Material A', quantity: 100, unitPrice: 50000, total: 5000000 },
            { description: 'Raw Material B', quantity: 50, unitPrice: 50000, total: 2500000 },
        ],
        notes: 'Pengiriman cepat',
        createdAt: '2026-07-05T10:00:00Z',
    },
    {
        id: 'PO-002',
        poNumber: 'PO-2026-002',
        supplierName: 'CV Komponen Abadi',
        supplierEmail: 'order@komponenabadi.com',
        subtotal: 12000000,
        tax: 1200000,
        total: 13200000,
        currency: 'IDR',
        status: 'confirmed',
        expectedDelivery: '2026-08-15',
        actualDelivery: null,
        items: [
            { description: 'Component X', quantity: 200, unitPrice: 40000, total: 8000000 },
            { description: 'Component Y', quantity: 80, unitPrice: 50000, total: 4000000 },
        ],
        notes: '',
        createdAt: '2026-07-20T10:00:00Z',
    },
    {
        id: 'PO-003',
        poNumber: 'PO-2026-003',
        supplierName: 'PT Digital Parts',
        supplierEmail: 'info@digitalparts.com',
        subtotal: 5000000,
        tax: 500000,
        total: 5500000,
        currency: 'IDR',
        status: 'sent',
        expectedDelivery: '2026-08-25',
        actualDelivery: null,
        items: [
            { description: 'Digital Module', quantity: 10, unitPrice: 500000, total: 5000000 },
        ],
        notes: 'Perlu di-follow up',
        createdAt: '2026-07-25T10:00:00Z',
    },
    {
        id: 'PO-004',
        poNumber: 'PO-2026-004',
        supplierName: 'PT Berkah Supply',
        supplierEmail: 'sales@berkahsupply.com',
        subtotal: 3000000,
        tax: 300000,
        total: 3300000,
        currency: 'IDR',
        status: 'draft',
        expectedDelivery: '2026-09-01',
        actualDelivery: null,
        items: [
            { description: 'Packaging Material', quantity: 500, unitPrice: 6000, total: 3000000 },
        ],
        notes: 'Draft - menunggu approval',
        createdAt: '2026-08-01T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let filtered = [...mockPurchaseOrders];

    if (status) {
        filtered = filtered.filter((po) => po.status === status);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (po) =>
                po.poNumber.toLowerCase().includes(lowerSearch) ||
                po.supplierName.toLowerCase().includes(lowerSearch)
        );
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

        if (!body.supplierName || !body.items || body.items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Supplier name and items are required' },
                { status: 400 }
            );
        }

        const subtotal = body.items.reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
                sum + item.quantity * item.unitPrice,
            0
        );
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        const newPO = {
            id: `PO-${Date.now()}`,
            poNumber: `PO-2026-${String(mockPurchaseOrders.length + 1).padStart(3, '0')}`,
            ...body,
            subtotal,
            tax,
            total,
            currency: 'IDR',
            status: 'draft',
            actualDelivery: null,
            createdAt: new Date().toISOString(),
        };

        mockPurchaseOrders.push(newPO);

        return NextResponse.json({ success: true, data: newPO }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const index = mockPurchaseOrders.findIndex((po) => po.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Purchase Order not found' },
                { status: 404 }
            );
        }

        mockPurchaseOrders[index] = { ...mockPurchaseOrders[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockPurchaseOrders[index] });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json(
            { success: false, error: 'ID is required' },
            { status: 400 }
        );
    }

    const index = mockPurchaseOrders.findIndex((po) => po.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Purchase Order not found' },
            { status: 404 }
        );
    }

    mockPurchaseOrders.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
