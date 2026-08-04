import { NextResponse } from 'next/server';

const mockPayroll = [
    { id: 'PAY-001', employeeName: 'Ahmad Rizky', employeeId: 'EMP-001', period: 'Agustus 2026', baseSalary: 15000000, allowances: 2000000, deductions: 1500000, netSalary: 15500000, status: 'processed' },
    { id: 'PAY-002', employeeName: 'Siti Nurhaliza', employeeId: 'EMP-002', period: 'Agustus 2026', baseSalary: 18000000, allowances: 2500000, deductions: 1800000, netSalary: 18700000, status: 'processed' },
    { id: 'PAY-003', employeeName: 'Budi Santoso', employeeId: 'EMP-003', period: 'Agustus 2026', baseSalary: 12000000, allowances: 1500000, deductions: 1200000, netSalary: 12300000, status: 'paid' },
    { id: 'PAY-004', employeeName: 'Dewi Lestari', employeeId: 'EMP-004', period: 'Agustus 2026', baseSalary: 16000000, allowances: 2200000, deductions: 1600000, netSalary: 16600000, status: 'paid' },
    { id: 'PAY-005', employeeName: 'Eko Prasetyo', employeeId: 'EMP-005', period: 'Agustus 2026', baseSalary: 14000000, allowances: 1800000, deductions: 1400000, netSalary: 14400000, status: 'pending' },
    { id: 'PAY-006', employeeName: 'Fitri Handayani', employeeId: 'EMP-006', period: 'Agustus 2026', baseSalary: 13000000, allowances: 1600000, deductions: 1300000, netSalary: 13300000, status: 'pending' },
    { id: 'PAY-007', employeeName: 'Hana Permata', employeeId: 'EMP-008', period: 'Agustus 2026', baseSalary: 11000000, allowances: 1400000, deductions: 1100000, netSalary: 11300000, status: 'pending' },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const period = searchParams.get('period');
    const search = searchParams.get('search');
    const employeeId = searchParams.get('employeeId');

    let filtered = [...mockPayroll];

    if (status) {
        filtered = filtered.filter((payroll) => payroll.status === status);
    }

    if (period) {
        filtered = filtered.filter((payroll) => payroll.period === period);
    }

    if (employeeId) {
        filtered = filtered.filter((payroll) => payroll.employeeId === employeeId);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (payroll) =>
                payroll.employeeName.toLowerCase().includes(lowerSearch)
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

        if (!body.employeeName || !body.period || !body.baseSalary) {
            return NextResponse.json(
                { success: false, error: 'Employee name, period, and base salary are required' },
                { status: 400 }
            );
        }

        const newPayroll = {
            id: `PAY-${Date.now()}`,
            ...body,
            allowances: body.allowances || 0,
            deductions: body.deductions || 0,
            netSalary: (body.baseSalary || 0) + (body.allowances || 0) - (body.deductions || 0),
            status: 'pending',
        };

        mockPayroll.push(newPayroll);

        return NextResponse.json({ success: true, data: newPayroll }, { status: 201 });
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
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: 'ID and status are required' },
                { status: 400 }
            );
        }

        const index = mockPayroll.findIndex((payroll) => payroll.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        mockPayroll[index] = {
            ...mockPayroll[index],
            status,
        };

        return NextResponse.json({ success: true, data: mockPayroll[index] });
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

        const index = mockPayroll.findIndex((payroll) => payroll.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        // Recalculate netSalary if relevant fields changed
        if (updateData.baseSalary !== undefined || updateData.allowances !== undefined || updateData.deductions !== undefined) {
            const base = updateData.baseSalary ?? mockPayroll[index].baseSalary;
            const allowances = updateData.allowances ?? mockPayroll[index].allowances;
            const deductions = updateData.deductions ?? mockPayroll[index].deductions;
            updateData.netSalary = base + allowances - deductions;
        }

        mockPayroll[index] = { ...mockPayroll[index], ...updateData };

        return NextResponse.json({ success: true, data: mockPayroll[index] });
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

    const index = mockPayroll.findIndex((payroll) => payroll.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Payroll record not found' },
            { status: 404 }
        );
    }

    mockPayroll.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
