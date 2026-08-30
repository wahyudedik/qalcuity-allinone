import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updatePayrollSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

        const record = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: { id: true, name: true, employeeId: true, position: true, department: true, email: true, phone: true, salary: true },
                },
            },
        });

        if (!record) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        const data = {
            id: record.id,
            employeeId: record.employeeId,
            employeeName: record.employee.name,
            employeeNumber: record.employee.employeeId,
            position: record.employee.position,
            department: record.employee.department,
            period: record.period,
            baseSalary: record.baseSalary,
            allowances: record.allowances,
            deductions: record.deductions,
            bonus: record.bonus,
            netSalary: record.netSalary,
            status: record.status.toLowerCase(),
            paidAt: record.paidAt ? record.paidAt.toISOString() : null,
            notes: record.notes || '',
            createdAt: record.createdAt.toISOString(),
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

        const validation = updatePayrollSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payroll record tidak ditemukan' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (validatedData.period !== undefined) data.period = validatedData.period;
        if (validatedData.baseSalary !== undefined) data.baseSalary = validatedData.baseSalary;
        if (validatedData.allowances !== undefined) data.allowances = validatedData.allowances;
        if (validatedData.deductions !== undefined) data.deductions = validatedData.deductions;
        if (validatedData.bonus !== undefined) data.bonus = validatedData.bonus;
        if (validatedData.status !== undefined) data.status = validatedData.status.toUpperCase();
        if (validatedData.notes !== undefined) data.notes = validatedData.notes;

        // Recalculate netSalary if any compensation field changed
        if (data.baseSalary !== undefined || data.allowances !== undefined || data.deductions !== undefined || data.bonus !== undefined) {
            const base = typeof data.baseSalary === 'number' ? data.baseSalary : existing.baseSalary;
            const allow = typeof data.allowances === 'number' ? data.allowances : existing.allowances;
            const deduc = typeof data.deductions === 'number' ? data.deductions : existing.deductions;
            const bon = typeof data.bonus === 'number' ? data.bonus : existing.bonus;
            data.netSalary = base + allow - deduc + bon;
        }

        // Set paidAt when status changes to PAID
        if (data.status === 'PAID' && existing.status !== 'PAID') {
            data.paidAt = new Date();
        }

        const updated = await prisma.payrollRecord.update({
            where: { id },
            data,
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'PayrollRecord', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: updated });
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

        const existing = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payroll record not found' },
                { status: 404 }
            );
        }

        // Don't allow deleting paid records
        if (existing.status === 'PAID') {
            return NextResponse.json(
                { success: false, error: 'Cannot delete paid payroll records' },
                { status: 400 }
            );
        }

        await prisma.payrollRecord.delete({ where: { id } });

        // Log audit delete
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'PayrollRecord', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
