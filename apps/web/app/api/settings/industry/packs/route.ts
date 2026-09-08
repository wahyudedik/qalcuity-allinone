import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { applyIndustryPackSchema, formatZodError } from '@/lib/validation-schemas';
import { getIndustryPack, getAvailablePacks } from '@qalcuity/industry-config';
import { sanitizeObject } from '@/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError, apiForbidden } from '@/lib/api-error';

// ─── GET /api/settings/industry/packs ────────────────────────────────────────

/**
 * Dapatkan daftar semua industry packs yang tersedia.
 * Untuk semua user yang terautentikasi (read-only).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`settings:industry:packs:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'MSG.TOO_MANY_REQUESTS' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const packs = getAvailablePacks();

        // Return summary saja (tanpa full config untuk ringan)
        const packSummaries = packs.map((pack) => ({
            id: pack.id,
            name: pack.name,
            description: pack.description,
            baseIndustry: pack.baseIndustry,
            moduleCount: Object.keys(pack.modules).length,
            enabledModuleCount: Object.values(pack.modules).filter((m) => m.enabled).length,
            workflowCount: Object.keys(pack.workflows).length,
            hasPosSettings: !!pack.posSettings,
        }));

        return NextResponse.json({
            success: true,
            data: packSummaries,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST /api/settings/industry/packs ───────────────────────────────────────

/**
 * Apply industry pack ke tenant saat ini.
 * Hanya ADMIN dan SUPERADMIN yang bisa apply pack.
 *
 * Body: { packId: string, customConfig?: Record<string, unknown> }
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`settings:industry:packs:POST:${ip}`, 10, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'MSG.TOO_MANY_REQUESTS' }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId, role: callerRole } = auth;

        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return apiForbidden();
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        const validation = applyIndustryPackSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { packId, customConfig } = validation.data;

        // Get the pack
        const pack = getIndustryPack(packId);
        if (!pack) {
            return NextResponse.json(
                { success: false, error: `Industry pack not found` },
                { status: 404 }
            );
        }

        // Build config dari pack — gunakan pack sebagai base config
        const packConfig: Record<string, unknown> = {
            modules: pack.modules,
            customFields: pack.customFields,
            dashboardWidgets: pack.dashboardWidgets,
            workflows: pack.workflows,
            posSettings: pack.posSettings,
        };

        // Apply custom config overrides jika ada
        if (customConfig && typeof customConfig === 'object') {
            for (const [key, value] of Object.entries(customConfig)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    packConfig[key] = {
                        ...((packConfig[key] as Record<string, unknown>) || {}),
                        ...(value as Record<string, unknown>),
                    };
                } else {
                    packConfig[key] = value;
                }
            }
        }

        // Upsert industry configuration
        const existing = await prisma.industryConfiguration.findUnique({
            where: { tenantId },
        });

        let record;
        if (existing) {
            record = await prisma.industryConfiguration.update({
                where: { tenantId },
                data: {
                    industry: pack.baseIndustry || 'food_beverage',
                    config: packConfig as never,
                },
            });
        } else {
            record = await prisma.industryConfiguration.create({
                data: {
                    tenantId,
                    industry: pack.baseIndustry || 'food_beverage',
                    config: packConfig as never,
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
            newValues: { packId, appliedFrom: 'industry-pack' } as Record<string, unknown>,
        });

        return NextResponse.json({
            success: true,
            data: {
                packId: pack.id,
                packName: pack.name,
                industry: record.industry,
                config: record.config,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
