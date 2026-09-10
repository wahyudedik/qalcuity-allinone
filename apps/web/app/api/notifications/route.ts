export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages';
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { updateNotificationSchema, formatZodError } from '@/lib/validation-schemas'
import { handleApiError } from '@/lib/api-error'

/**
 * Graceful fallback when the InAppNotification table does not exist yet
 * (migration pending on production). Returns a 200 with empty data so
 * the client-side notification centre degrades silently.
 */
function tableNotFoundFallback(kind: 'list' | 'mark' | 'delete') {
    console.warn('[Notifications API] InAppNotification table not found â€” returning empty fallback')
    if (kind === 'list') {
        return NextResponse.json({ success: true, data: [], unreadCount: 0, total: 0 })
    }
    if (kind === 'mark') {
        return NextResponse.json({ success: true, unreadCount: 0 })
    }
    // kind === 'delete'
    return NextResponse.json({ success: true, deleted: 0 })
}

function isTableNotFoundError(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
    )
}

/**
 * GET /api/notifications
 *
 * Ambil in-app notifications untuk user yang sedang login.
 * Query params:
 *   - unreadOnly (boolean): hanya tampilkan yang belum dibaca
 *   - limit (number): jumlah maksimal notifikasi (default 20)
 *   - offset (number): offset untuk pagination
 *
 * Response:
 *   - data: array notifications
 *   - unreadCount: jumlah belum dibaca
 *   - total: total notifikasi user
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId, userId } = auth

        const { searchParams } = new URL(request.url)
        const unreadOnly = searchParams.get('unreadOnly') === 'true'
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
        const offset = parseInt(searchParams.get('offset') || '0')

        const where: Record<string, unknown> = {
            tenantId,
            userId,
        }

        if (unreadOnly) {
            where.isRead = false
        }

        const [notifications, unreadCount, total] = await Promise.all([
            prisma.inAppNotification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.inAppNotification.count({
                where: { tenantId, userId, isRead: false },
            }),
            prisma.inAppNotification.count({
                where: { tenantId, userId },
            }),
        ])

        return NextResponse.json({
            success: true,
            data: notifications,
            unreadCount,
            total,
        })
    } catch (error) {
        if (isTableNotFoundError(error)) {
            return tableNotFoundFallback('list')
        }
        console.error('[Notifications API] GET error:', error)
        return handleApiError(error)
    }
}

/**
 * PUT /api/notifications
 *
 * Update notification status (mark as read).
 * Body:
 *   - ids: string[] â€” array of notification IDs to mark as read
 *   - markAll: boolean â€” mark all user notifications as read
 */
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId, userId } = auth
        const body = await request.json()
        const validation = updateNotificationSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const { ids, markAll } = validation.data

        if (markAll) {
            await prisma.inAppNotification.updateMany({
                where: { tenantId, userId, isRead: false },
                data: { isRead: true },
            })
        } else if (ids && ids.length > 0) {
            await prisma.inAppNotification.updateMany({
                where: {
                    tenantId,
                    userId,
                    id: { in: ids },
                },
                data: { isRead: true },
            })
        } else {
            return NextResponse.json(
                { success: false, error: 'Provide ids array or markAll=true' },
                { status: 400 }
            )
        }

        // Return updated unread count
        const unreadCount = await prisma.inAppNotification.count({
            where: { tenantId, userId, isRead: false },
        })

        return NextResponse.json({
            success: true,
            unreadCount,
        })
    } catch (error) {
        if (isTableNotFoundError(error)) {
            return tableNotFoundFallback('mark')
        }
        console.error('[Notifications API] PUT error:', error)
        return handleApiError(error)
    }
}

/**
 * DELETE /api/notifications
 *
 * Clear all notifications for the current user.
 */
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId, userId } = auth

        const result = await prisma.inAppNotification.deleteMany({
            where: { tenantId, userId },
        })

        return NextResponse.json({
            success: true,
            deleted: result.count,
        })
    } catch (error) {
        if (isTableNotFoundError(error)) {
            return tableNotFoundFallback('delete')
        }
        console.error('[Notifications API] DELETE error:', error)
        return handleApiError(error)
    }
}
