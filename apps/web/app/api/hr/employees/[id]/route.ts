import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { updateEmployeeSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

        const employee = await prisma.employee.findFirst({
            where: { id, tenantId },
            include: {
                attendanceRecords: {
                    orderBy: { date: 'desc' },
                    take: 10,
                },
                leaveRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                payrollRecords: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!employee) {
            return NextResponse.json(
                { success: false, error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            );
        }

        const data = {
            id: employee.id,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            position: employee.position,
            department: employee.department || '',
            joinDate: employee.joinDate.toISOString(),
            salary: employee.salary,
            status: employee.status,
            attendance: employee.attendanceRecords.map((a) => ({
                id: a.id,
                date: a.date.toISOString(),
                clockIn: a.clockIn?.toISOString() || null,
                clockOut: a.clockOut?.toISOString() || null,
                status: a.status,
                workHours: a.workHours,
            })),
            leaves: employee.leaveRequests.map((l) => ({
                id: l.id,
                type: l.type,
                startDate: l.startDate.toISOString(),
                endDate: l.endDate.toISOString(),
                days: l.days,
                reason: l.reason || '',
                status: l.status,
                appliedDate: l.appliedDate.toISOString(),
            })),
            payroll: employee.payrollRecords.map((p) => ({
                id: p.id,
                period: p.period,
                baseSalary: p.baseSalary,
                allowances: p.allowances,
                deductions: p.deductions,
                netSalary: p.netSalary,
                status: p.status,
            })),
            createdAt: employee.createdAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        const { id } = params;
        const body = await request.json();

        const validation = updateEmployeeSchema.safeParse(body);
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

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
        const { id } = params;

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
