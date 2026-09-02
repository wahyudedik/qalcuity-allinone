import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { updateNotificationPreferencesSchema, formatZodError } from '@/lib/validation-schemas'

interface NotificationPreferences {
    emailInvoice: boolean
    emailPayment: boolean
    emailOverdue: boolean
    emailWeeklyReport: boolean
    emailMarketing: boolean
    pushInvoice: boolean
    pushPayment: boolean
    pushOverdue: boolean
    pushMention: boolean
    whatsappInvoice: boolean
    whatsappPayment: boolean
    whatsappOverdue: boolean
    smsOverdue: boolean
    smsPayment: boolean
}

const defaultPreferences: NotificationPreferences = {
    emailInvoice: true,
    emailPayment: true,
    emailOverdue: true,
    emailWeeklyReport: true,
    emailMarketing: false,
    pushInvoice: true,
    pushPayment: true,
    pushOverdue: true,
    pushMention: true,
    whatsappInvoice: true,
    whatsappPayment: true,
    whatsappOverdue: false,
    smsOverdue: false,
    smsPayment: false,
}

/**
 * GET /api/settings/notifications
 *
 * Ambil notification settings dari database (TenantNotificationSettings).
 * Jika belum ada record, return defaults dan buat record baru.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth

        let settings = await prisma.tenantNotificationSettings.findUnique({
            where: { tenantId },
        })

        // Auto-create with defaults if not exists
        if (!settings) {
            settings = await prisma.tenantNotificationSettings.create({
                data: { tenantId },
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                emailInvoice: settings.emailInvoice,
                emailPayment: settings.emailPayment,
                emailOverdue: settings.emailOverdue,
                emailWeeklyReport: settings.emailWeeklyReport,
                emailMarketing: settings.emailMarketing,
                pushInvoice: settings.pushInvoice,
                pushPayment: settings.pushPayment,
                pushOverdue: settings.pushOverdue,
                pushMention: settings.pushMention,
                whatsappInvoice: settings.whatsappInvoice,
                whatsappPayment: settings.whatsappPayment,
                whatsappOverdue: settings.whatsappOverdue,
                smsOverdue: settings.smsOverdue,
                smsPayment: settings.smsPayment,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * PUT /api/settings/notifications
 *
 * Update notification settings di database.
 */
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body = await request.json()

        const validation = updateNotificationPreferencesSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        // Get current settings for audit trail
        const currentSettings = await prisma.tenantNotificationSettings.findUnique({
            where: { tenantId },
        })

        const oldValues = currentSettings
            ? {
                emailInvoice: currentSettings.emailInvoice,
                emailPayment: currentSettings.emailPayment,
                emailOverdue: currentSettings.emailOverdue,
                emailWeeklyReport: currentSettings.emailWeeklyReport,
                emailMarketing: currentSettings.emailMarketing,
                pushInvoice: currentSettings.pushInvoice,
                pushPayment: currentSettings.pushPayment,
                pushOverdue: currentSettings.pushOverdue,
                pushMention: currentSettings.pushMention,
                whatsappInvoice: currentSettings.whatsappInvoice,
                whatsappPayment: currentSettings.whatsappPayment,
                whatsappOverdue: currentSettings.whatsappOverdue,
                smsOverdue: currentSettings.smsOverdue,
                smsPayment: currentSettings.smsPayment,
            }
            : defaultPreferences

        // Build update data from validated body (only boolean fields)
        const updateData: Record<string, boolean> = {}
        const validKeys = Object.keys(defaultPreferences) as (keyof NotificationPreferences)[]
        for (const key of validKeys) {
            if (typeof validation.data[key] === 'boolean') {
                updateData[key] = validation.data[key]!
            }
        }

        // Upsert notification settings
        const updated = await prisma.tenantNotificationSettings.upsert({
            where: { tenantId },
            create: { tenantId, ...updateData },
            update: updateData,
        })

        const newData = {
            emailInvoice: updated.emailInvoice,
            emailPayment: updated.emailPayment,
            emailOverdue: updated.emailOverdue,
            emailWeeklyReport: updated.emailWeeklyReport,
            emailMarketing: updated.emailMarketing,
            pushInvoice: updated.pushInvoice,
            pushPayment: updated.pushPayment,
            pushOverdue: updated.pushOverdue,
            pushMention: updated.pushMention,
            whatsappInvoice: updated.whatsappInvoice,
            whatsappPayment: updated.whatsappPayment,
            whatsappOverdue: updated.whatsappOverdue,
            smsOverdue: updated.smsOverdue,
            smsPayment: updated.smsPayment,
        }

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'TenantNotificationSettings',
            entityId: updated.id,
            oldValues: oldValues as unknown as Record<string, unknown>,
            newValues: newData as unknown as Record<string, unknown>,
            request,
        })

        return NextResponse.json({
            success: true,
            data: newData,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
