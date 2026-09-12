export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { handleApiError } from '@/lib/api-error'
import { updateSmtpConfigSchema } from '@/lib/validation-schemas'

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
                smtpPassword: integration.apiSecret ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : '',
                useTLS: config.useTLS !== false,
                isConfigured: true,
            },
        })
    } catch (error) {
        return handleApiError(error)
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

        // Validate input with Zod schema
        const validated = updateSmtpConfigSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT, code: 'VALIDATION_ERROR' },
                { status: 400 }
            )
        }

        const { smtpHost, smtpPort, smtpEmail, smtpPassword, useTLS } = validated.data

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
        if (smtpPassword && smtpPassword !== 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢') {
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
                smtpPassword: smtpPassword ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : '',
                useTLS: useTLS !== false,
                isConfigured: true,
            },
        })
    } catch (error) {
        return handleApiError(error)
    }
}
