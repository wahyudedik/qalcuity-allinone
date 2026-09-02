import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { createConnection } from 'net'
import tls from 'tls'

interface SmtpTestRequest {
    smtpHost: string
    smtpPort: string
    smtpEmail: string
    smtpPassword: string
    useTLS: boolean
}

/**
 * POST /api/settings/notifications/smtp/test
 *
 * Test SMTP connection by:
 * 1. Validating config format
 * 2. Attempting TCP/TLS connection to the SMTP server
 * 3. Returning connection result
 *
 * Note: This tests connectivity only, not full SMTP authentication.
 * Full email sending requires a mail transport library (e.g., nodemailer).
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth
        const body = await request.json()

        const { smtpHost, smtpPort, smtpEmail, useTLS } = body as SmtpTestRequest

        // Validate required fields
        if (!smtpHost || !smtpPort || !smtpEmail) {
            return NextResponse.json(
                { success: false, error: 'SMTP Host, Port, dan Email wajib diisi untuk test' },
                { status: 400 }
            )
        }

        const port = parseInt(smtpPort, 10)
        if (isNaN(port) || port < 1 || port > 65535) {
            return NextResponse.json(
                { success: false, error: 'Port tidak valid' },
                { status: 400 }
            )
        }

        // Attempt connection test with timeout
        const connectionResult = await new Promise<{ success: boolean; message: string }>((resolve) => {
            const timeout = 5000 // 5 second timeout
            let resolved = false

            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true
                    resolve({
                        success: false,
                        message: `Koneksi ke ${smtpHost}:${port} timeout. Pastikan host dan port benar.`,
                    })
                }
            }, timeout)

            if (useTLS || port === 465) {
                // TLS connection
                const socket = tls.connect(
                    {
                        host: smtpHost,
                        port,
                        rejectUnauthorized: false, // Allow self-signed certs for testing
                    },
                    () => {
                        if (!resolved) {
                            resolved = true
                            clearTimeout(timer)
                            socket.destroy()
                            resolve({
                                success: true,
                                message: `Berhasil terhubung ke ${smtpHost}:${port} (TLS)`,
                            })
                        }
                    }
                )

                socket.on('error', (err: Error) => {
                    if (!resolved) {
                        resolved = true
                        clearTimeout(timer)
                        resolve({
                            success: false,
                            message: `Gagal terhubung ke ${smtpHost}:${port}: ${err.message}`,
                        })
                    }
                })
            } else {
                // Plain TCP connection
                const socket = createConnection({ host: smtpHost, port }, () => {
                    if (!resolved) {
                        resolved = true
                        clearTimeout(timer)
                        socket.destroy()
                        resolve({
                            success: true,
                            message: `Berhasil terhubung ke ${smtpHost}:${port} (TCP)`,
                        })
                    }
                })

                socket.on('error', (err: Error) => {
                    if (!resolved) {
                        resolved = true
                        clearTimeout(timer)
                        resolve({
                            success: false,
                            message: `Gagal terhubung ke ${smtpHost}:${port}: ${err.message}`,
                        })
                    }
                })
            }
        })

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'TEST',
            entity: 'TenantIntegration',
            entityId: 'smtp',
            oldValues: { host: smtpHost, port: smtpPort },
            newValues: { success: connectionResult.success, message: connectionResult.message },
            request,
        })

        if (connectionResult.success) {
            return NextResponse.json({
                success: true,
                data: {
                    connected: true,
                    message: connectionResult.message,
                },
            })
        } else {
            return NextResponse.json({
                success: false,
                error: connectionResult.message,
            })
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
