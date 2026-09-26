export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { generatePeriodSummary } from '@/lib/closing-entry';

// ============================================
// GET — Period Summary Report (GL-GAP-04)
//
// Returns comprehensive summary for a period:
// - Total debits & credits
// - Revenue & expense totals
// - Net income/loss
// - Balance check (debits == credits)
// - Breakdown by account
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:summary:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { id } = params;

        // Verify period exists and belongs to this tenant
        const period = await prisma.accountingPeriod.findFirst({
            where: { id, tenantId },
        });

        if (!period) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        // Generate period summary
        const summary = await generatePeriodSummary(tenantId, id);

        // Balance check
        const isBalanced = Math.abs(summary.totalDebit - summary.totalCredit) < 0.01;
        const balanceDifference = Math.round((summary.totalDebit - summary.totalCredit) * 10000) / 10000;

        return NextResponse.json({
            success: true,
            data: {
                periodId: period.id,
                periodName: period.name,
                startDate: period.startDate.toISOString(),
                endDate: period.endDate.toISOString(),
                status: period.status,
                closedBy: period.closedBy,
                closedAt: period.closedAt?.toISOString() || null,
                summary: {
                    totalEntries: summary.totalEntries,
                    totalDebit: summary.totalDebit,
                    totalCredit: summary.totalCredit,
                    isBalanced,
                    balanceDifference,
                    totalRevenue: summary.totalRevenue,
                    totalExpenses: summary.totalExpenses,
                    netIncome: summary.netIncome,
                    netIncomeLabel: summary.netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih',
                },
                breakdown: {
                    revenue: summary.revenueBreakdown,
                    expenses: summary.expenseBreakdown,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
