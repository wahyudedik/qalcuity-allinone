export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { createExpenseSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
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
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId, deletedAt: null };

        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }

        if (category && category !== 'all') {
            where.category = category.toUpperCase();
        }

        if (search) {
            where.OR = [
                { expenseNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (startDate || endDate) {
            const dateFilter: Record<string, Date> = {};
            if (startDate) dateFilter.gte = new Date(startDate);
            if (endDate) dateFilter.lte = new Date(endDate);
            where.expenseDate = dateFilter;
        }

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.expense.count({ where }),
        ]);

        const data = expenses.map((expense) => ({
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
            status: expense.status.toLowerCase(),
            createdBy: expense.createdBy,
            createdAt: expense.createdAt.toISOString(),
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
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:expenses:POST:${ip}`, 30, 60000);
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

        const validation = createExpenseSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Generate unique expense number
        const year = new Date().getFullYear();
        const count = await prisma.expense.count({
            where: { tenantId, expenseNumber: { startsWith: `EXP-${year}` } },
        });
        const expenseNumber = `EXP-${year}-${String(count + 1).padStart(6, '0')}`;

        const expense = await prisma.expense.create({
            data: {
                tenantId,
                expenseNumber,
                category: validatedData.category,
                description: validatedData.description,
                amount: validatedData.amount,
                taxAmount: validatedData.taxAmount || 0,
                totalAmount: validatedData.totalAmount,
                expenseDate: validatedData.expenseDate ? new Date(validatedData.expenseDate) : new Date(),
                paymentMethod: validatedData.paymentMethod || 'CASH',
                receiptUrl: validatedData.receiptUrl || null,
                createdBy: userId,
                status: 'DRAFT',
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: expense.id,
                expenseNumber: expense.expenseNumber,
                category: expense.category,
                totalAmount: Number(expense.totalAmount),
                status: expense.status,
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
