import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlatformLayout } from "@/components/layout/platform-layout";

export default async function PlatformRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPERADMIN") {
        redirect("/dashboard");
    }

    return <PlatformLayout>{children}</PlatformLayout>;
}
