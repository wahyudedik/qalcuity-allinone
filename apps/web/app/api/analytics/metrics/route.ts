// ============================================
// Metrics API — GET
// List all available metric definitions
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { METRIC_DEFINITIONS } from '@qalcuity/analytics'

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:metrics:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }

        // Extract unique categories
        const categories = [...new Set(METRIC_DEFINITIONS.map(m => m.category))]

        return NextResponse.json({
            success: true,
            data: {
                metrics: METRIC_DEFINITIONS,
                categories,
            },
        })
    } catch (error) {
        console.error('[Metrics List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
