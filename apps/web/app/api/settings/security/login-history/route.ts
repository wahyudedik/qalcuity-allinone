import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'

/**
 * GET /api/settings/security/login-history — List recent login attempts for the current user
 * 
 * Returns paginated login history with IP, device, timestamp, and status.
 * Data comes from both UserSession and LoginLog tables.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
        const skip = (page - 1) * limit

        // Fetch login logs for this user (from LoginLog table)
        const [logs, total] = await Promise.all([
            prisma.loginLog.findMany({
                where: {
                    userId,
                    tenantId,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    success: true,
                    ipAddress: true,
                    userAgent: true,
                    failureReason: true,
                    createdAt: true,
                },
            }),
            prisma.loginLog.count({
                where: {
                    userId,
                    tenantId,
                },
            }),
        ])

        const data = logs.map((log) => ({
            id: log.id,
            email: log.email,
            success: log.success,
            device: log.userAgent || 'Unknown Device',
            ip: log.ipAddress || 'Unknown IP',
            failureReason: log.failureReason || null,
            createdAt: log.createdAt.toISOString(),
        }))

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
