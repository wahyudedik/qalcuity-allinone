import { NextResponse } from 'next/server';

const mockPODetails: Record<string, {
    id: string;
    poNumber: string;
    supplierName: string;
    supplierAddress: string;
    supplierEmail: string;
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    expectedDelivery: string;
    createdAt: string;
    notes: string;
}> = {
    'PO-001': {
        id: 'PO-001',
        poNumber: 'PO-2026-001',
        supplierName: 'PT Supplier ABC',
        supplierAddress: 'Jl. Industri No. 10, Tangerang',
        supplierEmail: 'sales@supplierabc.co.id',
        items: [
            { name: 'Raw Material A', description: 'Bahan baku kualitas tinggi', quantity: 500, unitPrice: 25000, total: 12500000 },
            { name: 'Raw Material B', description: 'Bahan baku pendukung', quantity: 200, unitPrice: 50000, total: 10000000 },
        ],
        subtotal: 22500000,
        tax: 2250000,
        total: 24750000,
        currency: 'IDR',
        status: 'confirmed',
        expectedDelivery: '2026-08-15',
        createdAt: '2026-07-20T10:00:00Z',
        notes: 'Pengiriman ke gudang utama.',
    },
    'PO-002': {
        id: 'PO-002',
        poNumber: 'PO-2026-002',
        supplierName: 'CV Supplier XYZ',
        supplierAddress: 'Jl. Raya No. 50, Bandung',
        supplierEmail: 'order@supplierxyz.co.id',
        items: [
            { name: 'Component X', description: 'Komponen elektronik', quantity: 1000, unitPrice: 15000, total: 15000000 },
        ],
        subtotal: 15000000,
        tax: 1500000,
        total: 16500000,
        currency: 'IDR',
        status: 'sent',
        expectedDelivery: '2026-08-20',
        createdAt: '2026-07-25T10:00:00Z',
        notes: '',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const po = mockPODetails[id];

    if (!po) {
        return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: po });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockPODetails[id]) {
            return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
        }

        mockPODetails[id] = { ...mockPODetails[id], ...body };

        return NextResponse.json({ success: true, data: mockPODetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockPODetails[id]) {
        return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    delete mockPODetails[id];

    return NextResponse.json({ success: true, data: null });
}
