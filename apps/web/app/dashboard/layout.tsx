"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AIChat } from "@/components/ai/ai-chat";
import OnboardingModal from "@/components/ui/onboarding-modal";

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout>
            {children}
            <AIChat />
            <OnboardingModal />
        </DashboardLayout>
    );
}
