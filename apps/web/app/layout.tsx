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
                {/* Fix: Next.js 14.x web-vitals PerformanceObserver bug
                    Error: "Cannot read properties of undefined (reading 'startTime')"
                    Root cause: reportAllChanges accesses entries[0].startTime but entries
                    can be empty during navigation race conditions.

                    Strategy (3 layers):
                    Layer 0 — Patch PerformanceObserver.prototype.observe to wrap callbacks
                              with try-catch. This catches the error AT THE SOURCE before
                              it propagates to any global handler. This is the PRIMARY fix.
                    Layer 1 — window.addEventListener('error') catches any errors that
                              somehow escape the PerformanceObserver patch.
                    Layer 2 — window.onerror as final fallback, preserved (not overwritten)
                              to avoid breaking other error handlers (React, analytics, etc.) */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                var startTimeBug = "reading 'startTime'";

                                // ─── Layer 0: Patch PerformanceObserver at prototype level ───
                                // This is the PRIMARY fix — catches errors at the source.
                                if (typeof PerformanceObserver === 'function') {
                                    var OriginalObserver = PerformanceObserver;
                                    var originalObserve = OriginalObserver.prototype.observe;

                                    OriginalObserver.prototype.observe = function wrappedObserve() {
                                        try {
                                            var self = this;
                                            // Wrap getEntries to filter out undefined/null entries
                                            // that cause the startTime TypeError
                                            var origEntryList = self.getEntries;
                                            if (typeof origEntryList === 'function') {
                                                self.getEntries = function wrappedGetEntries() {
                                                    try {
                                                        var entries = origEntryList.call(self);
                                                        return Array.prototype.filter.call(entries, function(e) {
                                                            return e != null && typeof e.startTime === 'number';
                                                        });
                                                    } catch(err) {
                                                        return [];
                                                    }
                                                };
                                            }
                                            return originalObserve.apply(this, arguments);
                                        } catch(e) {
                                            // Silently ignore — PerformanceObserver is best-effort
                                        }
                                    };

                                    // Wrap the constructor to catch errors in observer callbacks
                                    var WrappedObserver = function WrappedPerformanceObserver(callback) {
                                        var wrappedCallback = function wrappedCallback(list) {
                                            try {
                                                callback(list);
                                            } catch(e) {
                                                // Swallow startTime errors from web-vitals internals
                                            }
                                        };
                                        return new OriginalObserver(wrappedCallback);
                                    };
                                    WrappedObserver.prototype = OriginalObserver.prototype;
                                    WrappedObserver.supportedEntryTypes = OriginalObserver.supportedEntryTypes;

                                    window.PerformanceObserver = WrappedObserver;
                                }

                                // ─── Layer 1: Global error event listener (capture phase) ───
                                // Catches any errors that escape the PerformanceObserver patch
                                window.addEventListener('error', function(e) {
                                    if (e.message && e.message.indexOf(startTimeBug) !== -1) {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        return false;
                                    }
                                }, true); // useCapture = true to catch in capture phase

                                // ─── Layer 2: window.onerror fallback ───
                                // PRESERVE existing onerror handler (don't overwrite!)
                                var previousOnError = window.onerror;
                                window.onerror = function(msg, source, lineno, colno, error) {
                                    if (msg && typeof msg === 'string' && msg.indexOf(startTimeBug) !== -1) {
                                        return true; // suppress
                                    }
                                    // Delegate to previous handler if it exists
                                    if (typeof previousOnError === 'function') {
                                        return previousOnError.call(this, msg, source, lineno, colno, error);
                                    }
                                    return false;
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
