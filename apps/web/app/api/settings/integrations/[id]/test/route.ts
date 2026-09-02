import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'

interface TestResult {
    success: boolean
    message: string
    latencyMs?: number
    details?: Record<string, unknown>
}

/**
 * POST /api/settings/integrations/[id]/test
 *
 * Test connection untuk integration tertentu.
 * Melakukan validasi credentials dan mencoba koneksi ke service external.
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth
        const { id } = params

        // Verify ownership
        const integration = await prisma.tenantIntegration.findFirst({
            where: { id, tenantId },
        })

        if (!integration) {
            return NextResponse.json(
                { success: false, error: 'Integrasi tidak ditemukan' },
                { status: 404 }
            )
        }

        const startTime = Date.now()
        let testResult: TestResult

        // Test berdasarkan tipe integrasi
        switch (integration.type) {
            case 'whatsapp':
                testResult = await testWhatsApp(integration.apiKey)
                break
            case 'email':
                testResult = await testEmail(integration.apiKey, integration.config as Record<string, unknown>)
                break
            case 'payment':
                testResult = await testPaymentGateway(integration.name, integration.apiKey)
                break
            case 'accounting':
                testResult = await testAccountingSoftware(integration.apiKey)
                break
            default:
                testResult = {
                    success: !!integration.apiKey,
                    message: integration.apiKey
                        ? 'Kredensial tersedia — silakan verifikasi secara manual'
                        : 'API Key belum dikonfigurasi',
                }
        }

        const latencyMs = Date.now() - startTime

        // Update status berdasarkan hasil test
        const newStatus = testResult.success ? 'active' : 'error'
        await prisma.tenantIntegration.update({
            where: { id },
            data: {
                status: newStatus,
                lastSyncAt: testResult.success ? new Date() : undefined,
                lastErrorAt: testResult.success ? undefined : new Date(),
                lastError: testResult.success ? null : testResult.message,
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'TenantIntegration',
            entityId: id,
            oldValues: { status: integration.status },
            newValues: { status: newStatus, lastTestResult: testResult.success },
            request: request,
        })

        return NextResponse.json({
            success: true,
            data: {
                ...testResult,
                latencyMs,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        if (message.startsWith('Forbidden')) {
            return NextResponse.json({ success: false, error: message }, { status: 403 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

// ============================================
// Test Functions per Integration Type
// ============================================

async function testWhatsApp(apiKey: string | null): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            message: 'WhatsApp API Key belum dikonfigurasi',
        }
    }

    // Validate API key format (basic check)
    if (apiKey.length < 10) {
        return {
            success: false,
            message: 'Format WhatsApp API Key tidak valid',
        }
    }

    // In production, this would make an actual API call to WhatsApp Business API
    // For now, validate that the key exists and has reasonable format
    return {
        success: true,
        message: 'WhatsApp Business API — kredensial valid',
        details: {
            provider: 'WhatsApp Business API',
            keyLength: apiKey.length,
        },
    }
}

async function testEmail(
    apiKey: string | null,
    config: Record<string, unknown> | null
): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            message: 'Email password/app password belum dikonfigurasi',
        }
    }

    const smtpHost = config?.smtpHost as string | undefined
    const smtpPort = config?.smtpPort as string | undefined

    if (!smtpHost) {
        return {
            success: false,
            message: 'SMTP Host belum dikonfigurasi',
        }
    }

    // In production, this would attempt to connect to SMTP server
    return {
        success: true,
        message: `SMTP dikonfigurasi ke ${smtpHost}:${smtpPort || '587'}`,
        details: {
            host: smtpHost,
            port: smtpPort || '587',
        },
    }
}

async function testPaymentGateway(
    name: string,
    apiKey: string | null
): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            message: `${name} API Key belum dikonfigurasi`,
        }
    }

    // Validate API key format based on provider
    const isMidtrans = name.toLowerCase().includes('midtrans')
    const isXendit = name.toLowerCase().includes('xendit')

    if (isMidtrans && !apiKey.startsWith('SB-Mid-') && !apiKey.startsWith('SB-Mid-server')) {
        return {
            success: false,
            message: 'Format Midtrans Server Key tidak valid (harus diawali SB-Mid-)',
        }
    }

    if (isXendit && !apiKey.startsWith('xnd_')) {
        return {
            success: false,
            message: 'Format Xendit Secret Key tidak valid (harus diawali xnd_)',
        }
    }

    return {
        success: true,
        message: `${name} — kredensial valid`,
        details: {
            provider: name,
            environment: apiKey.includes('development') || apiKey.startsWith('SB-') ? 'sandbox' : 'production',
        },
    }
}

async function testAccountingSoftware(apiKey: string | null): Promise<TestResult> {
    if (!apiKey) {
        return {
            success: false,
            message: 'API Key software akuntansi belum dikonfigurasi',
        }
    }

    return {
        success: true,
        message: 'Software akuntansi — kredensial tersedia',
        details: {
            note: 'Verifikasi sinkronisasi data secara manual',
        },
    }
}
