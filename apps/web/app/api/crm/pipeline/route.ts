export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pipeline:${ip}`, 100, 60000);
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
        const stageFilter = searchParams.get('stage');

        const where: Record<string, unknown> = { tenantId };

        if (stageFilter) {
            where.stage = stageFilter.toUpperCase().replace(' ', '_');
        }

        const deals = await prisma.deal.findMany({
            where,
            include: {
                contact: { select: { id: true, name: true } },
                lead: { select: { id: true, name: true, company: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Group deals by stage
        const stageConfig = [
            'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSING', 'CLOSED_WON', 'CLOSED_LOST',
        ];

        const stages = stageConfig.map((stageId) => {
            const stageDeals = deals.filter((d) => d.stage === stageId);
            const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);
            const weightedValue = stageDeals.reduce(
                (sum, d) => sum + (Number(d.value) * d.probability) / 100,
                0
            );

            return {
                stage: stageId,
                count: stageDeals.length,
                totalValue,
                weightedValue,
                deals: stageDeals.map((deal) => ({
                    id: deal.id,
                    title: deal.title,
                    value: Number(deal.value),
                    stage: deal.stage,
                    probability: deal.probability,
                    closeDate: deal.closeDate?.toISOString() || null,
                    contactId: deal.contactId,
                    contactName: deal.contact?.name || null,
                    leadId: deal.leadId,
                    leadCompany: deal.lead?.company || null,
                    createdAt: deal.createdAt.toISOString(),
                })),
            };
        });

        // If specific stage filter, only return that stage
        const result = stageFilter
            ? stages.filter((s) => s.stage === stageFilter.toUpperCase().replace(' ', '_'))
            : stages;

        return NextResponse.json({
            success: true,
            data: result,
            total: deals.length,
            totalValue: deals.reduce((sum, d) => sum + Number(d.value), 0),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
