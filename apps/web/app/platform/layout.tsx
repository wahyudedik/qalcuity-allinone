import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlatformLayout } from "@/components/layout/platform-layout";

/**
 * Platform Owner email — the ONLY user who can access /platform admin panel.
 * Falls back to 'info@qalcuity.com' if env var is not set.
 * SECURITY: This is a defense-in-depth layer. The middleware also blocks
 * /platform/* for non-SUPERADMIN users.
 */
const PLATFORM_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL || "info@qalcuity.com";

export default async function PlatformRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    // Layer 1: Block if not logged in
    if (!session) {
        redirect("/login");
    }

    // Layer 2: Block if not the platform owner (strict email check)
    // Only the email matching PLATFORM_OWNER_EMAIL can access /platform
    if (session.user.email !== PLATFORM_OWNER_EMAIL) {
        redirect("/dashboard");
    }

    return <PlatformLayout>{children}</PlatformLayout>;
}
