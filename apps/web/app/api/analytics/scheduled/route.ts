// ============================================
// Scheduled Queries API — GET (list), POST (create)
// Scheduled query management
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ============================================
// TYPES
// ============================================

interface CreateScheduledQueryBody {
    name: string
    description?: string
    queryHistoryId: string
    datasetId?: string
    cronExpression: string
    frequency: string
    timeOfDay?: string
    outputFormat?: string
    recipients?: string[]
    alertOnFailure?: boolean
    alertOnAnomaly?: boolean
}

// ============================================
// GET — List scheduled queries for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:scheduled:route:GET:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const isActive = searchParams.get('isActive')
        const frequency = searchParams.get('frequency')

        const where: Record<string, unknown> = { tenantId }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        if (frequency) {
            where.frequency = frequency
        }

        const scheduled = await prisma.scheduledQuery.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        const enrichedScheduled = scheduled.map(sq => ({
            id: sq.id,
            name: sq.name,
            description: sq.description,
            queryHistoryId: sq.queryHistoryId,
            datasetId: sq.datasetId,
            cronExpression: sq.cronExpression,
            frequency: sq.frequency,
            timeOfDay: sq.timeOfDay,
            outputFormat: sq.outputFormat,
            recipients: sq.recipients,
            alertOnFailure: sq.alertOnFailure,
            alertOnAnomaly: sq.alertOnAnomaly,
            isActive: sq.isActive,
            lastRunAt: sq.lastRunAt?.toISOString() ?? null,
            nextRunAt: sq.nextRunAt?.toISOString() ?? null,
            lastRunStatus: sq.lastRunStatus,
            runCount: sq.runCount,
            ownerId: sq.ownerId,
            createdAt: sq.createdAt.toISOString(),
            updatedAt: sq.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedScheduled })
    } catch (error) {
        console.error('[Scheduled Queries List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create scheduled query
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:scheduled:route:POST:${ip}`, 60, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const body: CreateScheduledQueryBody = await request.json()

        // Validate required fields
        if (!body.name || !body.queryHistoryId || !body.cronExpression || !body.frequency) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, queryHistoryId, cronExpression, frequency' },
                { status: 400 }
            )
        }

        // Validate frequency
        const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']
        if (!validFrequencies.includes(body.frequency)) {
            return NextResponse.json(
                { success: false, error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate outputFormat
        const validOutputFormats = ['EMAIL', 'PDF', 'EXCEL', 'CSV', 'SLACK']
        const outputFormat = body.outputFormat || 'EMAIL'
        if (!validOutputFormats.includes(outputFormat)) {
            return NextResponse.json(
                { success: false, error: `Invalid outputFormat. Must be one of: ${validOutputFormats.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate timeOfDay format if provided
        const timeOfDay = body.timeOfDay || '08:00'
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
        if (!timeRegex.test(timeOfDay)) {
            return NextResponse.json(
                { success: false, error: 'Invalid timeOfDay format. Must be HH:MM (24-hour)' },
                { status: 400 }
            )
        }

        const scheduled = await prisma.scheduledQuery.create({
            data: {
                name: body.name,
                description: body.description || null,
                queryHistoryId: body.queryHistoryId,
                datasetId: body.datasetId || null,
                cronExpression: body.cronExpression,
                frequency: body.frequency,
                timeOfDay,
                outputFormat,
                recipients: body.recipients ?? [],
                alertOnFailure: body.alertOnFailure ?? true,
                alertOnAnomaly: body.alertOnAnomaly ?? false,
                ownerId: userId,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: scheduled.id,
                name: scheduled.name,
                description: scheduled.description,
                queryHistoryId: scheduled.queryHistoryId,
                datasetId: scheduled.datasetId,
                cronExpression: scheduled.cronExpression,
                frequency: scheduled.frequency,
                timeOfDay: scheduled.timeOfDay,
                outputFormat: scheduled.outputFormat,
                recipients: scheduled.recipients,
                alertOnFailure: scheduled.alertOnFailure,
                alertOnAnomaly: scheduled.alertOnAnomaly,
                isActive: scheduled.isActive,
                lastRunAt: scheduled.lastRunAt?.toISOString() ?? null,
                nextRunAt: scheduled.nextRunAt?.toISOString() ?? null,
                lastRunStatus: scheduled.lastRunStatus,
                runCount: scheduled.runCount,
                ownerId: scheduled.ownerId,
                createdAt: scheduled.createdAt.toISOString(),
                updatedAt: scheduled.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[Scheduled Queries Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
