export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { createBillSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
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
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId, deletedAt: null };

        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { billNumber: { contains: search, mode: 'insensitive' } },
                { vendorName: { contains: search, mode: 'insensitive' } },
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [bills, total] = await Promise.all([
            prisma.bill.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.bill.count({ where }),
        ]);

        const data = bills.map((bill) => ({
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
            status: bill.status.toLowerCase(),
            notes: bill.notes,
            createdBy: bill.createdBy,
            createdAt: bill.createdAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:bills:POST:${ip}`, 30, 60000);
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

        const validation = createBillSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Generate unique bill number
        const year = new Date().getFullYear();
        const count = await prisma.bill.count({
            where: { tenantId, billNumber: { startsWith: `BILL-${year}` } },
        });
        const billNumber = `BILL-${year}-${String(count + 1).padStart(6, '0')}`;

        const bill = await prisma.bill.create({
            data: {
                tenantId,
                billNumber,
                vendorName: validatedData.vendorName,
                vendorId: validatedData.vendorId || null,
                invoiceNumber: validatedData.invoiceNumber || null,
                subtotal: validatedData.subtotal,
                taxAmount: validatedData.taxAmount || 0,
                totalAmount: validatedData.totalAmount,
                paidAmount: 0,
                dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
                notes: validatedData.notes || null,
                createdBy: userId,
                status: 'DRAFT',
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: bill.id,
                billNumber: bill.billNumber,
                vendorName: bill.vendorName,
                totalAmount: Number(bill.totalAmount),
                status: bill.status,
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
