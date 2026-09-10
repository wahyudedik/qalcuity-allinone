export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import {
    reconcileTransactionSchema,
    unreconcileTransactionSchema,
} from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

// GET: Ambil data rekonsiliasi (dengan tenant isolation + pagination)
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const type = searchParams.get('type') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        // Ambil akun bank (akun tipe ASSET dengan code 11xx)
        const bankAccounts = await prisma.coAAccount.findMany({
            where: {
                tenantId,
                type: 'ASSET',
                code: { startsWith: '11' },
                isActive: true,
            },
            orderBy: { code: 'asc' },
        });

        if (type === 'bank-accounts') {
            return NextResponse.json({
                success: true,
                data: bankAccounts,
            });
        }

        // Ambil transaksi buku (dari CoA akun aktif)
        const bookTransactions = await prisma.coAAccount.findMany({
            where: {
                tenantId,
                isActive: true,
                balance: { not: 0 },
            },
            orderBy: { code: 'asc' },
        });

        if (type === 'book-transactions') {
            return NextResponse.json({
                success: true,
                data: bookTransactions,
            });
        }

        // Build filter transaksi bank
        const bankWhere: Record<string, unknown> = { tenantId };

        if (accountId) {
            bankWhere.matchedAccountId = accountId;
        }

        // Ambil transaksi bank dengan pagination
        const [bankTransactions, bankTransactionsTotal] = await Promise.all([
            prisma.bankTransaction.findMany({
                where: bankWhere,
                include: {
                    matchedAccount: {
                        select: { id: true, code: true, name: true },
                    },
                },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            prisma.bankTransaction.count({
                where: bankWhere,
            }),
        ]);

        if (type === 'transactions') {
            // Hitung ringkasan
            const matchedCount = bankTransactions.filter((t) => t.status === 'matched').length;
            const unmatchedCount = bankTransactions.filter((t) => t.status === 'unmatched').length;
            const discrepancyCount = bankTransactions.filter((t) => t.status === 'discrepancy').length;

            return NextResponse.json({
                success: true,
                data: bankTransactions,
                pagination: {
                    page,
                    limit,
                    total: bankTransactionsTotal,
                    totalPages: Math.ceil(bankTransactionsTotal / limit),
                },
                meta: {
                    bankAccount: bankAccounts.find((a) => a.id === accountId) || bankAccounts[0],
                    summary: {
                        matchedCount,
                        unmatchedCount,
                        discrepancyCount,
                    },
                },
            });
        }

        if (type === 'summary') {
            const matchedCount = bankTransactions.filter((t) => t.status === 'matched').length;
            const unmatchedCount = bankTransactions.filter((t) => t.status === 'unmatched').length;
            const discrepancyCount = bankTransactions.filter((t) => t.status === 'discrepancy').length;

            // Hitung total saldo bank dari CoA
            const bankBalance = bankAccounts.reduce(
                (sum, a) => sum + Number(a.balance),
                0
            );

            return NextResponse.json({
                success: true,
                data: {
                    matchedCount,
                    unmatchedCount,
                    discrepancyCount,
                    bookBalance: 0, // Akan dihitung dari data buku
                    bankBalance,
                    difference: 0,
                },
            });
        }

        // Default: return semua data
        const matchedCount = bankTransactions.filter((t) => t.status === 'matched').length;
        const unmatchedCount = bankTransactions.filter((t) => t.status === 'unmatched').length;
        const discrepancyCount = bankTransactions.filter((t) => t.status === 'discrepancy').length;

        const bankBalance = bankAccounts.reduce(
            (sum, a) => sum + Number(a.balance),
            0
        );

        return NextResponse.json({
            success: true,
            data: {
                bankAccounts,
                selectedBankAccount: bankAccounts.find((a) => a.id === accountId) || bankAccounts[0],
                bankTransactions,
                bookTransactions,
                summary: {
                    matchedCount,
                    unmatchedCount,
                    discrepancyCount,
                    bookBalance: 0,
                    bankBalance,
                    difference: 0,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST: Cocokkan transaksi bank dengan transaksi buku
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { bankTransactionId, bookTransactionId, action } = body;

        // Handle tandai selisih (discrepancy)
        if (action === 'discrepancy' && bankTransactionId) {
            // Validasi input
            const validated = reconcileTransactionSchema.safeParse({ bankTransactionId });
            if (!validated.success) {
                return NextResponse.json(
                    { error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                    { status: 400 }
                );
            }
            const reconcileData = validated.data;

            // Cek transaksi bank ada dan milik tenant ini
            const bankTx = await prisma.bankTransaction.findFirst({
                where: { id: reconcileData.bankTransactionId, tenantId },
            });
            if (!bankTx) {
                return NextResponse.json(
                    { success: false, message: 'Bank transaction not found', code: 'NOT_FOUND' },
                    { status: 404 }
                );
            }

            const updated = await prisma.bankTransaction.update({
                where: { id: reconcileData.bankTransactionId },
                data: {
                    status: 'discrepancy',
                    discrepancyNote: body.note || 'Marked as discrepancy',
                },
            });

            // Audit logging
            await logAudit({
                userId,
                tenantId,
                action: 'UPDATE',
                entity: 'BankTransaction',
                entityId: updated.id,
                oldValues: bankTx as unknown as Record<string, unknown>,
                newValues: updated as unknown as Record<string, unknown>,
                request,
            });

            return NextResponse.json({
                success: true,
                message: 'Transaction marked as discrepancy',
                data: updated,
            });
        }

        // Handle pencocokan transaksi
        if (!bankTransactionId || !bookTransactionId) {
            return NextResponse.json(
                { success: false, message: 'bankTransactionId and bookTransactionId are required', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Validasi input
        const validated = reconcileTransactionSchema.safeParse({
            bankTransactionId,
            bookTransactionId,
        });
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            );
        }
        const matchData = validated.data;

        // Cek transaksi bank ada dan milik tenant ini
        const bankTx = await prisma.bankTransaction.findFirst({
            where: { id: matchData.bankTransactionId, tenantId },
        });
        if (!bankTx) {
            return NextResponse.json(
                { success: false, message: 'Bank transaction not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        // Cek akun buku ada dan milik tenant ini
        const bookAccount = await prisma.coAAccount.findFirst({
            where: { id: matchData.bookTransactionId!, tenantId },
        });
        if (!bookAccount) {
            return NextResponse.json(
                { success: false, message: 'Book transaction not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        const updated = await prisma.bankTransaction.update({
            where: { id: matchData.bankTransactionId },
            data: {
                status: 'matched',
                matchedAccountId: matchData.bookTransactionId,
            },
        });

        // Audit logging
        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'BankTransaction',
            entityId: updated.id,
            oldValues: bankTx as unknown as Record<string, unknown>,
            newValues: updated as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: 'Transactions matched successfully',
            data: {
                bankTransactionId: matchData.bankTransactionId,
                bookTransactionId: matchData.bookTransactionId,
                matchedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// PUT: Batalkan pencocokan transaksi
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { bankTransactionId } = body;

        if (!bankTransactionId) {
            return NextResponse.json(
                { success: false, message: 'bankTransactionId is required', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Validasi input
        const validated = unreconcileTransactionSchema.safeParse({ bankTransactionId });
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            );
        }
        const unreconcileData = validated.data;

        // Cek transaksi bank ada dan milik tenant ini
        const bankTx = await prisma.bankTransaction.findFirst({
            where: { id: unreconcileData.bankTransactionId, tenantId },
        });
        if (!bankTx) {
            return NextResponse.json(
                { success: false, message: MSG.BANK_TRANSACTION_NOT_FOUND },
                { status: 404 }
            );
        }

        const updated = await prisma.bankTransaction.update({
            where: { id: unreconcileData.bankTransactionId },
            data: {
                status: 'unmatched',
                matchedAccountId: null,
            },
        });

        // Audit logging
        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'BankTransaction',
            entityId: updated.id,
            oldValues: bankTx as unknown as Record<string, unknown>,
            newValues: updated as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: 'Pencocokan transaksi dibatalkan',
            data: { bankTransactionId: unreconcileData.bankTransactionId },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
