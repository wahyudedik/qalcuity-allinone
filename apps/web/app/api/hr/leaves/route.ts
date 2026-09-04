import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createLeaveSchema, updateLeaveSchema, approveLeaveSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leaves:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const employeeId = searchParams.get('employeeId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (type) {
            where.type = type.toUpperCase();
        }

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (search) {
            where.OR = [
                { employee: { name: { contains: search } } },
                { employee: { employeeId: { contains: search } } },
                { reason: { contains: search } },
            ];
        }

        const [leaves, total] = await Promise.all([
            prisma.leaveRequest.findMany({
                where,
                include: {
                    employee: {
                        select: { id: true, name: true, employeeId: true, position: true, department: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.leaveRequest.count({ where }),
        ]);

        const data = leaves.map((l) => ({
            id: l.id,
            employeeName: l.employee.name,
            employeeId: l.employee.employeeId,
            position: l.employee.position,
            department: l.employee.department,
            type: l.type.toLowerCase(),
            startDate: l.startDate.toISOString().split('T')[0],
            endDate: l.endDate.toISOString().split('T')[0],
            days: l.days,
            reason: l.reason || '',
            status: l.status.toLowerCase(),
            appliedDate: l.appliedDate.toISOString().split('T')[0],
            approvedBy: l.approvedBy || '',
            notes: l.notes || '',
            createdAt: l.createdAt.toISOString(),
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:leaves:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }
        const body = await request.json();

        const validation = createLeaveSchema.safeParse(body);
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

        const startDate = new Date(validatedData.startDate);
        const endDate = new Date(validatedData.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (days <= 0) {
            return NextResponse.json(
                { success: false, error: 'Tanggal selesai harus setelah tanggal mulai' },
                { status: 400 }
            );
        }

        const leave = await prisma.leaveRequest.create({
            data: {
                type: validatedData.type.toUpperCase(),
                startDate,
                endDate,
                days,
                reason: validatedData.reason || '',
                notes: validatedData.notes || '',
                employeeId: validatedData.employeeId,
                tenantId,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'LeaveRequest', entityId: leave.id, newValues: { type: leave.type, startDate: leave.startDate, endDate: leave.endDate, days: leave.days } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: leave }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = approveLeaveSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { id, status, approvedBy } = validation.data;
        const newStatus = status.toUpperCase();

        const existing = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Leave request tidak ditemukan' },
                { status: 404 }
            );
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: newStatus,
                approvedBy: approvedBy || existing.approvedBy,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'LeaveRequest', entityId: id, newValues: { status: newStatus } as Record<string, unknown>, request });

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

        const validation = updateLeaveSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Leave request tidak ditemukan' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (validatedData.type !== undefined) {
            data.type = validatedData.type.toUpperCase();
        }
        if (validatedData.startDate !== undefined) {
            data.startDate = new Date(validatedData.startDate);
        }
        if (validatedData.endDate !== undefined) {
            data.endDate = new Date(validatedData.endDate);
        }
        if (validatedData.days !== undefined) {
            data.days = validatedData.days;
        }
        if (validatedData.reason !== undefined) {
            data.reason = validatedData.reason;
        }
        if (validatedData.status !== undefined) {
            data.status = validatedData.status.toUpperCase();
        }
        if (validatedData.approvedBy !== undefined) {
            data.approvedBy = validatedData.approvedBy;
        }
        if (validatedData.notes !== undefined) {
            data.notes = validatedData.notes;
        }

        // Recalculate days if startDate or endDate changed
        if (data.startDate || data.endDate) {
            const start = data.startDate ? new Date(String(data.startDate)) : existing.startDate;
            const end = data.endDate ? new Date(String(data.endDate)) : existing.endDate;
            data.days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data,
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'LeaveRequest', entityId: id, newValues: data as Record<string, unknown>, request });

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

        const existing = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        await prisma.leaveRequest.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'LeaveRequest', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
