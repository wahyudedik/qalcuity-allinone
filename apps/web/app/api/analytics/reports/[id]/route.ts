// ============================================
// Saved Report Detail API — GET, PUT, DELETE
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ============================================
// TYPES
// ============================================

interface UpdateReportBody {
    name?: string
    description?: string
    type?: string
    config?: Record<string, unknown>
    tags?: string[]
    folder?: string | null
    isStarred?: boolean
}

// ============================================
// GET — Report detail
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        const report = await prisma.savedReport.findFirst({
            where: { id, tenantId },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
                schedules: true,
                executions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        })

        if (!report) {
            return NextResponse.json(
                { success: false, error: 'Report not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                id: report.id,
                name: report.name,
                description: report.description,
                type: report.type,
                config: report.config,
                tags: report.tags,
                folder: report.folder,
                isStarred: report.isStarred,
                lastRunAt: report.lastRunAt?.toISOString() || null,
                createdAt: report.createdAt.toISOString(),
                updatedAt: report.updatedAt.toISOString(),
                owner: {
                    id: report.owner.id,
                    name: report.owner.name,
                },
                schedules: report.schedules.map((s) => ({
                    id: s.id,
                    name: s.name,
                    frequency: s.frequency,
                    isActive: s.isActive,
                    time: s.time,
                    outputFormats: s.outputFormats,
                    recipients: s.recipients,
                    lastExecutedAt: s.lastExecutedAt?.toISOString() || null,
                    nextExecutionAt: s.nextExecutionAt?.toISOString() || null,
                })),
                executions: report.executions.map((e) => ({
                    id: e.id,
                    executedBy: e.executedBy,
                    status: e.status,
                    rowcount: e.rowcount,
                    durationMs: e.durationMs,
                    createdAt: e.createdAt.toISOString(),
                })),
            },
        })
    } catch (error) {
        console.error('[Report Detail Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// PUT — Update report
// ============================================

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params
        const body: UpdateReportBody = await request.json()

        // Check report exists and belongs to tenant
        const existing = await prisma.savedReport.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Report not found' },
                { status: 404 }
            )
        }

        // Validate type if provided
        if (body.type) {
            const validTypes = ['report', 'chart', 'pivot', 'query', 'dashboard']
            if (!validTypes.includes(body.type)) {
                return NextResponse.json(
                    { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        const updateData: Record<string, unknown> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.type !== undefined) updateData.type = body.type
        if (body.config !== undefined) updateData.config = body.config as Prisma.InputJsonValue
        if (body.tags !== undefined) updateData.tags = body.tags
        if (body.folder !== undefined) updateData.folder = body.folder
        if (body.isStarred !== undefined) updateData.isStarred = body.isStarred

        const updated = await prisma.savedReport.update({
            where: { id },
            data: updateData,
            include: {
                owner: {
                    select: { id: true, name: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                description: updated.description,
                type: updated.type,
                config: updated.config,
                tags: updated.tags,
                folder: updated.folder,
                isStarred: updated.isStarred,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
                owner: {
                    id: updated.owner.id,
                    name: updated.owner.name,
                },
            },
        })
    } catch (error) {
        console.error('[Report Update Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// ============================================
// DELETE — Delete report
// ============================================

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        // Check report exists and belongs to tenant
        const existing = await prisma.savedReport.findFirst({
            where: { id, tenantId },
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Report not found' },
                { status: 404 }
            )
        }

        // Delete associated records first
        await prisma.savedReportExecution.deleteMany({ where: { reportId: id } })
        await prisma.scheduledReport.deleteMany({ where: { reportId: id } })

        // Delete report
        await prisma.savedReport.delete({ where: { id } })

        return NextResponse.json({
            success: true,
            data: { message: 'Report deleted successfully' },
        })
    } catch (error) {
        console.error('[Report Delete Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
