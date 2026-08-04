import { NextResponse } from 'next/server';

const mockDeals = [
    {
        id: 'DEAL-001',
        name: 'PT Maju Jaya - Annual Supply',
        company: 'PT Maju Jaya',
        contactId: 'CON-001',
        contactName: 'Budi Hartono',
        value: 50000000,
        stage: 'Negosiasi',
        probability: 75,
        assignedTo: 'Sales Team',
        expectedCloseDate: '2026-08-30',
        source: 'Referral',
        notes: 'Deal tahunan untuk supply widget',
        competitors: ['PT Kompetitor A', 'CV Kompetitor B'],
        activities: [
            { type: 'meeting', date: '2026-07-20', description: 'Presentasi produk' },
            { type: 'call', date: '2026-07-25', description: 'Follow up harga' },
        ],
        createdAt: '2026-06-15T10:00:00Z',
    },
    {
        id: 'DEAL-002',
        name: 'CV Berkah - Service Contract',
        company: 'CV Berkah',
        contactId: 'CON-002',
        contactName: 'Sari Dewi',
        value: 25000000,
        stage: 'Proposal',
        probability: 50,
        assignedTo: 'Sales Team',
        expectedCloseDate: '2026-09-15',
        source: 'Website',
        notes: 'Service contract 1 tahun',
        competitors: [],
        activities: [
            { type: 'email', date: '2026-07-18', description: 'Kirim proposal' },
        ],
        createdAt: '2026-07-10T10:00:00Z',
    },
    {
        id: 'DEAL-003',
        name: 'PT Digital Nusantara - Digital Transformation',
        company: 'PT Digital Nusantara',
        contactId: 'CON-004',
        contactName: 'Rina Susanti',
        value: 100000000,
        stage: 'Discovery',
        probability: 25,
        assignedTo: 'Sales Team',
        expectedCloseDate: '2026-12-31',
        source: 'LinkedIn',
        notes: 'Project besar digital transformation',
        competitors: ['PT Tech Solutions', 'CV Digital Corp', 'PT Inovasi Teknologi'],
        activities: [
            { type: 'meeting', date: '2026-07-15', description: 'Kick-off meeting' },
            { type: 'call', date: '2026-07-22', description: 'Technical discussion' },
        ],
        createdAt: '2026-07-01T10:00:00Z',
    },
    {
        id: 'DEAL-004',
        name: 'PT ABC Technology - Pilot Project',
        company: 'PT ABC Technology',
        contactId: 'CON-005',
        contactName: 'Dedi Kurniawan',
        value: 5000000,
        stage: 'Closing',
        probability: 90,
        assignedTo: 'Sales Team',
        expectedCloseDate: '2026-08-10',
        source: 'Website',
        notes: 'Pilot project untuk evaluasi',
        competitors: [],
        activities: [
            { type: 'meeting', date: '2026-07-20', description: 'Demo produk' },
            { type: 'email', date: '2026-07-28', description: 'Kirim kontrak' },
            { type: 'call', date: '2026-08-01', description: 'Final negotiation' },
        ],
        createdAt: '2026-07-05T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');

    let filtered = [...mockDeals];

    if (stage) {
        filtered = filtered.filter((d) => d.stage === stage);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (d) =>
                d.name.toLowerCase().includes(lowerSearch) ||
                d.company.toLowerCase().includes(lowerSearch)
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

        if (!body.name || !body.company || !body.value) {
            return NextResponse.json(
                { success: false, error: 'Name, company, and value are required' },
                { status: 400 }
            );
        }

        const newDeal = {
            id: `DEAL-${Date.now()}`,
            ...body,
            stage: body.stage || 'Discovery',
            probability: body.probability || 10,
            competitors: body.competitors || [],
            activities: body.activities || [],
            createdAt: new Date().toISOString(),
        };

        mockDeals.push(newDeal);

        return NextResponse.json({ success: true, data: newDeal }, { status: 201 });
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

        const index = mockDeals.findIndex((d) => d.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Deal not found' },
                { status: 404 }
            );
        }

        mockDeals[index] = { ...mockDeals[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockDeals[index] });
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

    const index = mockDeals.findIndex((d) => d.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Deal not found' },
            { status: 404 }
        );
    }

    mockDeals.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
