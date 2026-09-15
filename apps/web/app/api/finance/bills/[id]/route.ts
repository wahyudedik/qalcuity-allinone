export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateBillSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:bills:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const bill = await prisma.bill.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!bill) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: bill.id,
                billNumber: bill.billNumber,
                vendorName: bill.vendorName,
                vendorId: bill.vendorId,
                invoiceNumber: bill.invoiceNumber,
                subtotal: Number(bill.subtotal),
                taxAmount: Number(bill.taxAmount),
                totalAmount: Number(bill.totalAmount),
                paidAmount: Number(bill.paidAmount),
                dueDate: bill.dueDate?.toISOString().split('T')[0] || null,
                status: bill.status,
                notes: bill.notes,
                createdBy: bill.createdBy,
                approvedBy: bill.approvedBy,
                approvedAt: bill.approvedAt?.toISOString() || null,
                createdAt: bill.createdAt.toISOString(),
                updatedAt: bill.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:bills:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const sanitizedBody = sanitizeObject(body);

        const validation = updateBillSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existingBill = await prisma.bill.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existingBill) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // Status transition validation
        const statusTransitions: Record<string, string[]> = {
            DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
            PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
            APPROVED: ['PAID'],
            PAID: [],
            CANCELLED: [],
        };

        if (validatedData.status && validatedData.status !== existingBill.status) {
            const allowed = statusTransitions[existingBill.status] || [];
            if (!allowed.includes(validatedData.status)) {
                return NextResponse.json(
                    { success: false, error: `Transisi status dari ${existingBill.status} ke ${validatedData.status} tidak diizinkan` },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, unknown> = { ...validatedData };
        if (validatedData.dueDate !== undefined) {
            updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
        }

        // Track approval
        if (validatedData.status === 'APPROVED' && existingBill.status !== 'APPROVED') {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
        }

        const bill = await prisma.bill.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: bill.id,
                billNumber: bill.billNumber,
                status: bill.status,
                totalAmount: Number(bill.totalAmount),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:bills:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const existingBill = await prisma.bill.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existingBill) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        if (existingBill.status !== 'DRAFT') {
            return NextResponse.json(
                { success: false, error: 'Hanya bill dengan status DRAFT yang dapat dihapus' },
                { status: 400 }
            );
        }

        await prisma.bill.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            success: true,
            message: 'Bill berhasil dihapus',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
