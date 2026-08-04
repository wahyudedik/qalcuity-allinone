import { NextResponse } from 'next/server';

const mockPayrollDetails: Record<string, {
    id: string;
    employeeId: string;
    employeeName: string;
    period: string;
    baseSalary: number;
    allowance: number;
    bonus: number;
    deductions: number;
    tax: number;
    netSalary: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
}> = {
    'PAY-001': {
        id: 'PAY-001',
        employeeId: 'EMP-001',
        employeeName: 'Ahmad Rizky',
        period: 'Juli 2026',
        baseSalary: 15000000,
        allowance: 1500000,
        bonus: 500000,
        deductions: 250000,
        tax: 1500000,
        netSalary: 15250000,
        status: 'paid',
        paidAt: '2026-07-28T10:00:00Z',
        createdAt: '2026-07-25T08:00:00Z',
    },
    'PAY-002': {
        id: 'PAY-002',
        employeeId: 'EMP-002',
        employeeName: 'Siti Nurhaliza',
        period: 'Juli 2026',
        baseSalary: 18000000,
        allowance: 2000000,
        bonus: 1000000,
        deductions: 300000,
        tax: 2000000,
        netSalary: 18700000,
        status: 'paid',
        paidAt: '2026-07-28T10:00:00Z',
        createdAt: '2026-07-25T08:00:00Z',
    },
    'PAY-003': {
        id: 'PAY-003',
        employeeId: 'EMP-003',
        employeeName: 'Budi Santoso',
        period: 'Juli 2026',
        baseSalary: 10000000,
        allowance: 1000000,
        bonus: 0,
        deductions: 200000,
        tax: 1000000,
        netSalary: 9800000,
        status: 'pending',
        paidAt: null,
        createdAt: '2026-07-25T08:00:00Z',
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const record = mockPayrollDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Payroll record not found' },
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
    const record = mockPayrollDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Payroll record not found' },
            { status: 404 }
        );
    }

    const updated = { ...record, ...body, id };
    mockPayrollDetails[id] = updated;

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
    const record = mockPayrollDetails[id];

    if (!record) {
        return NextResponse.json(
            { success: false, error: 'Payroll record not found' },
            { status: 404 }
        );
    }

    const updated = { ...record, ...body, id };
    mockPayrollDetails[id] = updated;

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

    if (!mockPayrollDetails[id]) {
        return NextResponse.json(
            { success: false, error: 'Payroll record not found' },
            { status: 404 }
        );
    }

    delete mockPayrollDetails[id];

    return NextResponse.json({
        success: true,
        message: 'Payroll record deleted successfully',
    });
}
