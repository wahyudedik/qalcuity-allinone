import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { createIntegrationSchema, updateIntegrationSchema, formatZodError } from '@/lib/validation-schemas'
import { sanitizeObject } from '@/lib/sanitize'

/**
 * GET /api/settings/integrations
 *
 * Ambil semua integrations dari database untuk tenant yang sedang login.
 * Jika tidak ada record, return status berdasarkan environment variables.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth

        // Ambil integrations dari database
        const dbIntegrations = await prisma.tenantIntegration.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
        })

        // Jika sudah ada data di DB, gunakan itu
        if (dbIntegrations.length > 0) {
            const integrations = dbIntegrations.map((item: typeof dbIntegrations[number]) => ({
                id: item.id,
                type: item.type,
                name: item.name,
                status: item.status,
                config: item.config,
                hasApiKey: !!item.apiKey,
                hasApiSecret: !!item.apiSecret,
                webhookUrl: item.webhookUrl,
                lastSyncAt: item.lastSyncAt?.toISOString() || null,
                lastErrorAt: item.lastErrorAt?.toISOString() || null,
                lastError: item.lastError,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString(),
            }))

            return NextResponse.json({ success: true, data: integrations })
        }

        // Fallback: return status berdasarkan env vars (backward compatibility)
        const envIntegrations = {
            whatsapp: !!process.env.WHATSAPP_API_KEY,
            email: !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS,
            midtrans: !!process.env.MIDTRANS_SERVER_KEY,
            xendit: !!process.env.XENDIT_SECRET_KEY,
            ai: !!process.env.AI_API_KEY && process.env.AI_PROVIDER !== 'mock',
            payment: !!process.env.MIDTRANS_SERVER_KEY || !!process.env.XENDIT_SECRET_KEY,
        }

        return NextResponse.json({
            success: true,
            data: [],
            envStatus: envIntegrations,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * POST /api/settings/integrations
 *
 * Tambah integration baru untuk tenant.
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body = await request.json()
        const sanitizedBody = sanitizeObject(body)

        const validation = createIntegrationSchema.safeParse(sanitizedBody)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const { type, name, config, apiKey, apiSecret, webhookUrl } = validation.data

        // Check uniqueness
        const existing = await prisma.tenantIntegration.findUnique({
            where: { tenantId_type_name: { tenantId, type, name } },
        })

        if (existing) {
            return NextResponse.json(
                { success: false, error: `Integrasi "${name}" sudah ada untuk tipe "${type}"` },
                { status: 409 }
            )
        }

        const integration = await prisma.tenantIntegration.create({
            data: {
                tenantId,
                type,
                name,
                config: (config || {}) as Prisma.InputJsonValue,
                apiKey: apiKey || null,
                apiSecret: apiSecret || null,
                webhookUrl: webhookUrl || null,
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'TenantIntegration',
            entityId: integration.id,
            newValues: { type, name },
            request,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: integration.id,
                type: integration.type,
                name: integration.name,
                status: integration.status,
                config: integration.config,
                hasApiKey: !!integration.apiKey,
                hasApiSecret: !!integration.apiSecret,
                webhookUrl: integration.webhookUrl,
                createdAt: integration.createdAt.toISOString(),
                updatedAt: integration.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * PUT /api/settings/integrations
 *
 * Update integration yang sudah ada. Body harus menyertakan `id`.
 */
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body = await request.json()
        const sanitizedBody = sanitizeObject(body)

        const validation = updateIntegrationSchema.safeParse(sanitizedBody)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const { id, ...updateData } = validation.data

        // Verify ownership
        const existing = await prisma.tenantIntegration.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Integrasi tidak ditemukan' },
                { status: 404 }
            )
        }

        const updated = await prisma.tenantIntegration.update({
            where: { id },
            data: {
                ...(updateData.status !== undefined && { status: updateData.status }),
                ...(updateData.config !== undefined && { config: updateData.config as Prisma.InputJsonValue }),
                ...(updateData.apiKey !== undefined && { apiKey: updateData.apiKey || null }),
                ...(updateData.apiSecret !== undefined && { apiSecret: updateData.apiSecret || null }),
                ...(updateData.webhookUrl !== undefined && { webhookUrl: updateData.webhookUrl || null }),
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'TenantIntegration',
            entityId: updated.id,
            oldValues: { status: existing.status },
            newValues: { status: updated.status },
            request,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                type: updated.type,
                name: updated.name,
                status: updated.status,
                config: updated.config,
                hasApiKey: !!updated.apiKey,
                hasApiSecret: !!updated.apiSecret,
                webhookUrl: updated.webhookUrl,
                lastSyncAt: updated.lastSyncAt?.toISOString() || null,
                lastErrorAt: updated.lastErrorAt?.toISOString() || null,
                lastError: updated.lastError,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/settings/integrations
 *
 * Hapus integration. Body harus menyertakan `id`.
 */
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body = await request.json()

        const { id } = body as { id?: string }
        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'ID integrasi wajib diisi' },
                { status: 400 }
            )
        }

        // Verify ownership
        const existing = await prisma.tenantIntegration.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Integrasi tidak ditemukan' },
                { status: 404 }
            )
        }

        await prisma.tenantIntegration.delete({ where: { id } })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'TenantIntegration',
            entityId: id,
            oldValues: { type: existing.type, name: existing.name },
            request,
        })

        return NextResponse.json({ success: true, message: 'Integrasi berhasil dihapus' })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
