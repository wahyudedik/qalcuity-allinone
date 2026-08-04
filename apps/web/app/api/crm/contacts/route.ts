import { NextResponse } from 'next/server';

const mockContacts = [
    {
        id: 'CON-001',
        name: 'Budi Hartono',
        email: 'budi@majujaya.com',
        phone: '081234567890',
        company: 'PT Maju Jaya',
        type: 'customer',
        position: 'Procurement Manager',
        address: 'Jl. Sudirman No. 100, Jakarta',
        notes: 'Decision maker untuk pembelian',
        totalDeals: 3,
        totalValue: 50000000,
        lastContact: '2026-07-25',
        createdAt: '2026-01-15T10:00:00Z',
    },
    {
        id: 'CON-002',
        name: 'Sari Dewi',
        email: 'sari@berkah.com',
        phone: '081234567891',
        company: 'CV Berkah',
        type: 'customer',
        position: 'Owner',
        address: 'Jl. Malioboro No. 50, Yogyakarta',
        notes: 'Repeat customer',
        totalDeals: 5,
        totalValue: 25000000,
        lastContact: '2026-07-28',
        createdAt: '2025-11-20T10:00:00Z',
    },
    {
        id: 'CON-003',
        name: 'Ahmad Fauzi',
        email: 'ahmad@supplierjaya.com',
        phone: '081234567892',
        company: 'PT Supplier Jaya',
        type: 'supplier',
        position: 'Sales Manager',
        address: 'Jl. Industri No. 200, Surabaya',
        notes: 'Supplier utama raw materials',
        totalDeals: 0,
        totalValue: 0,
        lastContact: '2026-07-18',
        createdAt: '2025-06-10T10:00:00Z',
    },
    {
        id: 'CON-004',
        name: 'Rina Susanti',
        email: 'rina@digitalnusantara.com',
        phone: '081234567893',
        company: 'PT Digital Nusantara',
        type: 'partner',
        position: 'Business Development',
        address: 'Jl. Gatot Subroto No. 75, Jakarta',
        notes: 'Potential partner untuk project digital',
        totalDeals: 1,
        totalValue: 100000000,
        lastContact: '2026-07-15',
        createdAt: '2026-03-01T10:00:00Z',
    },
    {
        id: 'CON-005',
        name: 'Dedi Kurniawan',
        email: 'dedi@abctech.com',
        phone: '081234567894',
        company: 'PT ABC Technology',
        type: 'lead',
        position: 'IT Director',
        address: 'Jl. TB Simatupang No. 150, Jakarta',
        notes: 'New lead dari website',
        totalDeals: 0,
        totalValue: 0,
        lastContact: '2026-07-20',
        createdAt: '2026-07-20T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let filtered = [...mockContacts];

    if (type) {
        filtered = filtered.filter((c) => c.type === type);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (c) =>
                c.name.toLowerCase().includes(lowerSearch) ||
                c.company.toLowerCase().includes(lowerSearch) ||
                c.email.toLowerCase().includes(lowerSearch)
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

        if (!body.name || !body.email) {
            return NextResponse.json(
                { success: false, error: 'Name and email are required' },
                { status: 400 }
            );
        }

        const newContact = {
            id: `CON-${Date.now()}`,
            ...body,
            totalDeals: 0,
            totalValue: 0,
            lastContact: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
        };

        mockContacts.push(newContact);

        return NextResponse.json({ success: true, data: newContact }, { status: 201 });
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

        const index = mockContacts.findIndex((c) => c.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Contact not found' },
                { status: 404 }
            );
        }

        mockContacts[index] = { ...mockContacts[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockContacts[index] });
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

    const index = mockContacts.findIndex((c) => c.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Contact not found' },
            { status: 404 }
        );
    }

    mockContacts.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
