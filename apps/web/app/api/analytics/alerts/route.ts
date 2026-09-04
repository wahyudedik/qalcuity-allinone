// ============================================
// Alert Rules API — GET (list), POST (create)
// CRUD for alert rules
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ============================================
// TYPES
// ============================================

interface CreateAlertBody {
    name: string
    description?: string
    metricId: string
    condition: string
    threshold: number
    severity?: string
    notificationChannels?: string[]
    recipients?: string[]
    cooldownMinutes?: number
}

// ============================================
// GET — List alert rules for tenant
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:${ip}`, 60, 60000)
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

        const where: Prisma.AlertRuleWhereInput = { tenantId }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true'
        }

        const rules = await prisma.alertRule.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { triggers: true },
                },
            },
        })

        const enrichedRules = rules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            metricId: rule.metricId,
            condition: rule.condition,
            threshold: Number(rule.threshold),
            severity: rule.severity,
            notificationChannels: rule.notificationChannels,
            recipients: rule.recipients,
            cooldownMinutes: rule.cooldownMinutes,
            isActive: rule.isActive,
            lastTriggeredAt: rule.lastTriggeredAt?.toISOString() || null,
            triggerCount: rule._count.triggers,
            createdAt: rule.createdAt.toISOString(),
            updatedAt: rule.updatedAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data: enrichedRules })
    } catch (error) {
        console.error('[Alert Rules List Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// POST — Create alert rule
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rateLimitResult = checkRateLimit(`api:analytics:alerts:POST:${ip}`, 30, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const body: CreateAlertBody = await request.json()

        // Validate required fields
        if (!body.name || !body.metricId || !body.condition || body.threshold === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, metricId, condition, threshold' },
                { status: 400 }
            )
        }

        // Validate condition
        const validConditions = ['below', 'above', 'equals', 'not_equals', 'changes_by']
        if (!validConditions.includes(body.condition)) {
            return NextResponse.json(
                { success: false, error: `Invalid condition. Must be one of: ${validConditions.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate severity
        const validSeverities = ['low', 'medium', 'high', 'critical']
        const severity = body.severity || 'medium'
        if (!validSeverities.includes(severity)) {
            return NextResponse.json(
                { success: false, error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
                { status: 400 }
            )
        }

        const rule = await prisma.alertRule.create({
            data: {
                name: body.name,
                description: body.description,
                metricId: body.metricId,
                condition: body.condition,
                threshold: body.threshold,
                severity,
                notificationChannels: body.notificationChannels || ['in_app'],
                recipients: body.recipients || [],
                cooldownMinutes: body.cooldownMinutes || 60,
                tenantId,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: rule.id,
                name: rule.name,
                description: rule.description,
                metricId: rule.metricId,
                condition: rule.condition,
                threshold: Number(rule.threshold),
                severity: rule.severity,
                notificationChannels: rule.notificationChannels,
                recipients: rule.recipients,
                cooldownMinutes: rule.cooldownMinutes,
                isActive: rule.isActive,
                createdAt: rule.createdAt.toISOString(),
                updatedAt: rule.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error('[Alert Rule Create Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
