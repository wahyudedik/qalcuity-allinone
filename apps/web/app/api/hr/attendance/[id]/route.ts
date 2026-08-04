import { NextResponse } from 'next/server';

const mockAttendanceDetails: Record<string, {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    clockIn: string;
    clockOut: string | null;
    status: string;
    workHours: number;
    overtime: number;
    notes: string;
}> = {
    'ATT-001': {
        id: 'ATT-001',
        employeeId: 'EMP-001',
        employeeName: 'Ahmad Rizky',
        date: '2026-08-01',
        clockIn: '08:00',
        clockOut: '17:30',
        status: 'present',
        workHours: 8.5,
        overtime: 0.5,
        notes: '',
    },
    'ATT-002': {
        id: 'ATT-002',
        employeeId: 'EMP-002',
        employeeName: 'Siti Nurhaliza',
        date: '2026-08-01',
        clockIn: '07:45',
        clockOut: '17:15',
        status: 'present',
        workHours: 8.5,
        overtime: 0,
        notes: '',
    },
    'ATT-003': {
        id: 'ATT-003',
        employeeId: 'EMP-003',
        employeeName: 'Budi Santoso',
        date: '2026-08-01',
        clockIn: '09:30',
        clockOut: '18:00',
        status: 'late',
        workHours: 8.5,
        overtime: 0,
        notes: 'Terlambat karena macet',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const record = mockAttendanceDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Attendance record not found' },
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
    const record = mockAttendanceDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Attendance record not found' },
            { status: 404 }
        );
    }

    const updated = { ...record, ...body, id };
    mockAttendanceDetails[id] = updated;

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

    if (!mockAttendanceDetails[id]) {
        return NextResponse.json(
            { success: false, error: 'Attendance record not found' },
            { status: 404 }
        );
    }

    delete mockAttendanceDetails[id];

    return NextResponse.json({
        success: true,
        message: 'Attendance record deleted successfully',
    });
}
