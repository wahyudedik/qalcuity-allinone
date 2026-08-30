import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: plans.map((plan: any) => ({
                ...plan,
                features: plan.features ? JSON.parse(plan.features) : [],
            })),
        });
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data paket' },
            { status: 500 }
        );
    }
}
