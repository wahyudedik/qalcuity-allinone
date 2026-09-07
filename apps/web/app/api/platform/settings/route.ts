import { NextResponse } from "next/server";
import { requirePermissionForRoute } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import fs from "fs";
import path from "path";

// ─── Platform Settings Schema ──────────────────────────────────────────────
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

// ─── Default Settings ──────────────────────────────────────────────────────
const defaultSettings: PlatformSettings = {
    platformName: "Qalcuity",
    supportEmail: "support@qalcuity.com",
    defaultTrialDays: 14,
    maxTenantsPerPlan: {
        Starter: 50,
        Professional: 100,
        Enterprise: 500,
    },
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    securityAlerts: true,
};

// ─── File Storage ──────────────────────────────────────────────────────────
const SETTINGS_FILE = path.join(process.cwd(), "data", "platform-settings.json");

function getSettingsFilePath(): string {
    return SETTINGS_FILE;
}

function readSettings(): PlatformSettings {
    try {
        const filePath = getSettingsFilePath();
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw) as Partial<PlatformSettings>;
            return { ...defaultSettings, ...parsed };
        }
    } catch {
        // Fall through to defaults
    }
    return { ...defaultSettings };
}

function writeSettings(settings: PlatformSettings): void {
    const filePath = getSettingsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

// ─── GET /api/platform/settings ────────────────────────────────────────────
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
        const settings = readSettings();
        return NextResponse.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/platform/settings ────────────────────────────────────────────
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
        const validated = platformSettingsSchema.parse(body);

        // 4. Save settings
        writeSettings(validated);

        return NextResponse.json({
            success: true,
            data: validated,
            message: "Platform settings berhasil disimpan",
        });
    } catch (error) {
        return handleApiError(error);
    }
}
