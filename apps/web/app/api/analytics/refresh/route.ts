export const dynamic = 'force-dynamic';

// ============================================
// Analytics Refresh API — POST
// Refresh all materialized views used by analytics.
// Hanya SUPERADMIN yang boleh trigger refresh.
// ============================================

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages'
import { requirePermissionForRoute } from '@/lib/session'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'

// ============================================
// POST — Refresh materialized views
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:refresh:POST:${ip}`, 10, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        // 1. Auth check — only SUPERADMIN can refresh
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }

        if (auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang dapat me-refresh analytics views' },
                { status: 403 }
            )
        }

        // 2. Execute refresh function
        const startTime = Date.now()

        await prisma.$executeRawUnsafe('SELECT refresh_analytics_views()')

        const duration = Date.now() - startTime

        logger.info(`[ANALYTICS] Materialized views refreshed in ${duration}ms`)

        return NextResponse.json({
            success: true,
            data: {
                message: 'Materialized views berhasil di-refresh',
                duration: `${duration}ms`,
                views: [
                    'mv_daily_revenue',
                    'mv_top_products',
                    'mv_pos_sales_summary',
                ],
                refreshedAt: new Date().toISOString(),
            },
        })
    } catch (error) {
        logger.error('[ANALYTICS] Failed to refresh materialized views:', error)
        return handleApiError(error)
    }
}
