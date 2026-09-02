import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateLeaveSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const leave = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: { id: true, name: true, employeeId: true, position: true, department: true, email: true, phone: true },
                },
            },
        });

        if (!leave) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        const data = {
            id: leave.id,
            employeeId: leave.employeeId,
            employeeName: leave.employee.name,
            employeeNumber: leave.employee.employeeId,
            position: leave.employee.position,
            department: leave.employee.department,
            type: leave.type.toLowerCase(),
            startDate: leave.startDate.toISOString().split('T')[0],
            endDate: leave.endDate.toISOString().split('T')[0],
            days: leave.days,
            reason: leave.reason || '',
            status: leave.status.toLowerCase(),
            appliedDate: leave.appliedDate.toISOString().split('T')[0],
            approvedBy: leave.approvedBy || null,
            notes: leave.notes || '',
            createdAt: leave.createdAt.toISOString(),
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const validation = updateLeaveSchema.safeParse(body);
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
        if (validatedData.type !== undefined) data.type = validatedData.type.toUpperCase();
        if (validatedData.startDate !== undefined) data.startDate = new Date(validatedData.startDate);
        if (validatedData.endDate !== undefined) data.endDate = new Date(validatedData.endDate);
        if (validatedData.days !== undefined) data.days = validatedData.days;
        if (validatedData.reason !== undefined) data.reason = validatedData.reason;
        if (validatedData.status !== undefined) {
            const newStatus = validatedData.status.toUpperCase();
            const currentStatus = existing.status;
            if (newStatus !== currentStatus) {
                try {
                    const { canTransitionSafe, logWorkflowHistory } = await import('@/lib/workflow');
                    const isValid = canTransitionSafe('LEAVE_REQUEST', currentStatus, newStatus, tenantId);
                    if (!isValid) {
                        return NextResponse.json(
                            { success: false, error: `Transisi status tidak valid: ${currentStatus} → ${newStatus}` },
                            { status: 400 }
                        );
                    }
                    // Log workflow history dengan backward compatibility
                    await logWorkflowHistory({
                        tenantId,
                        entityType: 'LEAVE_REQUEST',
                        entityId: id,
                        fromState: currentStatus,
                        toState: newStatus,
                        action: newStatus.toLowerCase(),
                        userId,
                        notes: validatedData.notes || null,
                    });
                } catch (workflowError: unknown) {
                    // Backward compatibility: jika workflow engine gagal, tetap izinkan perubahan status
                    const msg = workflowError instanceof Error ? workflowError.message : 'Unknown error';
                    console.warn(`[Workflow] Leave workflow validation gagal, mengizinkan transisi: ${msg}`);
                }
            }
            data.status = newStatus;
        }
        if (validatedData.approvedBy !== undefined) data.approvedBy = validatedData.approvedBy;
        if (validatedData.notes !== undefined) data.notes = validatedData.notes;

        // Recalculate days if dates changed
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

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

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

        // Log audit delete
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
