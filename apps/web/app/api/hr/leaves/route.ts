import { NextResponse } from 'next/server';

const mockLeaves = [
    {
        id: 'LV-001',
        employeeName: 'Budi Santoso',
        employeeId: 'EMP-003',
        type: 'annual',
        startDate: '2026-08-03',
        endDate: '2026-08-07',
        days: 5,
        reason: 'Liburan keluarga ke Bali',
        status: 'approved',
        appliedDate: '2026-07-25',
        approvedBy: 'Dewi Lestari',
    },
    {
        id: 'LV-002',
        employeeName: 'Ahmad Rizky',
        employeeId: 'EMP-001',
        type: 'sick',
        startDate: '2026-08-04',
        endDate: '2026-08-04',
        days: 1,
        reason: 'Sakit demam',
        status: 'pending',
        appliedDate: '2026-08-03',
    },
    {
        id: 'LV-003',
        employeeName: 'Hana Permata',
        employeeId: 'EMP-008',
        type: 'personal',
        startDate: '2026-08-10',
        endDate: '2026-08-11',
        days: 2,
        reason: 'Urusan keluarga',
        status: 'pending',
        appliedDate: '2026-08-02',
    },
    {
        id: 'LV-004',
        employeeName: 'Fitri Handayani',
        employeeId: 'EMP-006',
        type: 'annual',
        startDate: '2026-07-28',
        endDate: '2026-07-30',
        days: 3,
        reason: 'Wedding anniversary',
        status: 'approved',
        appliedDate: '2026-07-20',
        approvedBy: 'Siti Nurhaliza',
    },
    {
        id: 'LV-005',
        employeeName: 'Eko Prasetyo',
        employeeId: 'EMP-005',
        type: 'unpaid',
        startDate: '2026-08-15',
        endDate: '2026-08-16',
        days: 2,
        reason: 'Keperluan pribadi',
        status: 'rejected',
        appliedDate: '2026-08-01',
        approvedBy: 'Dewi Lestari',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const employeeId = searchParams.get('employeeId');

    let filtered = [...mockLeaves];

    if (status) {
        filtered = filtered.filter((leave) => leave.status === status);
    }

    if (type) {
        filtered = filtered.filter((leave) => leave.type === type);
    }

    if (employeeId) {
        filtered = filtered.filter((leave) => leave.employeeId === employeeId);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (leave) =>
                leave.employeeName.toLowerCase().includes(lowerSearch) ||
                leave.reason.toLowerCase().includes(lowerSearch)
        );
    }

    return NextResponse.json({
        success: true,
        data: filtered,
        total: filtered.length,
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.employeeName || !body.type || !body.startDate || !body.endDate) {
            return NextResponse.json(
                { success: false, error: 'Employee name, type, start date, and end date are required' },
                { status: 400 }
            );
        }

        const newLeave = {
            id: `LV-${Date.now()}`,
            ...body,
            status: 'pending',
            appliedDate: new Date().toISOString().split('T')[0],
        };

        mockLeaves.push(newLeave);

        return NextResponse.json({ success: true, data: newLeave }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status, approvedBy } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: 'ID and status are required' },
                { status: 400 }
            );
        }

        const index = mockLeaves.findIndex((leave) => leave.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        mockLeaves[index] = {
            ...mockLeaves[index],
            status,
            approvedBy: approvedBy || mockLeaves[index].approvedBy,
        };

        return NextResponse.json({ success: true, data: mockLeaves[index] });
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

        const index = mockLeaves.findIndex((leave) => leave.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        mockLeaves[index] = { ...mockLeaves[index], ...updateData };

        return NextResponse.json({ success: true, data: mockLeaves[index] });
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

    const index = mockLeaves.findIndex((leave) => leave.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Leave request not found' },
            { status: 404 }
        );
    }

    mockLeaves.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
