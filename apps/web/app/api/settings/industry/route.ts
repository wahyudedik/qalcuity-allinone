import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateIndustryConfigSchema, formatZodError } from '@/lib/validation-schemas';
import { DEFAULT_INDUSTRY_CONFIGS, type IndustryType } from '@qalcuity/industry-config';
import { getTenantIndustryConfig } from '@/lib/industry-config';
import { sanitizeObject } from '@/lib/sanitize';

// ─── GET /api/settings/industry ──────────────────────────────────────────────

/**
 * Dapatkan industry config untuk tenant saat ini.
 * Mengembalikan config yang sudah di-merge (defaults + tenant overrides).
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        const config = await getTenantIndustryConfig(tenantId);

        // Get custom fields count from database
        const customFieldCount = await prisma.tenantCustomField.count({
            where: { tenantId, isActive: true },
        });

        return NextResponse.json({
            success: true,
            data: {
                ...config,
                customFieldCount,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── PUT /api/settings/industry ──────────────────────────────────────────────

/**
 * Update industry config untuk tenant saat ini.
 * Hanya ADMIN dan SUPERADMIN yang bisa update.
 */
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengubah konfigurasi industri' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = updateIndustryConfigSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { industry, modules } = validation.data;

        // Get existing config
        const existing = await prisma.industryConfiguration.findUnique({
            where: { tenantId },
        });

        let record;
        if (existing) {
            // Merge existing config with new overrides
            const existingConfig = existing.config as Record<string, unknown>;
            const mergedConfig: Record<string, unknown> = { ...existingConfig };
            if (modules) {
                mergedConfig.modules = {
                    ...((existingConfig.modules as Record<string, boolean>) || {}),
                    ...modules,
                };
            }

            record = await prisma.industryConfiguration.update({
                where: { tenantId },
                data: {
                    ...(industry && { industry }),
                    config: mergedConfig as never,
                },
            });
        } else {
            // Create new config
            const defaultConfig = DEFAULT_INDUSTRY_CONFIGS[(industry as IndustryType) || 'general'];
            const createConfig: Record<string, unknown> = {
                ...defaultConfig,
                ...(modules && { modules }),
            };
            record = await prisma.industryConfiguration.create({
                data: {
                    tenantId,
                    industry: (industry as string) || 'general',
                    config: createConfig as never,
                },
            });
        }

        // Audit log
        await logAudit({
            tenantId,
            userId,
            action: 'UPDATE',
            entity: 'IndustryConfiguration',
            entityId: record.id,
            newValues: { industry, modules } as Record<string, unknown>,
        });

        return NextResponse.json({
            success: true,
            data: record,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
