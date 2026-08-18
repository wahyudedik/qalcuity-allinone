import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { I18nProvider } from "@/lib/i18n";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Qalcuity — All-in-One B2B Operating System",
    description:
        "Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang benar-benar kerja.",
};

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang="id">
            <body>
                <SessionProvider>
                    <I18nProvider>{children}</I18nProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
