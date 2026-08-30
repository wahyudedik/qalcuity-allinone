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

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [
            pendingPayments,
            monthlyPayments,
            activeTenants,
            monthlyRevenue,
        ] = await Promise.all([
            // Total pembayaran pending
            prisma.billingPayment.findMany({
                where: { status: 'PENDING' },
                select: { amount: true },
            }),
            // Total pembayaran bulan ini
            prisma.billingPayment.findMany({
                where: {
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                },
                select: { amount: true },
            }),
            // Tenant aktif
            prisma.tenant.count({
                where: { subscriptionStatus: 'ACTIVE' },
            }),
            // Revenue bulan ini (VERIFIED)
            prisma.billingPayment.findMany({
                where: {
                    status: 'VERIFIED',
                    verifiedAt: { gte: startOfMonth, lte: endOfMonth },
                },
                select: { amount: true },
            }),
        ]);

        const pendingCount = pendingPayments.length;
        const pendingTotal = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const monthlyCount = monthlyPayments.length;
        const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const monthlyRevenueTotal = monthlyRevenue.reduce((sum, p) => sum + Number(p.amount), 0);

        return NextResponse.json({
            success: true,
            data: {
                pendingCount,
                pendingTotal,
                monthlyCount,
                monthlyTotal,
                activeTenants,
                monthlyRevenue: monthlyRevenueTotal,
            },
        });
    } catch (error) {
        console.error('Error fetching billing stats:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data statistik billing' },
            { status: 500 }
        );
    }
}
