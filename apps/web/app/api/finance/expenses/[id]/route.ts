export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateExpenseSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { softDelete } from '@/lib/soft-delete';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:expenses:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const expense = await prisma.expense.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
        });

        if (!expense) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: expense.id,
                expenseNumber: expense.expenseNumber,
                category: expense.category,
                description: expense.description,
                amount: Number(expense.amount),
                taxAmount: Number(expense.taxAmount),
                totalAmount: Number(expense.totalAmount),
                expenseDate: expense.expenseDate.toISOString().split('T')[0],
                paymentMethod: expense.paymentMethod,
                receiptUrl: expense.receiptUrl,
                status: expense.status,
                createdBy: expense.createdBy,
                approvedBy: expense.approvedBy,
                approvedAt: expense.approvedAt?.toISOString() || null,
                createdAt: expense.createdAt.toISOString(),
                updatedAt: expense.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:expenses:PUT:${ip}`, 30, 60000);
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

        const validation = updateExpenseSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existingExpense = await prisma.expense.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existingExpense) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        // Status transition validation
        const statusTransitions: Record<string, string[]> = {
            DRAFT: ['PENDING_APPROVAL', 'REJECTED'],
            PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
            APPROVED: [],
            REJECTED: ['DRAFT'],
        };

        if (validatedData.status && validatedData.status !== existingExpense.status) {
            const allowed = statusTransitions[existingExpense.status] || [];
            if (!allowed.includes(validatedData.status)) {
                return NextResponse.json(
                    { success: false, error: `Transisi status dari ${existingExpense.status} ke ${validatedData.status} tidak diizinkan` },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, unknown> = { ...validatedData };
        if (validatedData.expenseDate !== undefined) {
            updateData.expenseDate = validatedData.expenseDate ? new Date(validatedData.expenseDate) : new Date();
        }

        // Track approval
        if (validatedData.status === 'APPROVED' && existingExpense.status !== 'APPROVED') {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
        }

        const expense = await prisma.expense.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: expense.id,
                expenseNumber: expense.expenseNumber,
                status: expense.status,
                totalAmount: Number(expense.totalAmount),
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
        const rateLimitResult = checkRateLimit(`api:expenses:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const existingExpense = await prisma.expense.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
        });

        if (!existingExpense) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND },
                { status: 404 }
            );
        }

        if (existingExpense.status !== 'DRAFT') {
            return NextResponse.json(
                { success: false, error: 'Hanya expense dengan status DRAFT yang dapat dihapus' },
                { status: 400 }
            );
        }

        // Soft delete: mark record as deleted instead of removing it
        const deleteResult = await softDelete(prisma, 'expense', params.id, tenantId, userId);
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: 'Expense not found or already deleted' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Expense berhasil dihapus',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
