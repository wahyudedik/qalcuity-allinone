import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { logAudit } from '@/lib/audit'

export async function GET() {
    try {
        const { userId } = await requireAuth()

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                        address: true,
                        phone: true,
                        email: true,
                        website: true,
                        settings: true,
                        createdAt: true,
                    },
                },
            },
        })

        if (!user?.tenant) {
            return NextResponse.json(
                { success: false, error: 'Tenant not found' },
                { status: 404 }
            )
        }

        const tenant = user.tenant
        let settings: Record<string, unknown> = {}
        try {
            settings = JSON.parse(tenant.settings)
        } catch {
            settings = {}
        }

        return NextResponse.json({
            success: true,
            data: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                logo: tenant.logo,
                address: tenant.address,
                phone: tenant.phone,
                email: tenant.email,
                website: tenant.website,
                npwp: (settings as Record<string, string>).npwp || '',
                city: (settings as Record<string, string>).city || '',
                province: (settings as Record<string, string>).province || '',
                postalCode: (settings as Record<string, string>).postalCode || '',
                country: (settings as Record<string, string>).country || 'Indonesia',
                branding: (settings as Record<string, unknown>).branding || {},
                createdAt: tenant.createdAt.toISOString(),
            },
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
        const { userId, tenantId } = await requireAuth()
        const body = await request.json()

        // Get current tenant data for audit
        const currentTenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, email: true, phone: true, address: true, website: true, settings: true },
        })

        const updateData: Record<string, unknown> = {}
        if (typeof body.name === 'string' && body.name.trim()) {
            updateData.name = body.name.trim()
        }
        if (typeof body.email === 'string') {
            updateData.email = body.email.trim() || null
        }
        if (typeof body.phone === 'string') {
            updateData.phone = body.phone.trim() || null
        }
        if (typeof body.address === 'string') {
            updateData.address = body.address.trim() || null
        }
        if (typeof body.website === 'string') {
            updateData.website = body.website.trim() || null
        }
        if (typeof body.logo === 'string') {
            updateData.logo = body.logo.trim() || null
        }

        // Parse and update settings JSON for npwp, city, province, postalCode, country, branding
        let currentSettings: Record<string, unknown> = {}
        try {
            currentSettings = JSON.parse(currentTenant?.settings || '{}')
        } catch {
            currentSettings = {}
        }

        const newSettings = { ...currentSettings }
        if (typeof body.npwp === 'string') (newSettings as Record<string, string>).npwp = body.npwp
        if (typeof body.city === 'string') (newSettings as Record<string, string>).city = body.city
        if (typeof body.province === 'string') (newSettings as Record<string, string>).province = body.province
        if (typeof body.postalCode === 'string') (newSettings as Record<string, string>).postalCode = body.postalCode
        if (typeof body.country === 'string') (newSettings as Record<string, string>).country = body.country
        if (body.branding && typeof body.branding === 'object') {
            newSettings.branding = body.branding
        }

        updateData.settings = JSON.stringify(newSettings)

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid fields to update' },
                { status: 400 }
            )
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                website: true,
                logo: true,
                settings: true,
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Tenant',
            entityId: tenantId,
            oldValues: currentTenant as unknown as Record<string, unknown>,
            newValues: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                ...updatedTenant,
                settings: JSON.parse(updatedTenant.settings),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
