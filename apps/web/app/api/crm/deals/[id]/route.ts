import { NextResponse } from 'next/server';

const mockDealDetails: Record<string, {
    id: string;
    name: string;
    company: string;
    contactName: string;
    value: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate: string;
    createdAt: string;
    notes: string;
    activities: Array<{ date: string; type: string; description: string }>;
}> = {
    'DEAL-001': {
        id: 'DEAL-001',
        name: 'PT Maju Jaya - Widget Premium',
        company: 'PT Maju Jaya',
        contactName: 'Ahmad Rizky',
        value: 50000000,
        currency: 'IDR',
        stage: 'Negosiasi',
        probability: 75,
        expectedCloseDate: '2026-08-30',
        createdAt: '2026-06-15T10:00:00Z',
        notes: 'Deal besar, prioritas tinggi.',
        activities: [
            { date: '2026-07-25', type: 'call', description: 'Follow-up via telepon' },
            { date: '2026-07-20', type: 'email', description: 'Kirim proposal revisi' },
            { date: '2026-07-15', type: 'meeting', description: 'Presentasi di kantor client' },
        ],
    },
    'DEAL-002': {
        id: 'DEAL-002',
        name: 'CV Berkah - Component Kit',
        company: 'CV Berkah',
        contactName: 'Siti Nurhaliza',
        value: 25000000,
        currency: 'IDR',
        stage: 'Proposal',
        probability: 50,
        expectedCloseDate: '2026-09-15',
        createdAt: '2026-07-01T10:00:00Z',
        notes: 'Menunggu approval dari direktur.',
        activities: [
            { date: '2026-07-28', type: 'email', description: 'Kirim follow-up email' },
            { date: '2026-07-20', type: 'meeting', description: 'Presentasi produk' },
        ],
    },
    'DEAL-003': {
        id: 'DEAL-003',
        name: 'PT Sejahtera - Service Contract',
        company: 'PT Sejahtera',
        contactName: 'Dewi Lestari',
        value: 100000000,
        currency: 'IDR',
        stage: 'Discovery',
        probability: 25,
        expectedCloseDate: '2026-10-30',
        createdAt: '2026-07-10T10:00:00Z',
        notes: 'Potensi besar, perlu deep dive kebutuhan.',
        activities: [
            { date: '2026-07-30', type: 'call', description: 'Discovery call' },
        ],
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const deal = mockDealDetails[id];

    if (!deal) {
        return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deal });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockDealDetails[id]) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        mockDealDetails[id] = { ...mockDealDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockDealDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockDealDetails[id]) {
        return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    delete mockDealDetails[id];

    return NextResponse.json({ success: true, data: null });
}
