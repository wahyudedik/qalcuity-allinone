export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { invalidatePlatformSettingsCache } from "@/lib/platform-settings";

// ─── Platform Settings Schema ──────────────────────────────────────────────────
const platformSettingsSchema = z.object({
    platformName: z.string().min(1).max(100),
    supportEmail: z.string().email(),
    defaultTrialDays: z.number().int().min(1).max(365),
    maxTenantsPerPlan: z.record(z.string(), z.number().int().min(0)),
    maintenanceMode: z.boolean(),
    allowRegistration: z.boolean(),
    emailNotifications: z.boolean(),
    securityAlerts: z.boolean(),
});

type PlatformSettings = z.infer<typeof platformSettingsSchema>;

// ─── Default Settings ──────────────────────────────────────────────────────────
const DEFAULT_PLAN_LIMITS = [
    { planName: 'Starter', maxTenants: 50 },
    { planName: 'Professional', maxTenants: 100 },
    { planName: 'Enterprise', maxTenants: 500 },
];

// ─── GET /api/platform/settings ────────────────────────────────────────────────
// Returns platform-wide settings. Only accessible by SUPERADMIN.
export async function GET(request: Request) {
    // 1. Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:platform:settings:GET:${ip}`, 30, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 2. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // 3. Get or create platform settings (singleton pattern)
        let settings = await prisma.platformSetting.findFirst();
        if (!settings) {
            settings = await prisma.platformSetting.create({ data: {} });
        }

        // 4. Get plan tenant limits
        const planLimits = await prisma.planTenantLimit.findMany();
        const maxTenantsPerPlan: Record<string, number> = {};
        for (const limit of planLimits) {
            maxTenantsPerPlan[limit.planName] = limit.maxTenants;
        }
        // Add defaults for plans that don't have limits yet
        for (const defaultLimit of DEFAULT_PLAN_LIMITS) {
            if (!(defaultLimit.planName in maxTenantsPerPlan)) {
                maxTenantsPerPlan[defaultLimit.planName] = defaultLimit.maxTenants;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                platformName: settings.platformName,
                supportEmail: settings.supportEmail,
                defaultTrialDays: settings.defaultTrialDays,
                maintenanceMode: settings.maintenanceMode,
                allowRegistration: settings.allowRegistration,
                emailNotifications: settings.emailNotifications,
                securityAlerts: settings.securityAlerts,
                maxTenantsPerPlan,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/platform/settings ────────────────────────────────────────────────
// Update platform-wide settings. Only accessible by SUPERADMIN.
export async function PUT(req: Request) {
    // 1. Rate limiting
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`api:platform:settings:PUT:${ip}`, 10, 60000);
    if (!rateLimitResult.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 2. Auth + RBAC check — SUPERADMIN only
    const auth = await requirePermissionForRoute(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // 3. Validate input
        const body = await req.json();
        const validated = platformSettingsSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            );
        }

        // 4. Extract maxTenantsPerPlan (stored in separate table)
        const { maxTenantsPerPlan, ...settingsData } = validated.data;

        // 5. Upsert platform settings (singleton pattern)
        const existing = await prisma.platformSetting.findFirst();
        let settings;
        if (existing) {
            settings = await prisma.platformSetting.update({
                where: { id: existing.id },
                data: settingsData,
            });
        } else {
            settings = await prisma.platformSetting.create({ data: settingsData });
        }

        // 6. Update plan tenant limits
        for (const [planName, maxTenants] of Object.entries(maxTenantsPerPlan)) {
            await prisma.planTenantLimit.upsert({
                where: { planName },
                update: { maxTenants },
                create: { planName, maxTenants },
            });
        }

        // 7. Invalidate in-memory cache so middleware + other code pick up new settings
        invalidatePlatformSettingsCache();

        return NextResponse.json({
            success: true,
            data: {
                platformName: settings.platformName,
                supportEmail: settings.supportEmail,
                defaultTrialDays: settings.defaultTrialDays,
                maintenanceMode: settings.maintenanceMode,
                allowRegistration: settings.allowRegistration,
                emailNotifications: settings.emailNotifications,
                securityAlerts: settings.securityAlerts,
                maxTenantsPerPlan,
            },
            message: "Platform settings berhasil disimpan",
        });
    } catch (error) {
        return handleApiError(error);
    }
}
