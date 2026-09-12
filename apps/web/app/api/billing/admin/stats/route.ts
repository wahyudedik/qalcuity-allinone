export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
    try {
        const auth = await requirePermissionForRoute(new Request('http://localhost/api/billing/admin/stats', { method: 'GET' }));
        if ('error' in auth) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
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
                take: 10000,
            }),
            // Total pembayaran bulan ini
            prisma.billingPayment.findMany({
                where: {
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                },
                select: { amount: true },
                take: 10000,
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
                take: 10000,
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
        return handleApiError(error);
    }
}
