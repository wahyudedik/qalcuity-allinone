import { NextResponse } from 'next/server';

const mockEmployees = [
    {
        id: 'EMP-001',
        employeeId: 'EMP-001',
        firstName: 'Ahmad',
        lastName: 'Rizky',
        email: 'ahmad@qalcuity.com',
        phone: '081234567890',
        position: 'Software Engineer',
        department: 'Engineering',
        startDate: '2025-01-15',
        status: 'active',
        salary: 15000000,
        currency: 'IDR',
        createdAt: '2025-01-15T10:00:00Z',
    },
    {
        id: 'EMP-002',
        employeeId: 'EMP-002',
        firstName: 'Siti',
        lastName: 'Rahayu',
        email: 'siti@qalcuity.com',
        phone: '081234567891',
        position: 'Marketing Manager',
        department: 'Marketing',
        startDate: '2024-06-01',
        status: 'active',
        salary: 18000000,
        currency: 'IDR',
        createdAt: '2024-06-01T10:00:00Z',
    },
    {
        id: 'EMP-003',
        employeeId: 'EMP-003',
        firstName: 'Budi',
        lastName: 'Santoso',
        email: 'budi@qalcuity.com',
        phone: '081234567892',
        position: 'Finance Director',
        department: 'Finance',
        startDate: '2023-03-01',
        status: 'active',
        salary: 25000000,
        currency: 'IDR',
        createdAt: '2023-03-01T10:00:00Z',
    },
    {
        id: 'EMP-004',
        employeeId: 'EMP-004',
        firstName: 'Dewi',
        lastName: 'Lestari',
        email: 'dewi@qalcuity.com',
        phone: '081234567893',
        position: 'HR Specialist',
        department: 'HR',
        startDate: '2024-09-01',
        status: 'active',
        salary: 12000000,
        currency: 'IDR',
        createdAt: '2024-09-01T10:00:00Z',
    },
    {
        id: 'EMP-005',
        employeeId: 'EMP-005',
        firstName: 'Eko',
        lastName: 'Prasetyo',
        email: 'eko@qalcuity.com',
        phone: '081234567894',
        position: 'Sales Executive',
        department: 'Sales',
        startDate: '2025-03-01',
        status: 'on_leave',
        salary: 14000000,
        currency: 'IDR',
        createdAt: '2025-03-01T10:00:00Z',
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    let filtered = [...mockEmployees];

    if (status) {
        filtered = filtered.filter((emp) => emp.status === status);
    }

    if (department) {
        filtered = filtered.filter(
            (emp) => emp.department.toLowerCase() === department.toLowerCase()
        );
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
            (emp) =>
                emp.firstName.toLowerCase().includes(lowerSearch) ||
                emp.lastName.toLowerCase().includes(lowerSearch) ||
                emp.email.toLowerCase().includes(lowerSearch) ||
                emp.position.toLowerCase().includes(lowerSearch)
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

        if (!body.firstName || !body.lastName || !body.email) {
            return NextResponse.json(
                { success: false, error: 'First name, last name, and email are required' },
                { status: 400 }
            );
        }

        // Check duplicate email
        if (mockEmployees.some((emp) => emp.email === body.email)) {
            return NextResponse.json(
                { success: false, error: 'Email already exists' },
                { status: 409 }
            );
        }

        const newEmployee = {
            id: `EMP-${Date.now()}`,
            employeeId: `EMP-${String(mockEmployees.length + 1).padStart(3, '0')}`,
            ...body,
            status: 'active',
            createdAt: new Date().toISOString(),
        };

        mockEmployees.push(newEmployee);

        return NextResponse.json({ success: true, data: newEmployee }, { status: 201 });
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

        const index = mockEmployees.findIndex((emp) => emp.id === id);
        if (index === -1) {
            return NextResponse.json(
                { success: false, error: 'Employee not found' },
                { status: 404 }
            );
        }

        mockEmployees[index] = { ...mockEmployees[index], ...updateData, updatedAt: new Date().toISOString() };

        return NextResponse.json({ success: true, data: mockEmployees[index] });
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

    const index = mockEmployees.findIndex((emp) => emp.id === id);
    if (index === -1) {
        return NextResponse.json(
            { success: false, error: 'Employee not found' },
            { status: 404 }
        );
    }

    mockEmployees.splice(index, 1);

    return NextResponse.json({ success: true, data: null });
}
