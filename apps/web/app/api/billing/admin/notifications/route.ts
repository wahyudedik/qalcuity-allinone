import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!isAdmin(session)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get latest 10 pending payments as notifications
        const notifications = await prisma.billingPayment.findMany({
            where: { status: 'PENDING' },
            select: {
                id: true,
                amount: true,
                bankName: true,
                accountName: true,
                createdAt: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                subscription: {
                    select: {
                        plan: {
                            select: {
                                name: true,
                                price: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({
            success: true,
            data: notifications.map((n: any) => ({
                id: n.id,
                type: 'PAYMENT_RECEIVED',
                title: `Pembayaran Baru dari ${n.tenant.name}`,
                message: `${n.accountName || 'Unknown'} mengirim Rp ${n.amount.toLocaleString('id-ID')} via ${n.bankName || 'Transfer Bank'}`,
                tenant: n.tenant,
                plan: n.subscription.plan,
                amount: n.amount,
                isRead: false,
                createdAt: n.createdAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil notifikasi' },
            { status: 500 }
        );
    }
}
