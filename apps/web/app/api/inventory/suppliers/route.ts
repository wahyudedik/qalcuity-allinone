import { NextResponse } from 'next/server';

const mockSuppliers = [
    {
        id: 'SUP-001',
        name: 'PT Supplier Jaya',
        contactPerson: 'Ahmad Fauzi',
        email: 'sales@supplierjaya.com',
        phone: '021-5551234',
        address: 'Jl. Industri No. 200, Surabaya',
        rating: 4.5,
        totalOrders: 24,
        totalSpent: 250000000,
        status: 'active',
        createdAt: '2025-06-10T10:00:00Z',
    },
    {
        id: 'SUP-002',
        name: 'CV Komponen Abadi',
        contactPerson: 'Budi Hartono',
        email: 'order@komponenabadi.com',
        phone: '021-5555678',
        address: 'Jl. Raya Bogor No. 150, Jakarta',
        rating: 4.2,
        totalOrders: 18,
        totalSpent: 180000000,
        status: 'active',
        createdAt: '2025-08-15T10:00:00Z',
    },
    {
        id: 'SUP-003',
        name: 'PT Digital Parts',
        contactPerson: 'Rina Susanti',
        email: 'info@digitalparts.com',
        phone: '021-5559012',
        address: 'Jl. TB Simatupang No. 100, Jakarta',
        rating: 3.8,
        totalOrders: 12,
        totalSpent: 95000000,
        status: 'active',
        createdAt: '2025-10-20T10:00:00Z',
    },
    {
        id: 'SUP-004',
        name: 'PT Berkah Supply',
        contactPerson: 'Dedi Kurniawan',
        email: 'sales@berkahsupply.com',
        phone: '021-5553456',
        address: 'Jl. Raya Bekasi No. 200, Bekasi',
        rating: 4.0,
        totalOrders: 8,
        totalSpent: 65000000,
        status: 'active',
        createdAt: '2026-01-05T10:00:00Z',
    },
    {
        id: 'SUP-005',
        name: 'CV Material Sejahtera',
        contactPerson: 'Eko Prasetyo',
        email: 'info@materialsejahtera.com',
        phone: '021-5557890',
        address: 'Jl. Alternatif Cibubur No. 50, Depok',
        rating: 3.5,
        totalOrders: 5,
        totalSpent: 40000000,
        status: 'inactive',
        createdAt: '2026-03-10T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let filtered = [...mockSuppliers];

    if (status) {
        filtered = filtered.filter((s) => s.status === status);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (s) =>
                s.name.toLowerCase().includes(lowerSearch) ||
                s.contactPerson.toLowerCase().includes(lowerSearch) ||
                s.email.toLowerCase().includes(lowerSearch)
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

        const newSupplier = {
            id: `SUP-${Date.now()}`,
            ...body,
            rating: body.rating || 0,
            totalOrders: 0,
            totalSpent: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
        };

        mockSuppliers.push(newSupplier);

        return NextResponse.json({ success: true, data: newSupplier }, { status: 201 });
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

        const index = mockSuppliers.findIndex((s) => s.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Supplier not found' },
                { status: 404 }
            );
        }

        mockSuppliers[index] = { ...mockSuppliers[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockSuppliers[index] });
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

    const index = mockSuppliers.findIndex((s) => s.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Supplier not found' },
            { status: 404 }
        );
    }

    mockSuppliers.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
