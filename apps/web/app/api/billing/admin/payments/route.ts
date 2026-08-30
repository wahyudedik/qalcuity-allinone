import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!isAdmin(session)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }

        const [payments, total] = await Promise.all([
            prisma.billingPayment.findMany({
                where,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            slug: true,
                            subscriptionStatus: true,
                        },
                    },
                    subscription: {
                        include: {
                            plan: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                    price: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.billingPayment.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching admin payments:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data pembayaran' },
            { status: 500 }
        );
    }
}
