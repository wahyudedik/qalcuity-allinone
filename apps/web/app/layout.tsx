import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Qalcuity — All-in-One B2B Operating System",
    description:
        "Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.",
    icons: {
        icon: "/favicon.png",
    },
};

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang="id" suppressHydrationWarning>
            <head>
                {/* Suppress known Next.js 14.x web-vitals bug:
                    "Cannot read properties of undefined (reading 'startTime')"
                    This is a race condition in PerformanceObserver callback during browser idle.
                    Both addEventListener('error') and window.onerror are used as belt-and-suspenders
                    to ensure the error is caught regardless of how it propagates. */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                var target = "reading 'startTime'";
                                // Layer 1: addEventListener — catches most synchronous errors
                                window.addEventListener('error', function(e) {
                                    if (e.message && e.message.indexOf(target) !== -1) {
                                        e.preventDefault();
                                        return false;
                                    }
                                });
                                // Layer 2: window.onerror — catches errors that bypass addEventListener
                                // (e.g., errors in certain async callbacks or web worker contexts)
                                window.onerror = function(msg) {
                                    if (msg && msg.indexOf(target) !== -1) {
                                        return true; // suppress the error
                                    }
                                };
                            })();
                        `
                    }}
                />
            </head>
            <body suppressHydrationWarning>
                <SessionProvider>
                    <I18nProvider>
                        <ToastProvider>{children}</ToastProvider>
                    </I18nProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
