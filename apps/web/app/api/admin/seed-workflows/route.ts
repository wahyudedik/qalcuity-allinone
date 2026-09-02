/**
 * POST /api/admin/seed-workflows
 *
 * Seed default workflow definitions untuk semua tenants yang belum punya.
 * Hanya SUPERADMIN yang bisa akses.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { DEFAULT_WORKFLOWS } from '@qalcuity/workflow';

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, role } = auth;

        if (role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya SUPERADMIN yang bisa seed workflows' },
                { status: 403 }
            );
        }

        // Get all tenants
        const tenants = await prisma.tenant.findMany({
            select: { id: true, name: true },
        });

        let seeded = 0;
        let skipped = 0;
        let totalWorkflowsCreated = 0;

        for (const tenant of tenants) {
            // Check if tenant already has workflow definitions
            const existing = await prisma.workflowDefinition.count({
                where: { tenantId: tenant.id },
            });

            if (existing > 0) {
                skipped++;
                continue;
            }

            // Create default workflows for this tenant
            const workflows = Object.entries(DEFAULT_WORKFLOWS).map(
                ([entityType, config]) => ({
                    tenantId: tenant.id,
                    entityType: entityType.toUpperCase(),
                    name: `${entityType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} Workflow`,
                    description: null,
                    config: JSON.parse(JSON.stringify(config)),
                    isSystem: true,
                    isActive: true,
                })
            );

            await prisma.workflowDefinition.createMany({ data: workflows });
            seeded++;
            totalWorkflowsCreated += workflows.length;
        }

        return NextResponse.json({
            success: true,
            data: {
                tenantsProcessed: tenants.length,
                seeded,
                skipped,
                workflowsPerTenant: Object.keys(DEFAULT_WORKFLOWS).length,
                totalWorkflowsCreated,
            },
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
