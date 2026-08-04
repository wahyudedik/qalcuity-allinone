import { NextResponse } from 'next/server';

const mockLeaveDetails: Record<string, {
    id: string;
    employeeId: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: string;
    approvedBy: string | null;
    createdAt: string;
}> = {
    'LV-001': {
        id: 'LV-001',
        employeeId: 'EMP-001',
        employeeName: 'Ahmad Rizky',
        type: 'annual',
        startDate: '2026-08-05',
        endDate: '2026-08-07',
        days: 3,
        reason: 'Liburan keluarga',
        status: 'approved',
        approvedBy: 'Siti Nurhaliza',
        createdAt: '2026-07-28T10:00:00Z',
    },
    'LV-002': {
        id: 'LV-002',
        employeeId: 'EMP-003',
        employeeName: 'Budi Santoso',
        type: 'sick',
        startDate: '2026-08-04',
        endDate: '2026-08-04',
        days: 1,
        reason: 'Sakit demam',
        status: 'pending',
        approvedBy: null,
        createdAt: '2026-08-04T06:00:00Z',
    },
    'LV-003': {
        id: 'LV-003',
        employeeId: 'EMP-004',
        employeeName: 'Dewi Lestari',
        type: 'annual',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        days: 3,
        reason: 'Keperluan pribadi',
        status: 'pending',
        approvedBy: null,
        createdAt: '2026-08-01T09:00:00Z',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const record = mockLeaveDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Leave request not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        data: record,
    });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const body = await request.json();
    const record = mockLeaveDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Leave request not found' },
            { status: 404 }
        );
    }

    const updated = { ...record, ...body, id };
    mockLeaveDetails[id] = updated;

    return NextResponse.json({
        success: true,
        data: updated,
    });
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const body = await request.json();
    const record = mockLeaveDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Leave request not found' },
            { status: 404 }
        );
    }

    const updated = { ...record, ...body, id };
    mockLeaveDetails[id] = updated;

    return NextResponse.json({
        success: true,
        data: updated,
    });
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockLeaveDetails[id]) {
        return NextResponse.json(
            { success: false, error: 'Leave request not found' },
            { status: 404 }
        );
    }

    delete mockLeaveDetails[id];

    return NextResponse.json({
        success: true,
        message: 'Leave request deleted successfully',
    });
}
