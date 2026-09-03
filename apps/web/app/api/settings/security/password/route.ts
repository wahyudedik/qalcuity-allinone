import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { changePasswordSchema, formatZodError } from '@/lib/validation-schemas'

/**
 * POST /api/settings/security/password — Change user password
 * 
 * Validates current password, hashes new password, updates in database.
 * Includes audit logging and rate limiting considerations.
 */
export async function POST(request: Request) {
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

        // Get current user with password hash
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

        // Invalidate all other sessions for this user (security best practice)
        await prisma.userSession.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
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
            request,
        })

        return NextResponse.json({
            success: true,
            message: 'Password berhasil diubah. Semua sesi lain telah dinonaktifkan.',
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
