import { NextResponse } from 'next/server';

const mockPayments = [
    {
        id: 'PAY-001',
        paymentNumber: 'PAY-2026-001',
        invoiceId: 'INV-001',
        invoiceNumber: 'INV-2026-001',
        customerName: 'PT Maju Jaya',
        amount: 16500000,
        method: 'bank_transfer',
        status: 'completed',
        date: '2026-07-25',
        reference: 'TRF-20260725-001',
        notes: 'Pembayaran lunas',
        createdAt: '2026-07-25T10:00:00Z',
    },
    {
        id: 'PAY-002',
        paymentNumber: 'PAY-2026-002',
        invoiceId: 'INV-002',
        invoiceNumber: 'INV-2026-002',
        customerName: 'CV Berkah',
        amount: 4400000,
        method: 'credit_card',
        status: 'completed',
        date: '2026-07-28',
        reference: 'CC-20260728-001',
        notes: 'DP 50%',
        createdAt: '2026-07-28T10:00:00Z',
    },
    {
        id: 'PAY-003',
        paymentNumber: 'PAY-2026-003',
        invoiceId: 'INV-003',
        invoiceNumber: 'INV-2026-003',
        customerName: 'PT Sejahtera',
        amount: 25300000,
        method: 'bank_transfer',
        status: 'pending',
        date: '2026-08-10',
        reference: 'TRF-20260810-001',
        notes: 'Menunggu konfirmasi bank',
        createdAt: '2026-08-01T10:00:00Z',
    },
    {
        id: 'PAY-004',
        paymentNumber: 'PAY-2026-004',
        invoiceId: 'INV-004',
        invoiceNumber: 'INV-2026-004',
        customerName: 'PT Digital Nusantara',
        amount: 8800000,
        method: 'bank_transfer',
        status: 'completed',
        date: '2026-07-30',
        reference: 'TRF-20260730-001',
        notes: 'Pembayaran penuh',
        createdAt: '2026-07-30T10:00:00Z',
    },
    {
        id: 'PAY-005',
        paymentNumber: 'PAY-2026-005',
        invoiceId: 'INV-005',
        invoiceNumber: 'INV-2026-005',
        customerName: 'CV Sentosa',
        amount: 12500000,
        method: 'ewallet',
        status: 'failed',
        date: '2026-08-01',
        reference: 'EW-20260801-001',
        notes: 'Saldo tidak cukup',
        createdAt: '2026-08-01T14:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const search = searchParams.get('search');

    let filtered = [...mockPayments];

    if (status) {
        filtered = filtered.filter((p) => p.status === status);
    }

    if (method) {
        filtered = filtered.filter((p) => p.method === method);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (p) =>
                p.paymentNumber.toLowerCase().includes(lowerSearch) ||
                p.customerName.toLowerCase().includes(lowerSearch) ||
                p.invoiceNumber.toLowerCase().includes(lowerSearch)
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

        if (!body.invoiceId || !body.amount || !body.method) {
            return NextResponse.json(
                { success: false, error: 'Invoice ID, amount, and method are required' },
                { status: 400 }
            );
        }

        const newPayment = {
            id: `PAY-${Date.now()}`,
            paymentNumber: `PAY-2026-${String(mockPayments.length + 1).padStart(3, '0')}`,
            ...body,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        mockPayments.push(newPayment);

        return NextResponse.json({ success: true, data: newPayment }, { status: 201 });
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

        const index = mockPayments.findIndex((p) => p.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        mockPayments[index] = { ...mockPayments[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockPayments[index] });
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

    const index = mockPayments.findIndex((p) => p.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Payment not found' },
            { status: 404 }
        );
    }

    mockPayments.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
