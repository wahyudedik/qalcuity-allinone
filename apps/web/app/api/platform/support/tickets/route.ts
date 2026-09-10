export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// â”€â”€â”€ GET /api/platform/support/tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns support tickets derived from AuditLog entries (support-related actions).
// SUPERADMIN sees all tickets; other roles see only their tenant's tickets.
export async function GET(request: Request) {
    try {
        // 1. Auth + RBAC check â€” SUPERADMIN only
        const auth = await requirePermissionForRoute(request);
        if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const role = auth.role;
        const tenantId = auth.tenantId;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "";
        const search = searchParams.get("search") || "";

        // Build where clause for AuditLog â€” map audit actions to support tickets
        const where: Record<string, unknown> = {};

        // For non-SUPERADMIN, filter by tenantId
        if (role !== "SUPERADMIN" && tenantId) {
            where.tenantId = tenantId;
        }

        // Filter for support-related entities
        where.entity = {
            in: ["SUPPORT_TICKET", "Invoice", "PurchaseOrder", "Quotation", "Product", "Employee", "Contact", "Deal"],
        };

        if (search) {
            where.OR = [
                { action: { contains: search, mode: "insensitive" } },
                { entity: { contains: search, mode: "insensitive" } },
                { entityId: { contains: search, mode: "insensitive" } },
            ];
        }

        // Query AuditLog entries and map to support ticket structure
        const auditLogs = await prisma.auditLog.findMany({
            where,
            include: {
                tenant: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        // Map audit logs to support ticket format
        const tickets = auditLogs.map((log) => {
            const actionLower = log.action.toLowerCase();
            let status: "open" | "in_progress" | "resolved" | "closed" = "open";
            let priority: "critical" | "high" | "medium" | "low" = "medium";
            let category = "General";

            if (actionLower.includes("create") || actionLower.includes("buat")) {
                status = "open";
                priority = "medium";
                category = "Bug Report";
            } else if (actionLower.includes("update") || actionLower.includes("ubah")) {
                status = "in_progress";
                priority = "low";
                category = "Feature Request";
            } else if (actionLower.includes("delete") || actionLower.includes("hapus")) {
                status = "open";
                priority = "high";
                category = "Bug Report";
            } else if (actionLower.includes("approve") || actionLower.includes("setuju")) {
                status = "resolved";
                priority = "low";
                category = "Question";
            }

            return {
                id: log.id,
                tenant: log.tenant?.name || "Unknown",
                subject: `[${log.entity}] ${log.action}`,
                message: `Aktivitas ${log.action} pada ${log.entity}${log.entityId ? ` (ID: ${log.entityId.slice(0, 8)})` : ""}`,
                status,
                priority,
                category,
                createdAt: log.createdAt.toISOString(),
                updatedAt: log.createdAt.toISOString(),
                replies: [] as Array<{
                    id: string;
                    author: string;
                    role: "admin" | "tenant";
                    message: string;
                    createdAt: string;
                }>,
            };
        });

        // Apply status filter if provided
        const filteredTickets = status
            ? tickets.filter((t) => t.status === status)
            : tickets;

        return NextResponse.json({
            success: true,
            data: filteredTickets,
            total: filteredTickets.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// â”€â”€â”€ POST /api/platform/support/tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Create a new support ticket (stored as AuditLog entry).
export async function POST(request: Request) {
    try {
        // 1. Auth + RBAC check â€” SUPERADMIN only
        const auth = await requirePermissionForRoute(request);
        if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const role = auth.role;
        const userId = auth.userId;
        const tenantId = auth.tenantId;

        const body = await request.json();
        const { subject, message, priority, category } = body;

        if (!subject || !message) {
            return NextResponse.json(
                { success: false, error: "MSG.SUBJECT_AND_MESSAGE_REQUIRED" },
                { status: 400 }
            );
        }

        // Create as AuditLog entry (support ticket representation)
        const log = await prisma.auditLog.create({
            data: {
                action: subject.slice(0, 255),
                entity: "SUPPORT_TICKET",
                entityId: null,
                oldValues: null,
                newValues: JSON.stringify({
                    message,
                    priority: priority || "medium",
                    category: category || "General",
                    createdBy: "Platform Admin",
                }),
                ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
                userAgent: request.headers.get("user-agent") || "unknown",
                userId,
                tenantId,
            },
            include: {
                tenant: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: log.id,
                tenant: log.tenant?.name || "Unknown",
                subject: log.action,
                message,
                status: "open",
                priority: priority || "medium",
                category: category || "General",
                createdAt: log.createdAt.toISOString(),
                updatedAt: log.createdAt.toISOString(),
                replies: [],
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
