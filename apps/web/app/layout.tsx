import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
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
                {/* Fix: Next.js 14.x web-vitals v3.0.0 PerformanceObserver bug
                    Error: "Cannot read properties of undefined (reading 'startTime')"
                    Root cause: web-vitals accesses entry.startTime on entries that can
                    be undefined during navigation race conditions (setTimeout callback).

                    Strategy: Use next/script with strategy="beforeInteractive" to guarantee
                    this script runs BEFORE Next.js bundled web-vitals code. Then suppress
                    the error globally via two handlers (error event + onerror fallback). */}
            </head>
            <Script
                id="suppress-webvitals-starttime-error"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            var startTimeBug = "reading 'startTime'";

                            // Global error event listener (capture phase).
                            // Catches startTime errors from web-vitals PerformanceObserver
                            // callbacks AND their async continuations (setTimeout, rAF).
                            // Runs beforeInteractive via next/script — guaranteed to execute
                            // before Next.js bundled web-vitals code.
                            window.addEventListener('error', function(e) {
                                if (e.message && e.message.indexOf(startTimeBug) !== -1) {
                                    e.preventDefault();
                                    return false;
                                }
                            }, true);

                            // window.onerror fallback.
                            // Catches errors in setTimeout/rAF that escape the error event.
                            // PRESERVE existing onerror handler (don't overwrite!).
                            var previousOnError = window.onerror;
                            window.onerror = function(msg, source, lineno, colno, error) {
                                if (msg && typeof msg === 'string' && msg.indexOf(startTimeBug) !== -1) {
                                    return true; // suppress
                                }
                                if (typeof previousOnError === 'function') {
                                    return previousOnError.call(this, msg, source, lineno, colno, error);
                                }
                                return false;
                            };
                        })();
                    `
                }}
            />
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
