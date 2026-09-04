import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// ─── GET /api/platform/security/events ──────────────────────────────────────
// Returns security events from LoginLog and AuditLog models.
// SUPERADMIN only.
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const severity = searchParams.get("severity") || "";
        const type = searchParams.get("type") || "";
        const search = searchParams.get("search") || "";

        // Fetch login logs
        const loginLogs = await prisma.loginLog.findMany({
            include: {
                tenant: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Fetch audit logs for security-relevant actions
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { action: { contains: "role", mode: "insensitive" } },
                    { action: { contains: "password", mode: "insensitive" } },
                    { action: { contains: "delete", mode: "insensitive" } },
                    { action: { contains: "export", mode: "insensitive" } },
                    { entity: { in: ["User", "Tenant", "Role"] } },
                ],
            },
            include: {
                tenant: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Map login logs to security events
        const loginEvents = loginLogs.map((log) => {
            let eventType: "login_success" | "login_failed" | "suspicious_activity" = log.success
                ? "login_success"
                : "login_failed";
            let severity: "critical" | "high" | "medium" | "low" = log.success ? "low" : "medium";

            if (!log.success && log.failureReason?.includes("brute")) {
                eventType = "suspicious_activity";
                severity = "critical";
            } else if (!log.success) {
                severity = "high";
            }

            return {
                id: log.id,
                type: eventType,
                severity,
                user: log.email,
                tenant: log.tenant?.name || "Unknown",
                description: log.success
                    ? `Login berhasil dari ${log.email}`
                    : `Login gagal: ${log.failureReason || "Kredensial salah"}`,
                ipAddress: log.ipAddress || "Unknown",
                userAgent: log.userAgent || "Unknown",
                timestamp: log.createdAt.toISOString(),
            };
        });

        // Map audit logs to security events
        const auditEvents = auditLogs.map((log) => {
            const actionLower = log.action.toLowerCase();
            let eventType: "password_change" | "role_change" | "data_export" | "tenant_suspend" | "api_key_created" = "password_change";
            let severity: "critical" | "high" | "medium" | "low" = "medium";

            if (actionLower.includes("role")) {
                eventType = "role_change";
                severity = "high";
            } else if (actionLower.includes("password")) {
                eventType = "password_change";
                severity = "medium";
            } else if (actionLower.includes("export")) {
                eventType = "data_export";
                severity = "medium";
            } else if (actionLower.includes("delete") || actionLower.includes("suspend")) {
                eventType = "tenant_suspend";
                severity = "high";
            } else if (actionLower.includes("api") || actionLower.includes("key")) {
                eventType = "api_key_created";
                severity = "low";
            }

            return {
                id: log.id,
                type: eventType,
                severity,
                user: log.user?.email || log.user?.name || "Unknown",
                tenant: log.tenant?.name || "Platform",
                description: `${log.action} pada ${log.entity}${log.entityId ? ` (${log.entityId.slice(0, 8)})` : ""}`,
                ipAddress: log.ipAddress || "Unknown",
                userAgent: log.userAgent || "Unknown",
                timestamp: log.createdAt.toISOString(),
            };
        });

        // Combine and sort by timestamp
        let allEvents = [...loginEvents, ...auditEvents].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Apply filters
        if (severity) {
            allEvents = allEvents.filter((e) => e.severity === severity);
        }
        if (type) {
            allEvents = allEvents.filter((e) => e.type === type);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            allEvents = allEvents.filter(
                (e) =>
                    e.user.toLowerCase().includes(searchLower) ||
                    e.tenant.toLowerCase().includes(searchLower) ||
                    e.description.toLowerCase().includes(searchLower)
            );
        }

        // Calculate stats
        const totalEvents = allEvents.length;
        const criticalEvents = allEvents.filter((e) => e.severity === "critical").length;
        const failedLogins = loginEvents.filter((e) => e.type === "login_failed").length;
        const activeSessions = await prisma.userSession.count({ where: { isActive: true } });
        const lastIncident = allEvents.find((e) => e.severity === "critical" || e.severity === "high");

        return NextResponse.json({
            success: true,
            data: {
                events: allEvents,
                stats: {
                    totalEvents,
                    criticalEvents,
                    failedLogins,
                    activeSessions,
                    lastIncident: lastIncident
                        ? new Date(lastIncident.timestamp).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                          })
                        : "-",
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
