import { NextResponse } from 'next/server';

const mockTodayAttendance = [
    { id: '1', employeeName: 'Ahmad Rizky', employeeId: 'EMP-001', date: '2026-08-04', clockIn: '08:55', clockOut: null, status: 'present', workHours: 0 },
    { id: '2', employeeName: 'Siti Nurhaliza', employeeId: 'EMP-002', date: '2026-08-04', clockIn: '08:30', clockOut: null, status: 'present', workHours: 0 },
    { id: '3', employeeName: 'Budi Santoso', employeeId: 'EMP-003', date: '2026-08-04', clockIn: null, clockOut: null, status: 'leave', workHours: 0 },
    { id: '4', employeeName: 'Dewi Lestari', employeeId: 'EMP-004', date: '2026-08-04', clockIn: '09:15', clockOut: null, status: 'late', workHours: 0 },
    { id: '5', employeeName: 'Eko Prasetyo', employeeId: 'EMP-005', date: '2026-08-04', clockIn: '08:00', clockOut: '17:00', status: 'present', workHours: 9 },
    { id: '6', employeeName: 'Fitri Handayani', employeeId: 'EMP-006', date: '2026-08-04', clockIn: '07:55', clockOut: null, status: 'wfH', workHours: 0 },
    { id: '7', employeeName: 'Hana Permata', employeeId: 'EMP-008', date: '2026-08-04', clockIn: null, clockOut: null, status: 'absent', workHours: 0 },
];

const mockHistoryAttendance = [
    { id: 'h1', employeeName: 'Ahmad Rizky', employeeId: 'EMP-001', date: '2026-08-03', clockIn: '08:58', clockOut: '17:05', status: 'present', workHours: 8.12 },
    { id: 'h2', employeeName: 'Siti Nurhaliza', employeeId: 'EMP-002', date: '2026-08-03', clockIn: '08:25', clockOut: '17:30', status: 'present', workHours: 9.08 },
    { id: 'h3', employeeName: 'Budi Santoso', employeeId: 'EMP-003', date: '2026-08-03', clockIn: '09:30', clockOut: '17:00', status: 'late', workHours: 7.5 },
    { id: 'h4', employeeName: 'Dewi Lestari', employeeId: 'EMP-004', date: '2026-08-03', clockIn: '08:00', clockOut: '17:15', status: 'present', workHours: 9.25 },
    { id: 'h5', employeeName: 'Eko Prasetyo', employeeId: 'EMP-005', date: '2026-08-03', clockIn: '08:05', clockOut: '18:00', status: 'present', workHours: 9.92 },
    { id: 'h6', employeeName: 'Fitri Handayani', employeeId: 'EMP-006', date: '2026-08-03', clockIn: '08:00', clockOut: '17:00', status: 'present', workHours: 9 },
    { id: 'h7', employeeName: 'Hana Permata', employeeId: 'EMP-008', date: '2026-08-03', clockIn: '08:45', clockOut: '17:10', status: 'present', workHours: 8.42 },
    { id: 'h8', employeeName: 'Ahmad Rizky', employeeId: 'EMP-001', date: '2026-08-02', clockIn: '09:20', clockOut: '17:00', status: 'late', workHours: 7.67 },
    { id: 'h9', employeeName: 'Siti Nurhaliza', employeeId: 'EMP-002', date: '2026-08-02', clockIn: '08:30', clockOut: '17:30', status: 'present', workHours: 9 },
    { id: 'h10', employeeName: 'Budi Santoso', employeeId: 'EMP-003', date: '2026-08-02', clockIn: '08:00', clockOut: '17:00', status: 'present', workHours: 9 },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'today';
    const date = searchParams.get('date');
    const search = searchParams.get('search');
    const employeeId = searchParams.get('employeeId');

    let filtered = type === 'history' ? [...mockHistoryAttendance] : [...mockTodayAttendance];

    if (date) {
        filtered = filtered.filter((record) => record.date === date);
    }

    if (employeeId) {
        filtered = filtered.filter((record) => record.employeeId === employeeId);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (record) =>
                record.employeeName.toLowerCase().includes(lowerSearch)
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

        if (!body.employeeName || !body.date) {
            return NextResponse.json(
                { success: false, error: 'Employee name and date are required' },
                { status: 400 }
            );
        }

        const newRecord = {
            id: `ATT-${Date.now()}`,
            ...body,
            clockIn: body.clockIn || null,
            clockOut: body.clockOut || null,
            workHours: body.workHours || 0,
        };

        mockTodayAttendance.push(newRecord);

        return NextResponse.json({ success: true, data: newRecord }, { status: 201 });
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
        const { id, clockOut, status } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const index = mockTodayAttendance.findIndex((record) => record.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        if (clockOut) {
            mockTodayAttendance[index].clockOut = clockOut;
            if (mockTodayAttendance[index].clockIn) {
                const [inH, inM] = mockTodayAttendance[index].clockIn!.split(':').map(Number);
                const [outH, outM] = clockOut.split(':').map(Number);
                mockTodayAttendance[index].workHours = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 100) / 100;
            }
        }

        if (status) {
            mockTodayAttendance[index].status = status;
        }

        return NextResponse.json({ success: true, data: mockTodayAttendance[index] });
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

        const index = mockTodayAttendance.findIndex((record) => record.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        mockTodayAttendance[index] = { ...mockTodayAttendance[index], ...updateData };

        return NextResponse.json({ success: true, data: mockTodayAttendance[index] });
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

    const index = mockTodayAttendance.findIndex((record) => record.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Attendance record not found' },
            { status: 404 }
        );
    }

    mockTodayAttendance.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
