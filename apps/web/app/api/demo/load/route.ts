import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadDemoData, tenantHasData } from "@/lib/seed-data/demo";

/**
 * POST /api/demo/load
 * 
 * Loads demo data into the current user's tenant.
 * Requires authenticated user with ADMIN or SUPERADMIN role.
 * 
 * Request body (optional):
 * - force: boolean — skip the "already has data" check
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.tenantId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only ADMIN and SUPERADMIN can load demo data
        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
            return NextResponse.json(
                { success: false, error: "Hanya admin yang dapat memuat demo data" },
                { status: 403 }
            );
        }

        const tenantId = session.user.tenantId;

        // Check if tenant already has data (unless force=true)
        let body: { force?: boolean } = {};
        try {
            body = await req.json();
        } catch {
            // Body is optional
        }

        if (!body.force) {
            const hasData = await tenantHasData(tenantId);
            if (hasData) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tenant sudah memiliki data. Gunakan force=true untuk memuat ulang.",
                        hasData: true,
                    },
                    { status: 409 }
                );
            }
        }

        // Load demo data
        const result = await loadDemoData(tenantId);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                counts: result.counts,
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("[API /api/demo/load] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat demo data",
            },
            { status: 500 }
        );
    }
}
