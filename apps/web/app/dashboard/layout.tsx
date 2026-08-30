"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AIChat } from "@/components/ai/ai-chat";

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout>
            {children}
            <AIChat />
        </DashboardLayout>
    );
}
