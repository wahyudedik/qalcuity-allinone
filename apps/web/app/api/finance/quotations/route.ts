import { NextResponse } from 'next/server';

const mockQuotations = [
    {
        id: 'QT-001',
        quotationNumber: 'QT-2026-001',
        customerName: 'PT Maju Jaya',
        customerEmail: 'purchasing@majujaya.com',
        subtotal: 20000000,
        tax: 2000000,
        total: 22000000,
        currency: 'IDR',
        status: 'sent',
        validUntil: '2026-09-15',
        notes: 'Harga sudah termasuk instalasi',
        terms: 'Pembayaran dalam 30 hari setelah invoice',
        items: [
            { description: 'Widget A', quantity: 100, unitPrice: 100000, total: 10000000 },
            { description: 'Component B', quantity: 40, unitPrice: 250000, total: 10000000 },
        ],
        createdAt: '2026-07-20T10:00:00Z',
    },
    {
        id: 'QT-002',
        quotationNumber: 'QT-2026-002',
        customerName: 'CV Berkah',
        customerEmail: 'order@berkah.com',
        subtotal: 5000000,
        tax: 500000,
        total: 5500000,
        currency: 'IDR',
        status: 'draft',
        validUntil: '2026-09-01',
        notes: '',
        terms: 'Pembayaran di muka 50%',
        items: [
            { description: 'Service C', quantity: 1, unitPrice: 5000000, total: 5000000 },
        ],
        createdAt: '2026-07-25T10:00:00Z',
    },
    {
        id: 'QT-003',
        quotationNumber: 'QT-2026-003',
        customerName: 'PT Sejahtera',
        customerEmail: 'procurement@sejahtera.com',
        subtotal: 35000000,
        tax: 3500000,
        total: 38500000,
        currency: 'IDR',
        status: 'accepted',
        validUntil: '2026-08-31',
        notes: 'Diskon 5% untuk repeat order',
        terms: 'Net 45',
        items: [
            { description: 'Module E', quantity: 10, unitPrice: 2500000, total: 25000000 },
            { description: 'Kit D', quantity: 10, unitPrice: 750000, total: 7500000 },
            { description: 'Widget A', quantity: 25, unitPrice: 100000, total: 2500000 },
        ],
        createdAt: '2026-07-10T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let filtered = [...mockQuotations];

    if (status) {
        filtered = filtered.filter((q) => q.status === status);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (q) =>
                q.quotationNumber.toLowerCase().includes(lowerSearch) ||
                q.customerName.toLowerCase().includes(lowerSearch)
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

        if (!body.customerName || !body.items || body.items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Customer name and items are required' },
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

        const newQuotation = {
            id: `QT-${Date.now()}`,
            quotationNumber: `QT-2026-${String(mockQuotations.length + 1).padStart(3, '0')}`,
            ...body,
            subtotal,
            tax,
            total,
            currency: 'IDR',
            status: 'draft',
            createdAt: new Date().toISOString(),
        };

        mockQuotations.push(newQuotation);

        return NextResponse.json({ success: true, data: newQuotation }, { status: 201 });
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

        const index = mockQuotations.findIndex((q) => q.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Quotation not found' },
                { status: 404 }
            );
        }

        mockQuotations[index] = { ...mockQuotations[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockQuotations[index] });
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

    const index = mockQuotations.findIndex((q) => q.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Quotation not found' },
            { status: 404 }
        );
    }

    mockQuotations.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
