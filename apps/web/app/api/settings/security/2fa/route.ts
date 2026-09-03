import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import {
    generateSecret,
    generateTOTP,
    verifyTOTP,
    generateBackupCodes,
    hashBackupCodes,
    verifyBackupCode,
    generateOtpAuthUri,
} from '@/lib/totp'
import { enable2faSchema, disable2faSchema, verify2faSchema, formatZodError } from '@/lib/validation-schemas'

/**
 * GET /api/settings/security/2fa — Get 2FA status
 * 
 * Returns whether 2FA is enabled and the setup URI if not yet enabled.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId } = auth

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorEnabled: true,
                twoFactorBackupCodes: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        const backupCodesCount = user.twoFactorBackupCodes
            ? JSON.parse(user.twoFactorBackupCodes).length
            : 0

        return NextResponse.json({
            success: true,
            data: {
                enabled: user.twoFactorEnabled,
                backupCodesRemaining: backupCodesCount,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * POST /api/settings/security/2fa — Enable 2FA
 * 
 * Step 1: Generate secret + QR code URL (when code is not provided)
 * Step 2: Verify code and activate 2FA (when code is provided)
 * 
 * Body: { code?: string, secret?: string }
 * - If no code: returns secret + otpauth URI for setup
 * - If code provided: verifies and enables 2FA
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const body = await request.json()

        // Check if user already has 2FA enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorEnabled: true,
                twoFactorSecret: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        if (user.twoFactorEnabled) {
            return NextResponse.json(
                { success: false, error: '2FA sudah aktif. Nonaktifkan terlebih dahulu.' },
                { status: 400 }
            )
        }

        // Step 2: Verify code and enable 2FA
        if (body.code && body.secret) {
            const validation = enable2faSchema.safeParse({ code: body.code })
            if (!validation.success) {
                return NextResponse.json(
                    { success: false, ...formatZodError(validation.error) },
                    { status: 400 }
                )
            }

            // Verify the TOTP code against the provided secret
            const isValid = verifyTOTP(body.secret, body.code)
            if (!isValid) {
                return NextResponse.json(
                    { success: false, error: 'Kode verifikasi salah. Pastikan waktu perangkat sudah benar.' },
                    { status: 400 }
                )
            }

            // Generate backup codes
            const backupCodes = generateBackupCodes()
            const hashedBackupCodes = await hashBackupCodes(backupCodes)

            // Enable 2FA
            await prisma.user.update({
                where: { id: userId },
                data: {
                    twoFactorEnabled: true,
                    twoFactorSecret: body.secret,
                    twoFactorBackupCodes: hashedBackupCodes,
                },
            })

            // Audit log
            void logAudit({
                userId,
                tenantId,
                action: 'UPDATE',
                entity: 'User',
                entityId: userId,
                oldValues: { twoFactorEnabled: false },
                newValues: { twoFactorEnabled: true },
                request,
            })

            return NextResponse.json({
                success: true,
                message: '2FA berhasil diaktifkan',
                data: {
                    backupCodes, // Plain text — only shown once
                    backupCodesCount: backupCodes.length,
                },
            })
        }

        // Step 1: Generate new secret for setup
        const secret = generateSecret()
        const otpAuthUri = generateOtpAuthUri(secret, user.email || 'user@qalcuity.com')

        return NextResponse.json({
            success: true,
            data: {
                secret,
                otpAuthUri,
                manualEntryKey: secret,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/settings/security/2fa — Disable 2FA
 * 
 * Requires password verification before disabling.
 * 
 * Body: { password: string }
 */
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const body = await request.json()

        const validation = disable2faSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const { password } = validation.data

        // Get user with password hash
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                passwordHash: true,
                twoFactorEnabled: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        if (!user.twoFactorEnabled) {
            return NextResponse.json(
                { success: false, error: '2FA belum aktif' },
                { status: 400 }
            )
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, error: 'Password salah' },
                { status: 400 }
            )
        }

        // Disable 2FA
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: null,
            },
        })

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'User',
            entityId: userId,
            oldValues: { twoFactorEnabled: true },
            newValues: { twoFactorEnabled: false },
            request,
        })

        return NextResponse.json({
            success: true,
            message: '2FA berhasil dinonaktifkan',
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
