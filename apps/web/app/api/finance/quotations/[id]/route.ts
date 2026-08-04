import { NextResponse } from 'next/server';

const mockQuotationDetails: Record<string, {
    id: string;
    quotationNumber: string;
    customerName: string;
    customerAddress: string;
    customerEmail: string;
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    validUntil: string;
    createdAt: string;
    notes: string;
}> = {
    'QT-001': {
        id: 'QT-001',
        quotationNumber: 'QT-2026-001',
        customerName: 'PT Maju Jaya',
        customerAddress: 'Jl. Sudirman No. 123, Jakarta Selatan',
        customerEmail: 'procurement@majujaya.co.id',
        items: [
            { name: 'Widget Premium', description: 'Widget berkualitas tinggi', quantity: 200, unitPrice: 100000, total: 20000000 },
            { name: 'Jasa Instalasi', description: 'Instalasi dan konfigurasi', quantity: 1, unitPrice: 5000000, total: 5000000 },
        ],
        subtotal: 25000000,
        tax: 2500000,
        total: 27500000,
        currency: 'IDR',
        status: 'sent',
        validUntil: '2026-09-15',
        createdAt: '2026-07-20T10:00:00Z',
        notes: 'Penawaran berlaku 30 hari.',
    },
    'QT-002': {
        id: 'QT-002',
        quotationNumber: 'QT-2026-002',
        customerName: 'CV Berkah',
        customerAddress: 'Jl. Malioboro No. 45, Yogyakarta',
        customerEmail: 'info@berkah.co.id',
        items: [
            { name: 'Component Kit', description: 'Kit komponen untuk perakitan', quantity: 500, unitPrice: 40000, total: 20000000 },
        ],
        subtotal: 20000000,
        tax: 2000000,
        total: 22000000,
        currency: 'IDR',
        status: 'draft',
        validUntil: '2026-09-01',
        createdAt: '2026-07-25T10:00:00Z',
        notes: '',
    },
    'QT-003': {
        id: 'QT-003',
        quotationNumber: 'QT-2026-003',
        customerName: 'PT Sejahtera',
        customerAddress: 'Jl. Pemuda No. 67, Surabaya',
        customerEmail: 'ops@sejahtera.co.id',
        items: [
            { name: 'Service Contract', description: 'Kontrak service 1 tahun', quantity: 1, unitPrice: 180000000, total: 180000000 },
        ],
        subtotal: 180000000,
        tax: 18000000,
        total: 198000000,
        currency: 'IDR',
        status: 'accepted',
        validUntil: '2026-08-15',
        createdAt: '2026-07-10T10:00:00Z',
        notes: 'Kontrak tahunan dengan diskon 10%.',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const quotation = mockQuotationDetails[id];

    if (!quotation) {
        return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: quotation });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockQuotationDetails[id]) {
            return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
        }

        mockQuotationDetails[id] = { ...mockQuotationDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockQuotationDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockQuotationDetails[id]) {
        return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }

    delete mockQuotationDetails[id];

    return NextResponse.json({ success: true, data: null });
}
