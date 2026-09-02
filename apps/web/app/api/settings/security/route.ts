import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { changePasswordSchema, formatZodError } from '@/lib/validation-schemas'

// GET /api/settings/security — Fetch user security info + login history
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        // Fetch recent audit logs for login history (last 10)
        const loginLogs = await prisma.auditLog.findMany({
            where: {
                tenantId,
                OR: [
                    { userId, entity: 'User', action: 'LOGIN' },
                    { entity: 'Auth', action: 'LOGIN_FAILED' },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                action: true,
                ipAddress: true,
                userAgent: true,
                createdAt: true,
            },
        })

        const loginHistory = loginLogs.map(log => ({
            id: log.id,
            success: log.action === 'LOGIN',
            device: log.userAgent || 'Unknown',
            ip: log.ipAddress || 'Unknown',
            location: 'Unknown',
            createdAt: log.createdAt.toISOString(),
        }))

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    lastPasswordChange: user.updatedAt.toISOString(),
                    lastLoginAt: user.lastLoginAt?.toISOString() || null,
                    createdAt: user.createdAt.toISOString(),
                },
                loginHistory,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

// PUT /api/settings/security — Change password
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth
        const body = await request.json()

        const validation = changePasswordSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const { currentPassword, newPassword } = validation.data

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { success: false, error: 'Password saat ini salah' },
                { status: 400 }
            )
        }

        // Hash new password and update
        const newHash = await bcrypt.hash(newPassword, 12)
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        })

        // Non-blocking audit log (no old password hash leaked)
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'User',
            entityId: userId,
            oldValues: { passwordChanged: true },
            newValues: { passwordChanged: true },
        })

        return NextResponse.json({
            success: true,
            message: 'Password berhasil diubah',
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
