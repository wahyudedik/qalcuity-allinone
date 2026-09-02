"use client";

import { PlatformLayout } from "@/components/layout/platform-layout";

export default function PlatformRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PlatformLayout>{children}</PlatformLayout>;
}
