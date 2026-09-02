import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { updateCompanySettingsSchema, formatZodError } from '@/lib/validation-schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId } = auth
        // Rate limiting (using tenant-based key since no request param)
        const rateLimitResult = checkRateLimit(`api:settings:company:${userId}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }

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
            settings = JSON.parse(String(tenant.settings || '{}'))
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
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:settings:company:PUT:${ip}`, 30, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 })
        }

        const body = await request.json()

        // Validasi input dengan Zod schema
        const validation = updateCompanySettingsSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const validatedData = validation.data

        // Get current tenant data for audit
        const currentTenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, email: true, phone: true, address: true, website: true, settings: true },
        })

        const updateData: Record<string, unknown> = {}
        if (validatedData.name !== undefined) {
            updateData.name = validatedData.name.trim()
        }
        if (validatedData.email !== undefined) {
            updateData.email = validatedData.email?.trim() || null
        }
        if (validatedData.phone !== undefined) {
            updateData.phone = validatedData.phone?.trim() || null
        }
        if (validatedData.address !== undefined) {
            updateData.address = validatedData.address?.trim() || null
        }
        if (validatedData.website !== undefined) {
            updateData.website = validatedData.website?.trim() || null
        }
        if (validatedData.logo !== undefined) {
            updateData.logo = validatedData.logo?.trim() || null
        }

        // Parse and update settings JSON for npwp, city, province, postalCode, country, branding
        let currentSettings: Record<string, unknown> = {}
        try {
            currentSettings = JSON.parse(String(currentTenant?.settings || '{}'))
        } catch {
            currentSettings = {}
        }

        const newSettings = { ...currentSettings }
        if (validatedData.npwp !== undefined) (newSettings as Record<string, string>).npwp = validatedData.npwp
        if (validatedData.city !== undefined) (newSettings as Record<string, string>).city = validatedData.city
        if (validatedData.province !== undefined) (newSettings as Record<string, string>).province = validatedData.province
        if (validatedData.postalCode !== undefined) (newSettings as Record<string, string>).postalCode = validatedData.postalCode
        if (validatedData.country !== undefined) (newSettings as Record<string, string>).country = validatedData.country
        if (validatedData.branding !== undefined) {
            newSettings.branding = validatedData.branding
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
                settings: JSON.parse(String(updatedTenant.settings || '{}')),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
