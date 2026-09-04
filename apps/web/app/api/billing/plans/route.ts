import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:plans:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 });
        }
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: plans.map((plan) => ({
                ...plan,
                features: plan.features ? JSON.parse(plan.features) : [],
            })),
        });
    } catch (error) {
        console.error('Error fetching plans:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data paket' },
            { status: 500 }
        );
    }
}
