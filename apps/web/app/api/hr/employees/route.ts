import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { createEmployeeSchema, updateEmployeeSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const department = searchParams.get('department');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (department) {
            where.department = department;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { position: { contains: search } },
                { phone: { contains: search } },
            ];
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.employee.count({ where }),
        ]);

        const data = employees.map((emp) => ({
            id: emp.id,
            employeeId: emp.employeeId,
            name: emp.name,
            email: emp.email,
            phone: emp.phone || '',
            position: emp.position,
            department: emp.department || '',
            joinDate: emp.joinDate.toISOString(),
            salary: emp.salary,
            status: emp.status,
            createdAt: emp.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();

        const validation = createEmployeeSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Sanitize text inputs
        const sanitizedName = sanitizeInput(validatedData.name);
        const sanitizedEmail = sanitizeInput(validatedData.email);
        const sanitizedPhone = validatedData.phone ? sanitizeInput(validatedData.phone) : null;
        const sanitizedPosition = sanitizeInput(validatedData.position);
        const sanitizedDepartment = sanitizeInput(validatedData.department);

        // Check duplicate email within tenant
        const existingEmployee = await prisma.employee.findFirst({
            where: { email: sanitizedEmail, tenantId },
        });

        if (existingEmployee) {
            return NextResponse.json(
                { success: false, error: 'Email sudah digunakan oleh karyawan lain' },
                { status: 409 }
            );
        }

        // Generate employee ID
        const count = await prisma.employee.count({ where: { tenantId } });
        const employeeId = `EMP-${String(count + 1).padStart(3, '0')}`;

        const employee = await prisma.employee.create({
            data: {
                tenantId,
                employeeId,
                name: sanitizedName,
                email: sanitizedEmail,
                phone: sanitizedPhone,
                position: sanitizedPosition,
                department: sanitizedDepartment,
                joinDate: new Date(validatedData.joinDate),
                salary: validatedData.salary || 0,
                status: validatedData.status || 'ACTIVE',
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Employee', entityId: employee.id, newValues: { name: employee.name, email: employee.email, position: employee.position } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: employee }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (message.includes('Unique constraint')) {
            return NextResponse.json(
                { success: false, error: 'Data karyawan sudah ada' },
                { status: 409 }
            );
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const validation = updateEmployeeSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.employee.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            );
        }

        // Build safe update data with sanitization
        const data: Record<string, unknown> = {};
        if (validatedData.name !== undefined) data.name = sanitizeInput(validatedData.name);
        if (validatedData.email !== undefined) data.email = sanitizeInput(validatedData.email);
        if (validatedData.phone !== undefined) data.phone = validatedData.phone ? sanitizeInput(validatedData.phone) : null;
        if (validatedData.position !== undefined) data.position = sanitizeInput(validatedData.position);
        if (validatedData.department !== undefined) data.department = sanitizeInput(validatedData.department);
        if (validatedData.salary !== undefined) data.salary = validatedData.salary;
        if (validatedData.status !== undefined) data.status = validatedData.status;
        if (validatedData.joinDate !== undefined) data.joinDate = new Date(validatedData.joinDate);

        const employee = await prisma.employee.update({
            where: { id },
            data,
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Employee', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: employee });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const existing = await prisma.employee.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            );
        }

        await prisma.employee.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Employee', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
