import { NextResponse } from 'next/server';

const mockContactDetails: Record<string, {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    position: string;
    type: string;
    address: string;
    notes: string;
    createdAt: string;
}> = {
    'CON-001': {
        id: 'CON-001',
        name: 'Ahmad Rizky',
        email: 'ahmad@majujaya.co.id',
        phone: '+62 812 3456 7890',
        company: 'PT Maju Jaya',
        position: 'Direktur Utama',
        type: 'customer',
        address: 'Jl. Sudirman No. 123, Jakarta Selatan',
        notes: 'Client utama, hubungi setiap bulan untuk review.',
        createdAt: '2026-01-15T10:00:00Z',
    },
    'CON-002': {
        id: 'CON-002',
        name: 'Siti Nurhaliza',
        email: 'siti@berkah.co.id',
        phone: '+62 856 7890 1234',
        company: 'CV Berkah',
        position: 'Manager Purchasing',
        type: 'customer',
        address: 'Jl. Malioboro No. 45, Yogyakarta',
        notes: 'Pembeli rutin, preferensi delivery Selasa.',
        createdAt: '2026-02-20T10:00:00Z',
    },
    'CON-003': {
        id: 'CON-003',
        name: 'Budi Santoso',
        email: 'budi@supplierabc.co.id',
        phone: '+62 878 9012 3456',
        company: 'PT Supplier ABC',
        position: 'Sales Manager',
        type: 'supplier',
        address: 'Jl. Industri No. 10, Tangerang',
        notes: 'Supplier utama bahan baku.',
        createdAt: '2026-03-10T10:00:00Z',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const contact = mockContactDetails[id];

    if (!contact) {
        return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: contact });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockContactDetails[id]) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        mockContactDetails[id] = { ...mockContactDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockContactDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockContactDetails[id]) {
        return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    delete mockContactDetails[id];

    return NextResponse.json({ success: true, data: null });
}
