import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireMutateAuth } from '@/lib/session'
import { logAudit } from '@/lib/audit'

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

export async function GET() {
    try {
        const { tenantId } = await requireAuth()

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        })

        if (!tenant) {
            return NextResponse.json(
                { success: false, error: 'Tenant not found' },
                { status: 404 }
            )
        }

        let settings: Record<string, unknown> = {}
        try {
            settings = JSON.parse(String(tenant.settings || '{}'))
        } catch {
            settings = {}
        }

        const notifications = (settings.notifications as NotificationPreferences) || defaultPreferences

        return NextResponse.json({
            success: true,
            data: { ...defaultPreferences, ...notifications },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const { userId, tenantId } = await requireMutateAuth()
        const body = await request.json()

        // Get current settings
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        })

        let currentSettings: Record<string, unknown> = {}
        try {
            currentSettings = JSON.parse(String(tenant?.settings || '{}'))
        } catch {
            currentSettings = {}
        }

        const currentNotifications = (currentSettings.notifications as Record<string, unknown>) || {}

        // Merge with new values (only accept known boolean keys)
        // Start from defaults, overlay current stored values, then apply body overrides
        const newNotifications: Record<string, boolean> = { ...defaultPreferences }
        for (const key of Object.keys(defaultPreferences)) {
            if (typeof currentNotifications[key] === 'boolean') {
                newNotifications[key] = currentNotifications[key] as boolean
            }
        }
        const validKeys = Object.keys(defaultPreferences)
        for (const key of validKeys) {
            if (typeof body[key] === 'boolean') {
                newNotifications[key] = body[key]
            }
        }

        currentSettings.notifications = newNotifications

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: { settings: JSON.stringify(currentSettings) },
            select: { settings: true },
        })

        let updatedSettings: Record<string, unknown> = {}
        try {
            updatedSettings = JSON.parse(String(updatedTenant.settings || '{}'))
        } catch {
            updatedSettings = {}
        }

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Tenant',
            entityId: tenantId,
            oldValues: { notifications: currentNotifications },
            newValues: { notifications: newNotifications },
        })

        return NextResponse.json({
            success: true,
            data: (updatedSettings.notifications as NotificationPreferences) || defaultPreferences,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
