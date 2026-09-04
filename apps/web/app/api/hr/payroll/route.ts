import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createPayrollSchema, updatePayrollSchema, approvePayrollSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payroll:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }
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
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payroll:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }
        const body = await request.json();

        const validation = createPayrollSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Validate employee belongs to tenant
        const employee = await prisma.employee.findFirst({
            where: { id: validatedData.employeeId, tenantId },
        });
        if (!employee) {
            return NextResponse.json(
                { success: false, error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            );
        }

        const baseSalary = validatedData.baseSalary;
        const allowances = validatedData.allowances || 0;
        const deductions = validatedData.deductions || 0;
        const bonus = validatedData.bonus || 0;
        const netSalary = baseSalary + allowances - deductions + bonus;

        const record = await prisma.payrollRecord.create({
            data: {
                period: validatedData.period,
                baseSalary,
                allowances,
                deductions,
                bonus,
                netSalary,
                notes: validatedData.notes || '',
                employeeId: validatedData.employeeId,
                tenantId,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        // Log audit create
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'PayrollRecord', entityId: record.id, newValues: { period: record.period, baseSalary: record.baseSalary, employeeId: record.employeeId } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: record }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = approvePayrollSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { id, status } = validation.data;
        const newStatus = status.toUpperCase();

        const existing = await prisma.payrollRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Payroll record tidak ditemukan' },
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

        // Log audit update status
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'PayrollRecord', entityId: id, oldValues: { status: existing.status } as Record<string, unknown>, newValues: { status: newStatus } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
                { status: 400 }
            );
        }

        const validation = updatePayrollSchema.safeParse(updateData);
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
            const base = typeof data.baseSalary === 'number' ? data.baseSalary : Number(existing.baseSalary);
            const allow = typeof data.allowances === 'number' ? data.allowances : Number(existing.allowances);
            const deduc = typeof data.deductions === 'number' ? data.deductions : Number(existing.deductions);
            const bon = typeof data.bonus === 'number' ? data.bonus : Number(existing.bonus);
            data.netSalary = base + allow - deduc + bon;
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
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
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

        // Log audit delete
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'PayrollRecord', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
