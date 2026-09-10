import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { formatZodError } from './validation-schemas';
import { MSG } from './api-messages';

/**
 * Standardized API error handler that distinguishes between error types:
 * - ZodError → 400 with field-level validation errors
 * - Prisma P2002 (unique constraint) → 409 Conflict
 * - Prisma P2003 (foreign key not found) → 400 with "Related record not found"
 * - Prisma P2021 (table not found) → 503 Service Unavailable (migration pending)
 * - Prisma P2025 (record not found) → 404 Not Found
 * - Other errors → 500 Internal Server Error
 */
export function handleApiError(error: unknown): NextResponse {
    // Zod validation error
    if (error instanceof ZodError) {
        return NextResponse.json(
            { success: false, ...formatZodError(error) },
            { status: 400 }
        );
    }

    // Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': {
                const target = (error.meta?.target as string[]) || [];
                const fields = target.length > 0 ? target.join(', ') : 'field';
                return NextResponse.json(
                    { success: false, error: `Data with ${fields} already exists (duplicate)`, code: 'DUPLICATE_DATA' },
                    { status: 409 }
                );
            }
            case 'P2003':
                return NextResponse.json(
                    { success: false, error: MSG.RELATED_DATA_NOT_FOUND, code: 'RELATED_DATA_NOT_FOUND' },
                    { status: 400 }
                );
            case 'P2021': {
                const tableName = (error.meta?.table as string) || 'unknown';
                console.error(`[API Error] Prisma P2021: Table "${tableName}" does not exist. Run: cd packages/db && npx prisma migrate deploy`);
                return NextResponse.json(
                    { success: false, error: `Service temporarily unavailable. Please contact administrator. (Table: ${tableName})`, code: 'SERVICE_UNAVAILABLE' },
                    { status: 503 }
                );
            }
            case 'P2025':
                return NextResponse.json(
                    { success: false, error: MSG.DATA_NOT_FOUND, code: 'NOT_FOUND' },
                    { status: 404 }
                );
            default:
                return NextResponse.json(
                    { success: false, error: `Database error: ${error.code}` },
                    { status: 500 }
                );
        }
    }

    // Prisma unknown request errors
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        console.error('[API Error] PrismaClientUnknownRequestError:', error.message);
        return NextResponse.json(
            { success: false, error: MSG.DATABASE_ERROR, code: 'DATABASE_ERROR' },
            { status: 500 }
        );
    }

    // Prisma initialization errors (DB connection failure)
    if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error('[API Error] PrismaClientInitializationError:', error.message);
        return NextResponse.json(
            { success: false, error: 'Service temporarily unavailable. Database connection failed.', code: 'SERVICE_UNAVAILABLE' },
            { status: 503 }
        );
    }

    // Prisma Rust panic errors (internal engine failure)
    if (error instanceof Prisma.PrismaClientRustPanicError) {
        console.error('[API Error] PrismaClientRustPanicError:', error.message);
        return NextResponse.json(
            { success: false, error: MSG.DATABASE_ERROR, code: 'DATABASE_ERROR' },
            { status: 500 }
        );
    }

    // Error instances with specific messages
    if (error instanceof Error) {
        const message = error.message;

        // WorkflowEngine errors
        if (message.includes('Workflow') || message.includes('workflow') || message.includes('transition')) {
            return NextResponse.json(
                { success: false, error: message },
                { status: 400 }
            );
        }

        console.error('[API Error] Unhandled Error:', error.name, error.message);
        return NextResponse.json(
            { success: false, error: MSG.INTERNAL_SERVER_ERROR, code: 'INTERNAL_SERVER_ERROR' },
            { status: 500 }
        );
    }

    // Unknown error
    return NextResponse.json(
        { success: false, error: MSG.INTERNAL_SERVER_ERROR, code: 'INTERNAL_SERVER_ERROR' },
        { status: 500 }
    );
}

// ---------------------------------------------------------------------------
// Standardized response helpers
// ---------------------------------------------------------------------------

/** Standard error response format: `{ success: false, error: string }` */
export function apiError(error: string, status: number = 500): NextResponse {
    return NextResponse.json({ success: false, error }, { status });
}

/** Standard success response format: `{ success: true, data: T }` or `{ success: true }` */
export function apiSuccess<T>(data?: T, status: number = 200): NextResponse {
    if (data !== undefined) {
        return NextResponse.json({ success: true, data }, { status });
    }
    return NextResponse.json({ success: true }, { status });
}

/** Standard 401 Unauthorized response */
export function apiUnauthorized(message: string = MSG.UNAUTHORIZED): NextResponse {
    return NextResponse.json({ success: false, error: message, code: 'UNAUTHORIZED' }, { status: 401 });
}

/** Standard 403 Forbidden response */
export function apiForbidden(message: string = MSG.FORBIDDEN): NextResponse {
    return NextResponse.json({ success: false, error: message, code: 'FORBIDDEN' }, { status: 403 });
}

/** Standard 404 Not Found response */
export function apiNotFound(message: string = MSG.DATA_NOT_FOUND): NextResponse {
    return NextResponse.json({ success: false, error: message, code: 'NOT_FOUND' }, { status: 404 });
}

/** Standard 429 Too Many Requests response */
export function apiRateLimited(message: string = MSG.TOO_MANY_REQUESTS): NextResponse {
    return NextResponse.json({ success: false, error: message, code: 'RATE_LIMITED' }, { status: 429 });
}
