import { NextResponse } from 'next/server';

// Mock data - akan diganti dengan database query
const mockInvoices = [
    {
        id: 'INV-001',
        invoiceNumber: 'INV-2026-001',
        customerName: 'PT Maju Jaya',
        subtotal: 15000000,
        tax: 1500000,
        total: 16500000,
        currency: 'IDR',
        status: 'paid',
        dueDate: '2026-08-15',
        createdAt: '2026-07-15T10:00:00Z',
    },
    {
        id: 'INV-002',
        invoiceNumber: 'INV-2026-002',
        customerName: 'CV Berkah',
        subtotal: 8000000,
        tax: 800000,
        total: 8800000,
        currency: 'IDR',
        status: 'pending',
        dueDate: '2026-08-20',
        createdAt: '2026-07-18T10:00:00Z',
    },
    {
        id: 'INV-003',
        invoiceNumber: 'INV-2026-003',
        customerName: 'PT Sejahtera',
        subtotal: 23000000,
        tax: 2300000,
        total: 25300000,
        currency: 'IDR',
        status: 'overdue',
        dueDate: '2026-07-30',
        createdAt: '2026-07-01T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let filtered = [...mockInvoices];

    if (status) {
        filtered = filtered.filter((inv) => inv.status === status);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (inv) =>
                inv.invoiceNumber.toLowerCase().includes(lowerSearch) ||
                inv.customerName.toLowerCase().includes(lowerSearch)
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

        // Validasi input
        if (!body.customerName || !body.items || body.items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Customer name and items are required' },
                { status: 400 }
            );
        }

        // Hitung total
        const subtotal = body.items.reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
                sum + item.quantity * item.unitPrice,
            0
        );
        const tax = subtotal * 0.1; // PPN 11%
        const total = subtotal + tax;

        const newInvoice = {
            id: `INV-${Date.now()}`,
            invoiceNumber: `INV-2026-${String(mockInvoices.length + 1).padStart(3, '0')}`,
            ...body,
            subtotal,
            tax,
            total,
            currency: 'IDR',
            status: 'draft',
            createdAt: new Date().toISOString(),
        };

        mockInvoices.push(newInvoice);

        return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
