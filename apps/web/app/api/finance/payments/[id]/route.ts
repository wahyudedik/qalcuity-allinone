import { NextResponse } from 'next/server';

const mockPaymentDetails: Record<string, {
    id: string;
    paymentNumber: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    method: string;
    bank: string;
    accountNumber: string;
    status: string;
    paymentDate: string;
    reference: string;
    notes: string;
}> = {
    'PAY-001': {
        id: 'PAY-001',
        paymentNumber: 'PMT-2026-001',
        invoiceNumber: 'INV-2026-001',
        customerName: 'PT Maju Jaya',
        amount: 16500000,
        method: 'bank_transfer',
        bank: 'Bank Mandiri',
        accountNumber: '1234567890',
        status: 'completed',
        paymentDate: '2026-07-20T14:30:00Z',
        reference: 'TRF-20260720-001',
        notes: 'Pembayaran invoice INV-2026-001',
    },
    'PAY-002': {
        id: 'PAY-002',
        paymentNumber: 'PMT-2026-002',
        invoiceNumber: 'INV-2026-002',
        customerName: 'CV Berkah',
        amount: 8800000,
        method: 'bank_transfer',
        bank: 'Bank BCA',
        accountNumber: '0987654321',
        status: 'pending',
        paymentDate: '2026-08-01T10:00:00Z',
        reference: 'TRF-20260801-001',
        notes: '',
    },
    'PAY-003': {
        id: 'PAY-003',
        paymentNumber: 'PMT-2026-003',
        invoiceNumber: 'INV-2026-003',
        customerName: 'PT Sejahtera',
        amount: 10000000,
        method: 'credit_card',
        bank: 'Bank BNI',
        accountNumber: '5555666677',
        status: 'completed',
        paymentDate: '2026-07-25T09:15:00Z',
        reference: 'CC-20260725-001',
        notes: 'Pembayaran sebagian',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const payment = mockPaymentDetails[id];

    if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockPaymentDetails[id]) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        mockPaymentDetails[id] = { ...mockPaymentDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockPaymentDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockPaymentDetails[id]) {
        return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    delete mockPaymentDetails[id];

    return NextResponse.json({ success: true, data: null });
}
