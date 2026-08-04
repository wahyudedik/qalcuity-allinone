import { NextResponse } from 'next/server';

const mockLeadDetails: Record<string, {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    source: string;
    status: string;
    score: number;
    notes: string;
    createdAt: string;
    activities: Array<{ date: string; type: string; description: string }>;
}> = {
    'LEAD-001': {
        id: 'LEAD-001',
        name: 'Ahmad Fauzi',
        email: 'ahmad@startupxyz.com',
        phone: '+62 812 1111 2222',
        company: 'StartupXYZ',
        source: 'Website',
        status: 'new',
        score: 75,
        notes: 'Tertarik dengan produk widget premium.',
        createdAt: '2026-07-25T10:00:00Z',
        activities: [
            { date: '2026-07-25', type: 'form', description: 'Submit form di website' },
        ],
    },
    'LEAD-002': {
        id: 'LEAD-002',
        name: 'Rina Susanti',
        email: 'rina@mediacorp.co.id',
        phone: '+62 856 3333 4444',
        company: 'MediaCorp',
        source: 'Referral',
        status: 'contacted',
        score: 60,
        notes: 'Direkomendasikan oleh PT Maju Jaya.',
        createdAt: '2026-07-20T10:00:00Z',
        activities: [
            { date: '2026-07-22', type: 'call', description: 'Telepon perkenalan' },
            { date: '2026-07-20', type: 'form', description: 'Submit form di website' },
        ],
    },
    'LEAD-003': {
        id: 'LEAD-003',
        name: 'Dedi Kurniawan',
        email: 'dedi@manufacturing.co.id',
        phone: '+62 878 5555 6666',
        company: 'Manufacturing Inc',
        source: 'LinkedIn',
        status: 'qualified',
        score: 85,
        notes: 'Budget sudah tersedia, butuh demo produk.',
        createdAt: '2026-07-15T10:00:00Z',
        activities: [
            { date: '2026-07-28', type: 'meeting', description: 'Demo produk via Zoom' },
            { date: '2026-07-22', type: 'email', description: 'Kirim brosur produk' },
            { date: '2026-07-15', type: 'form', description: 'Submit via LinkedIn' },
        ],
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const lead = mockLeadDetails[id];

    if (!lead) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockLeadDetails[id]) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        mockLeadDetails[id] = { ...mockLeadDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockLeadDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockLeadDetails[id]) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    delete mockLeadDetails[id];

    return NextResponse.json({ success: true, data: null });
}
