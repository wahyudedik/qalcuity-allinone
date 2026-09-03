import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { formatZodError } from './validation-schemas';

/**
 * Standardized API error handler that distinguishes between error types:
 * - ZodError → 400 with field-level validation errors
 * - Prisma P2002 (unique constraint) → 409 Conflict
 * - Prisma P2003 (foreign key not found) → 400 with "Related record not found"
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
                    { success: false, error: `Data dengan ${fields} sudah ada (duplikat)` },
                    { status: 409 }
                );
            }
            case 'P2003':
                return NextResponse.json(
                    { success: false, error: 'Data terkait tidak ditemukan. Pastikan referensi yang dimasukkan valid.' },
                    { status: 400 }
                );
            case 'P2025':
                return NextResponse.json(
                    { success: false, error: 'Data tidak ditemukan' },
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
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan pada database' },
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

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }

    // Unknown error
    return NextResponse.json(
        { success: false, error: 'Terjadi kesalahan internal server' },
        { status: 500 }
    );
}
