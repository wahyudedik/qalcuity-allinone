import { NextResponse } from 'next/server';

const mockLeads = [
    {
        id: 'LEAD-001',
        name: 'PT ABC Technology',
        email: 'info@abctech.com',
        phone: '081234567890',
        company: 'PT ABC Technology',
        source: 'Website',
        status: 'new',
        value: 50000000,
        assignedTo: 'EMP-001',
        createdAt: '2026-07-20T10:00:00Z',
    },
    {
        id: 'LEAD-002',
        name: 'CV Maju Bersama',
        email: 'contact@majubersama.com',
        phone: '081234567891',
        company: 'CV Maju Bersama',
        source: 'Referral',
        status: 'qualified',
        value: 25000000,
        assignedTo: 'EMP-002',
        createdAt: '2026-07-18T10:00:00Z',
    },
    {
        id: 'LEAD-003',
        name: 'PT Digital Nusantara',
        email: 'hello@digitalnusantara.com',
        phone: '081234567892',
        company: 'PT Digital Nusantara',
        source: 'LinkedIn',
        status: 'proposal',
        value: 100000000,
        assignedTo: 'EMP-001',
        createdAt: '2026-07-15T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let filtered = [...mockLeads];

    if (status) {
        filtered = filtered.filter((lead) => lead.status === status);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (lead) =>
                lead.name.toLowerCase().includes(lowerSearch) ||
                lead.company.toLowerCase().includes(lowerSearch)
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

        if (!body.name) {
            return NextResponse.json(
                { success: false, error: 'Lead name is required' },
                { status: 400 }
            );
        }

        const newLead = {
            id: `LEAD-${Date.now()}`,
            ...body,
            status: 'new',
            createdAt: new Date().toISOString(),
        };

        mockLeads.push(newLead);

        return NextResponse.json({ success: true, data: newLead }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
