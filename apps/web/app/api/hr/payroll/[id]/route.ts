import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

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
        const { tenantId } = await requireAuth();
        const { id } = params;
        const body = await request.json();

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
        if (typeof body.period === 'string') data.period = body.period;
        if (typeof body.baseSalary === 'number') data.baseSalary = body.baseSalary;
        if (typeof body.allowances === 'number') data.allowances = body.allowances;
        if (typeof body.deductions === 'number') data.deductions = body.deductions;
        if (typeof body.bonus === 'number') data.bonus = body.bonus;
        if (typeof body.status === 'string') data.status = body.status.toUpperCase();
        if (typeof body.notes === 'string') data.notes = body.notes;

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
        const { tenantId } = await requireAuth();
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

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
