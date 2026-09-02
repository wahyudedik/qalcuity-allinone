import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'

interface SmtpConfig {
    smtpHost: string
    smtpPort: string
    smtpEmail: string
    smtpPassword: string
    useTLS: boolean
}

/**
 * GET /api/settings/notifications/smtp
 *
 * Fetch SMTP configuration from TenantIntegration (type='email', name='smtp').
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth

        const integration = await prisma.tenantIntegration.findUnique({
            where: {
                tenantId_type_name: {
                    tenantId,
                    type: 'email',
                    name: 'smtp',
                },
            },
        })

        if (!integration) {
            return NextResponse.json({
                success: true,
                data: null,
            })
        }

        const config = integration.config as Record<string, unknown>

        return NextResponse.json({
            success: true,
            data: {
                smtpHost: (config.smtpHost as string) || '',
                smtpPort: (config.smtpPort as string) || '587',
                smtpEmail: (config.smtpEmail as string) || '',
                smtpPassword: integration.apiSecret ? '••••••••' : '',
                useTLS: config.useTLS !== false,
                isConfigured: true,
            },
        })
    } catch (error) {
        console.error('[SMTP GET Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/settings/notifications/smtp
 *
 * Save SMTP configuration to TenantIntegration.
 * Password is stored in apiSecret field (should be encrypted at rest in production).
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body = await request.json()

        const { smtpHost, smtpPort, smtpEmail, smtpPassword, useTLS } = body as SmtpConfig

        // Validate required fields
        if (!smtpHost || !smtpPort || !smtpEmail) {
            return NextResponse.json(
                { success: false, error: 'SMTP Host, Port, dan Email wajib diisi' },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(smtpEmail)) {
            return NextResponse.json(
                { success: false, error: 'Format email tidak valid' },
                { status: 400 }
            )
        }

        // Validate port
        const port = parseInt(smtpPort, 10)
        if (isNaN(port) || port < 1 || port > 65535) {
            return NextResponse.json(
                { success: false, error: 'Port harus antara 1-65535' },
                { status: 400 }
            )
        }

        // Get existing config for audit
        const existing = await prisma.tenantIntegration.findUnique({
            where: {
                tenantId_type_name: {
                    tenantId,
                    type: 'email',
                    name: 'smtp',
                },
            },
        })

        const configData = {
            smtpHost,
            smtpPort,
            smtpEmail,
            useTLS: useTLS !== false,
        }

        // Only update password if a new one is provided (not the mask)
        const updateData: Record<string, unknown> = {
            status: 'active',
            config: configData,
        }
        if (smtpPassword && smtpPassword !== '••••••••') {
            updateData.apiSecret = smtpPassword
        }

        // Upsert SMTP integration
        const integration = await prisma.tenantIntegration.upsert({
            where: {
                tenantId_type_name: {
                    tenantId,
                    type: 'email',
                    name: 'smtp',
                },
            },
            create: {
                tenantId,
                type: 'email',
                name: 'smtp',
                status: 'active',
                config: configData,
                apiSecret: smtpPassword || null,
            },
            update: updateData,
        })

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: existing ? 'UPDATE' : 'CREATE',
            entity: 'TenantIntegration',
            entityId: integration.id,
            oldValues: existing ? { config: existing.config } : undefined,
            newValues: { config: configData, hasPassword: !!smtpPassword },
            request,
        })

        return NextResponse.json({
            success: true,
            data: {
                smtpHost,
                smtpPort,
                smtpEmail,
                smtpPassword: smtpPassword ? '••••••••' : '',
                useTLS: useTLS !== false,
                isConfigured: true,
            },
        })
    } catch (error) {
        console.error('[SMTP POST Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
