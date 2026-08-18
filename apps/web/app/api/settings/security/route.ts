import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'

// PUT /api/settings/security — Change password
export async function PUT(request: Request) {
    try {
        const { userId, tenantId } = await requireAuth()
        const body = await request.json()

        const { currentPassword, newPassword } = body as {
            currentPassword?: string
            newPassword?: string
        }

        // Validation
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Password saat ini dan password baru harus diisi' },
                { status: 400 }
            )
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password baru minimal 8 karakter' },
                { status: 400 }
            )
        }

        if (currentPassword === newPassword) {
            return NextResponse.json(
                { success: false, error: 'Password baru harus berbeda dari password saat ini' },
                { status: 400 }
            )
        }

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
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
