// ─── Analytics Table Error Handler ─────────────────────────────────────────
// Graceful error handling untuk analytics routes ketika tabel belum di-migrate.
//
// Root cause: Prisma models ada di schema tapi tabel belum dibuat di database
// (migration belum dijalankan). Prisma throws P2021 (table not found).
//
// Strategy: Tangkap P2021 dan return empty data dengan 200 status,
// sehingga frontend menampilkan empty state daripada error page.

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

/**
 * Check if error is Prisma P2021 (table not found) and return graceful empty response.
 * Returns null if error is NOT P2021 — caller should fall through to handleApiError().
 *
 * @param error - The caught error
 * @param context - Optional context string for logging (e.g., route name)
 * @returns NextResponse with empty data if P2021, null otherwise
 */
export function handleTableNotReady(
    error: unknown,
    context?: string
): NextResponse | null {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        const tableName = (error.meta?.table as string) || 'unknown';
        const message = context
            ? `[${context}] Table "${tableName}" not found — migration pending. Returning empty data.`
            : `Table "${tableName}" not found — migration pending. Returning empty data.`;

        // Log as warning, not error — this is an expected state during migration rollout
        console.warn(`[Analytics Fallback] ${message}`);

        return NextResponse.json(
            {
                success: true,
                data: [],
                _migrationPending: true,
                _message: `Table "${tableName}" is not yet available. Please run database migration.`,
            },
            { status: 200 }
        );
    }
    return null;
}

/**
 * Check if error is related to missing materialized views or raw SQL failures.
 * For raw SQL queries ($queryRaw / $queryRawUnsafe), PostgreSQL errors may be
 * wrapped as PrismaClientUnknownRequestError or PrismaClientRustPanicError
 * instead of PrismaClientKnownRequestError P2021.
 *
 * @param error - The caught error
 * @param context - Optional context string for logging
 * @returns NextResponse with empty data if view-related error, null otherwise
 */
export function handleViewNotReady(
    error: unknown,
    context?: string
): NextResponse | null {
    // Check for raw SQL errors that reference missing views/tables
    if (error instanceof Error) {
        const msg = error.message || '';
        const isViewError =
            msg.includes('does not exist') ||
            msg.includes('relation ') ||
            msg.includes('mv_') ||
            msg.includes('materialized view');

        if (isViewError) {
            const message = context
                ? `[${context}] Materialized view or table not available: ${msg}`
                : `Materialized view or table not available: ${msg}`;

            console.warn(`[Analytics Fallback] ${message}`);

            return NextResponse.json(
                {
                    success: true,
                    data: [],
                    _viewUnavailable: true,
                    _message: 'Analytics views are not yet available. Please run database migration.',
                },
                { status: 200 }
            );
        }
    }

    // Also check Prisma unknown/rust panic errors
    if (
        error instanceof Prisma.PrismaClientUnknownRequestError ||
        error instanceof Prisma.PrismaClientRustPanicError
    ) {
        const msg = String(error);
        if (msg.includes('does not exist') || msg.includes('mv_')) {
            console.warn(`[Analytics Fallback] Prisma raw query error (view missing): ${msg}`);
            return NextResponse.json(
                {
                    success: true,
                    data: [],
                    _viewUnavailable: true,
                    _message: 'Analytics views are not yet available. Please run database migration.',
                },
                { status: 200 }
            );
        }
    }

    return null;
}
