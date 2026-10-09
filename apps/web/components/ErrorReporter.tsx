"use client";

import { useEffect } from "react";

/** Maksimal laporan client error per session (fire-and-forget). */
const MAX_REPORTS_PER_SESSION = 20;

/** Tag resource loading yang bukan JavaScript error. */
const RESOURCE_TAGS = new Set(["SCRIPT", "LINK", "IMG", "STYLE"]);

function truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getCurrentRoute(): string {
    if (typeof window === "undefined") return "";
    return truncate(`${window.location.pathname}${window.location.search}`, 300);
}

/**
 * ErrorReporter — menangkap error client-side (window "error" +
 * "unhandledrejection") dan melaporkannya ke POST /api/client-errors.
 *
 * Fire-and-forget: request tidak ditunggu, kegagalan dilaporan diabaikan,
 * dan komponen ini TIDAK mengimport error-logger (server-only).
 */
export default function ErrorReporter() {
    useEffect(() => {
        const reportedKeys = new Set<string>();
        let reportCount = 0;

        function report(message: string, stack: string | undefined, source: string): void {
            // Jangan laporkan error dari endpoint reporter itu sendiri (hindari loop)
            const route = getCurrentRoute();
            if (route.includes("/api/client-errors")) return;

            // Batasi jumlah laporan per session
            if (reportCount >= MAX_REPORTS_PER_SESSION) return;

            // Dedup per session: kirim maksimal 1x per kombinasi message|source
            const key = `${message}|${source}`;
            if (reportedKeys.has(key)) return;
            reportedKeys.add(key);
            reportCount += 1;

            fetch("/api/client-errors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                keepalive: true,
                body: JSON.stringify({
                    message: truncate(message, 500),
                    stack: stack ? truncate(stack, 4000) : undefined,
                    route,
                    source: "frontend",
                    meta: {
                        userAgent:
                            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
                    },
                }),
            }).catch(() => {
                // Fire-and-forget: abaikan kegagalan pelaporan
            });
        }

        function handleError(event: Event): void {
            const errorEvent = event as ErrorEvent;

            // Resource loading error (script/link/img/style) — bukan JS error.
            // Ditangkap lewat capture phase, target = elemen yang gagal load.
            const target = errorEvent.target;
            if (target instanceof HTMLElement && RESOURCE_TAGS.has(target.tagName)) return;

            // Error yang sudah di-suppress global (mis. web-vitals startTime bug)
            if (errorEvent.defaultPrevented) return;

            const message =
                errorEvent.message || String(errorEvent.error ?? "Unknown client error");
            const stack =
                errorEvent.error instanceof Error ? errorEvent.error.stack : undefined;
            report(message, stack, errorEvent.filename || "");
        }

        function handleUnhandledRejection(event: PromiseRejectionEvent): void {
            const reason: unknown = event.reason;
            const message =
                reason instanceof Error
                    ? reason.message
                    : typeof reason === "string"
                        ? reason
                        : "Unhandled promise rejection";
            const stack = reason instanceof Error ? reason.stack : undefined;
            report(message, stack, "promise");
        }

        window.addEventListener("error", handleError, true);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);

        return () => {
            window.removeEventListener("error", handleError, true);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };
    }, []);

    return null;
}
