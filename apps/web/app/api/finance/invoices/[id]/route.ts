import { NextResponse } from 'next/server';

// Mock detail data - akan diganti dengan database query
const mockInvoiceDetails: Record<string, {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerAddress: string;
    customerEmail: string;
    customerPhone: string;
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    dueDate: string;
    createdAt: string;
    notes: string;
}> = {
    'INV-001': {
        id: 'INV-001',
        invoiceNumber: 'INV-2026-001',
        customerName: 'PT Maju Jaya',
        customerAddress: 'Jl. Sudirman No. 123, Jakarta Selatan',
        customerEmail: 'finance@majujaya.co.id',
        customerPhone: '+62 21 5551234',
        items: [
            { name: 'Widget Premium', description: 'Widget berkualitas tinggi untuk industri', quantity: 100, unitPrice: 100000, total: 10000000 },
            { name: 'Jasa Instalasi', description: 'Instalasi dan konfigurasi widget', quantity: 1, unitPrice: 5000000, total: 5000000 },
        ],
        subtotal: 15000000,
        tax: 1500000,
        total: 16500000,
        currency: 'IDR',
        status: 'paid',
        dueDate: '2026-08-15',
        createdAt: '2026-07-15T10:00:00Z',
        notes: 'Terima kasih atas bisnis Anda.',
    },
    'INV-002': {
        id: 'INV-002',
        invoiceNumber: 'INV-2026-002',
        customerName: 'CV Berkah',
        customerAddress: 'Jl. Malioboro No. 45, Yogyakarta',
        customerEmail: 'order@berkah.co.id',
        customerPhone: '+62 274 555123',
        items: [
            { name: 'Component Kit', description: 'Kit komponen untuk perakitan', quantity: 200, unitPrice: 40000, total: 8000000 },
        ],
        subtotal: 8000000,
        tax: 800000,
        total: 8800000,
        currency: 'IDR',
        status: 'pending',
        dueDate: '2026-08-20',
        createdAt: '2026-07-18T10:00:00Z',
        notes: '',
    },
    'INV-003': {
        id: 'INV-003',
        invoiceNumber: 'INV-2026-003',
        customerName: 'PT Sejahtera',
        customerAddress: 'Jl. Pemuda No. 67, Surabaya',
        customerEmail: 'ap@sejahtera.co.id',
        customerPhone: '+62 31 555123',
        items: [
            { name: 'Service Maintenance', description: 'Maintenance bulanan', quantity: 1, unitPrice: 15000000, total: 15000000 },
            { name: 'Spare Parts', description: 'Spare parts untuk maintenance', quantity: 10, unitPrice: 800000, total: 8000000 },
        ],
        subtotal: 23000000,
        tax: 2300000,
        total: 25300000,
        currency: 'IDR',
        status: 'overdue',
        dueDate: '2026-07-30',
        createdAt: '2026-07-01T10:00:00Z',
        notes: 'Sudah jatuh tempo. Mohon segera lakukan pembayaran.',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    const invoice = mockInvoiceDetails[id];

    if (!invoice) {
        return NextResponse.json(
            { success: false, error: 'Invoice not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true, data: invoice });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockInvoiceDetails[id]) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        mockInvoiceDetails[id] = { ...mockInvoiceDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockInvoiceDetails[id] });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockInvoiceDetails[id]) {
        return NextResponse.json(
            { success: false, error: 'Invoice not found' },
            { status: 404 }
        );
    }

    delete mockInvoiceDetails[id];

    return NextResponse.json({ success: true, data: null });
}
