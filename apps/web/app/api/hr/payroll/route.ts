import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const period = searchParams.get('period');
        const search = searchParams.get('search');
        const employeeId = searchParams.get('employeeId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (period) {
            where.period = period;
        }

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (search) {
            where.OR = [
                { employee: { name: { contains: search } } },
                { employee: { employeeId: { contains: search } } },
                { period: { contains: search } },
            ];
        }

        const [records, total] = await Promise.all([
            prisma.payrollRecord.findMany({
                where,
                include: {
                    employee: {
                        select: { id: true, name: true, employeeId: true, position: true, department: true, salary: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.payrollRecord.count({ where }),
        ]);

        const data = records.map((r) => ({
            id: r.id,
            employeeName: r.employee.name,
            employeeId: r.employee.employeeId,
            position: r.employee.position,
            department: r.employee.department,
            period: r.period,
            baseSalary: r.baseSalary,
            allowances: r.allowances,
            deductions: r.deductions,
            bonus: r.bonus,
            netSalary: r.netSalary,
            status: r.status.toLowerCase(),
            paidAt: r.paidAt ? r.paidAt.toISOString() : null,
            notes: r.notes || '',
            createdAt: r.createdAt.toISOString(),
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
        const { tenantId } = await requireAuth();
        const body = await request.json();

        if (!body.employeeId || !body.period || !body.baseSalary) {
            return NextResponse.json(
                { success: false, error: 'Employee ID, period, and base salary are required' },
                { status: 400 }
            );
        }

        // Validate employee belongs to tenant
        const employee = await prisma.employee.findFirst({
            where: { id: body.employeeId, tenantId },
        });
        if (!employee) {
            return NextResponse.json(
                { success: false, error: 'Employee not found' },
                { status: 404 }
            );
        }

        const baseSalary = parseFloat(String(body.baseSalary));
        const allowances = parseFloat(String(body.allowances || 0));
        const deductions = parseFloat(String(body.deductions || 0));
        const bonus = parseFloat(String(body.bonus || 0));
        const netSalary = baseSalary + allowances - deductions + bonus;

        const record = await prisma.payrollRecord.create({
            data: {
                period: body.period,
                baseSalary,
                allowances,
                deductions,
                bonus,
                netSalary,
                notes: body.notes || '',
                employeeId: body.employeeId,
                tenantId,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        return NextResponse.json({ success: true, data: record }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Handle unique constraint violation
        if (message.includes('Unique constraint')) {
            return NextResponse.json(
                { success: false, error: 'Payroll record already exists for this employee and period' },
                { status: 409 }
            );
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: 'ID and status are required' },
                { status: 400 }
            );
        }

        const validStatuses = ['PENDING', 'PROCESSED', 'PAID'];
        const newStatus = status.toUpperCase();
        if (!validStatuses.includes(newStatus)) {
            return NextResponse.json(
                { success: false, error: 'Status must be PENDING, PROCESSED, or PAID' },
                { status: 400 }
            );
        }

        const existing = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        const updated = await prisma.payrollRecord.update({
            where: { id },
            data: {
                status: newStatus,
                paidAt: newStatus === 'PAID' ? new Date() : existing.paidAt,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (typeof updateData.period === 'string') {
            data.period = updateData.period;
        }
        if (typeof updateData.baseSalary === 'number') {
            data.baseSalary = updateData.baseSalary;
        }
        if (typeof updateData.allowances === 'number') {
            data.allowances = updateData.allowances;
        }
        if (typeof updateData.deductions === 'number') {
            data.deductions = updateData.deductions;
        }
        if (typeof updateData.bonus === 'number') {
            data.bonus = updateData.bonus;
        }
        if (typeof updateData.status === 'string') {
            data.status = updateData.status.toUpperCase();
        }
        if (typeof updateData.notes === 'string') {
            data.notes = updateData.notes;
        }

        // Recalculate netSalary if any compensation field changed
        if (data.baseSalary !== undefined || data.allowances !== undefined || data.deductions !== undefined || data.bonus !== undefined) {
            const base = typeof data.baseSalary === 'number' ? data.baseSalary : existing.baseSalary;
            const allow = typeof data.allowances === 'number' ? data.allowances : existing.allowances;
            const deduc = typeof data.deductions === 'number' ? data.deductions : existing.deductions;
            const bon = typeof data.bonus === 'number' ? data.bonus : existing.bonus;
            data.netSalary = base + allow - deduc + bon;
        }

        const updated = await prisma.payrollRecord.update({
            where: { id },
            data,
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        return NextResponse.json({ success: true, data: updated });
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
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        await prisma.payrollRecord.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
