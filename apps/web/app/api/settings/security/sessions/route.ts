import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revokeSessionSchema, formatZodError } from '@/lib/validation-schemas'

/**
 * GET /api/settings/security/sessions — List active sessions for the current user
 * 
 * Returns all active sessions with device info, IP, and last active time.
 * The current session is highlighted.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        // Fetch active sessions for this user
        const sessions = await prisma.userSession.findMany({
            where: {
                userId,
                tenantId,
                isActive: true,
            },
            orderBy: { lastActiveAt: 'desc' },
            select: {
                id: true,
                device: true,
                ipAddress: true,
                userAgent: true,
                lastActiveAt: true,
                expiresAt: true,
                createdAt: true,
            },
        })

        // Get current session token from header or cookie
        const currentSessionToken = request.headers.get('x-session-token') || null

        const data = sessions.map((session) => ({
            id: session.id,
            device: session.device || 'Unknown Device',
            ip: session.ipAddress || 'Unknown IP',
            userAgent: session.userAgent || 'Unknown Browser',
            isCurrent: currentSessionToken ? session.id === currentSessionToken : false,
            lastActiveAt: session.lastActiveAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * POST /api/settings/security/sessions — Create a new session (called on login)
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const body = await request.json()
        const { token, device, ipAddress, userAgent } = body as {
            token?: string
            device?: string
            ipAddress?: string
            userAgent?: string
        }

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token wajib diisi' },
                { status: 400 }
            )
        }

        // Create session with 30-day expiry
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        const session = await prisma.userSession.create({
            data: {
                userId,
                tenantId,
                token,
                device: device || null,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                expiresAt,
            },
            select: {
                id: true,
                device: true,
                ipAddress: true,
                createdAt: true,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: session.id,
                device: session.device,
                ip: session.ipAddress,
                createdAt: session.createdAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/settings/security/sessions — Revoke a specific session or all other sessions
 * 
 * Body: { sessionId?: string } — If provided, revoke that specific session.
 *       If not provided, revoke ALL other sessions except the current one.
 */
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const body = await request.json().catch(() => ({}))

        const validation = revokeSessionSchema.safeParse(body)
        let sessionId: string | null = null

        if (validation.success) {
            sessionId = validation.data.sessionId
        }

        if (sessionId) {
            // Revoke specific session
            const session = await prisma.userSession.findFirst({
                where: {
                    id: sessionId,
                    userId,
                    tenantId,
                    isActive: true,
                },
            })

            if (!session) {
                return NextResponse.json(
                    { success: false, error: 'Sesi tidak ditemukan atau sudah dinonaktifkan' },
                    { status: 404 }
                )
            }

            await prisma.userSession.update({
                where: { id: sessionId },
                data: { isActive: false },
            })

            // Audit log
            void logAudit({
                userId,
                tenantId,
                action: 'UPDATE',
                entity: 'UserSession',
                entityId: sessionId,
                oldValues: { isActive: true },
                newValues: { isActive: false },
                request,
            })

            return NextResponse.json({
                success: true,
                message: 'Sesi berhasil dinonaktifkan',
            })
        }

        // Revoke ALL other sessions (except current)
        const currentSessionToken = request.headers.get('x-session-token')
        const result = await prisma.userSession.updateMany({
            where: {
                userId,
                tenantId,
                isActive: true,
                ...(currentSessionToken ? { id: { not: currentSessionToken } } : {}),
            },
            data: { isActive: false },
        })

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'UserSession',
            entityId: 'all',
            oldValues: { revokedCount: result.count },
            newValues: { action: 'revoke_all_other_sessions' },
            request,
        })

        return NextResponse.json({
            success: true,
            message: `${result.count} sesi lain berhasil dinonaktifkan`,
            data: { revokedCount: result.count },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
