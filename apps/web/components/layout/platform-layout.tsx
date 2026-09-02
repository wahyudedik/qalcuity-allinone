"use client";

import { useState } from "react";
import { PlatformSidebar } from "./platform-sidebar";
import { PlatformHeader } from "./platform-header";

interface PlatformLayoutProps {
    children: React.ReactNode;
}

export function PlatformLayout({ children }: PlatformLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
            <PlatformSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex flex-col flex-1 min-w-0">
                <PlatformHeader
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
