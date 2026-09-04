import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:terminals:status:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch all terminals with their latest session and today's stats
        const terminals = await prisma.posTerminal.findMany({
            where: { tenantId },
            include: {
                sessions: {
                    where: { tenantId },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        transactions: {
                            where: {
                                status: 'COMPLETED',
                                createdAt: { gte: today, lt: tomorrow },
                            },
                            select: {
                                totalAmount: true,
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        const terminalsData = terminals.map((terminal) => {
            const latestSession = terminal.sessions[0];
            const isActive = latestSession?.status === 'OPEN';
            const todayTransactions = latestSession?.transactions || [];
            const todaySales = todayTransactions.reduce(
                (sum, tx) => sum + Number(tx.totalAmount),
                0
            );

            return {
                id: terminal.id,
                name: terminal.name,
                code: terminal.code,
                location: terminal.location,
                terminalStatus: terminal.status,
                runtimeStatus: isActive ? 'ACTIVE' : 'IDLE',
                currentCashier: isActive ? latestSession?.cashierName || null : null,
                currentSessionId: isActive ? latestSession?.id || null : null,
                todayTransactions: todayTransactions.length,
                todaySales,
                lastActivity: latestSession?.updatedAt?.toISOString() || null,
                lastOpenedAt: latestSession?.openedAt?.toISOString() || null,
            };
        });

        // Summary counts
        const activeCount = terminalsData.filter((t) => t.runtimeStatus === 'ACTIVE').length;
        const idleCount = terminalsData.filter((t) => t.runtimeStatus === 'IDLE' && t.terminalStatus === 'ACTIVE').length;
        const offlineCount = terminalsData.filter((t) => t.terminalStatus !== 'ACTIVE').length;

        return NextResponse.json({
            success: true,
            data: {
                terminals: terminalsData,
                summary: {
                    total: terminalsData.length,
                    active: activeCount,
                    idle: idleCount,
                    offline: offlineCount,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
