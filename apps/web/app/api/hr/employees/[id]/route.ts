import { NextResponse } from 'next/server';

const mockEmployeeDetails: Record<string, {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    position: string;
    joinDate: string;
    status: string;
    salary: number;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    skills: string[];
    performance: { rating: number; lastReview: string };
}> = {
    'EMP-001': {
        id: 'EMP-001',
        firstName: 'Ahmad',
        lastName: 'Rizky',
        email: 'ahmad@qalcuity.com',
        phone: '+62 812 3456 7890',
        department: 'Engineering',
        position: 'Senior Developer',
        joinDate: '2024-03-15',
        status: 'active',
        salary: 15000000,
        address: 'Jl. Teknologi No. 42, Jakarta Selatan',
        emergencyContact: 'Siti Rizky',
        emergencyPhone: '+62 812 1111 2222',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        performance: { rating: 4.5, lastReview: '2026-06-30' },
    },
    'EMP-002': {
        id: 'EMP-002',
        firstName: 'Siti',
        lastName: 'Nurhaliza',
        email: 'siti@qalcuity.com',
        phone: '+62 856 7890 1234',
        department: 'Finance',
        position: 'Finance Manager',
        joinDate: '2024-01-10',
        status: 'active',
        salary: 18000000,
        address: 'Jl. Keuangan No. 15, Jakarta Pusat',
        emergencyContact: 'Ahmad Nurhaliza',
        emergencyPhone: '+62 856 3333 4444',
        skills: ['Financial Analysis', 'Accounting', 'Tax', 'Budgeting'],
        performance: { rating: 4.8, lastReview: '2026-06-30' },
    },
    'EMP-003': {
        id: 'EMP-003',
        firstName: 'Budi',
        lastName: 'Santoso',
        email: 'budi@qalcuity.com',
        phone: '+62 878 9012 3456',
        department: 'HR',
        position: 'HR Specialist',
        joinDate: '2024-06-01',
        status: 'on_leave',
        salary: 12000000,
        address: 'Jl. Kemanusiaan No. 8, Jakarta Barat',
        emergencyContact: 'Dewi Santoso',
        emergencyPhone: '+62 878 5555 6666',
        skills: ['Recruitment', 'Employee Relations', 'Payroll', 'BPJS'],
        performance: { rating: 4.2, lastReview: '2026-06-30' },
    },
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const employee = mockEmployeeDetails[id];

    if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!mockEmployeeDetails[id]) {
            return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
        }

        mockEmployeeDetails[id] = { ...mockEmployeeDetails[id], ...body };

        return NextResponse.json({ success: true, data: mockEmployeeDetails[id] });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    if (!mockEmployeeDetails[id]) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    delete mockEmployeeDetails[id];

    return NextResponse.json({ success: true, data: null });
}
