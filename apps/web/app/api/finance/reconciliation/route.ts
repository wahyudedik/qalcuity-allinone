import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import {
    reconcileTransactionSchema,
    unreconcileTransactionSchema,
} from '@/lib/validation-schemas';

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
            const matchedCount = bankTransactions.filter((t: any) => t.status === 'matched').length;
            const unmatchedCount = bankTransactions.filter((t: any) => t.status === 'unmatched').length;
            const discrepancyCount = bankTransactions.filter((t: any) => t.status === 'discrepancy').length;

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
                    bankAccount: bankAccounts.find((a: any) => a.id === accountId) || bankAccounts[0],
                    summary: {
                        matchedCount,
                        unmatchedCount,
                        discrepancyCount,
                    },
                },
            });
        }

        if (type === 'summary') {
            const matchedCount = bankTransactions.filter((t: any) => t.status === 'matched').length;
            const unmatchedCount = bankTransactions.filter((t: any) => t.status === 'unmatched').length;
            const discrepancyCount = bankTransactions.filter((t: any) => t.status === 'discrepancy').length;

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
        const matchedCount = bankTransactions.filter((t: any) => t.status === 'matched').length;
        const unmatchedCount = bankTransactions.filter((t: any) => t.status === 'unmatched').length;
        const discrepancyCount = bankTransactions.filter((t: any) => t.status === 'discrepancy').length;

        const bankBalance = bankAccounts.reduce(
            (sum, a) => sum + Number(a.balance),
            0
        );

        return NextResponse.json({
            success: true,
            data: {
                bankAccounts,
                selectedBankAccount: bankAccounts.find((a: any) => a.id === accountId) || bankAccounts[0],
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
        console.error('[Reconciliation GET]', error instanceof Error ? error.message : 'Unknown error');
        const message = error instanceof Error ? error.message : 'Gagal mengambil data rekonsiliasi';
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
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
            const validated = reconcileTransactionSchema.parse({ bankTransactionId });

            // Cek transaksi bank ada dan milik tenant ini
            const bankTx = await prisma.bankTransaction.findFirst({
                where: { id: validated.bankTransactionId, tenantId },
            });
            if (!bankTx) {
                return NextResponse.json(
                    { success: false, message: 'Transaksi bank tidak ditemukan' },
                    { status: 404 }
                );
            }

            const updated = await prisma.bankTransaction.update({
                where: { id: validated.bankTransactionId },
                data: {
                    status: 'discrepancy',
                    discrepancyNote: body.note || 'Ditandai sebagai selisih',
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
                message: 'Transaksi ditandai sebagai selisih',
                data: updated,
            });
        }

        // Handle pencocokan transaksi
        if (!bankTransactionId || !bookTransactionId) {
            return NextResponse.json(
                { success: false, message: 'bankTransactionId dan bookTransactionId harus diisi' },
                { status: 400 }
            );
        }

        // Validasi input
        const validated = reconcileTransactionSchema.parse({
            bankTransactionId,
            bookTransactionId,
        });

        // Cek transaksi bank ada dan milik tenant ini
        const bankTx = await prisma.bankTransaction.findFirst({
            where: { id: validated.bankTransactionId, tenantId },
        });
        if (!bankTx) {
            return NextResponse.json(
                { success: false, message: 'Transaksi bank tidak ditemukan' },
                { status: 404 }
            );
        }

        // Cek akun buku ada dan milik tenant ini
        const bookAccount = await prisma.coAAccount.findFirst({
            where: { id: validated.bookTransactionId!, tenantId },
        });
        if (!bookAccount) {
            return NextResponse.json(
                { success: false, message: 'Transaksi buku tidak ditemukan' },
                { status: 404 }
            );
        }

        const updated = await prisma.bankTransaction.update({
            where: { id: validated.bankTransactionId },
            data: {
                status: 'matched',
                matchedAccountId: validated.bookTransactionId,
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
            message: 'Transaksi berhasil dicocokkan',
            data: {
                bankTransactionId: validated.bankTransactionId,
                bookTransactionId: validated.bookTransactionId,
                matchedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('[Reconciliation POST]', error instanceof Error ? error.message : 'Unknown error');
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json(
                { success: false, message: 'Validasi gagal', details: error },
                { status: 400 }
            );
        }
        const message = error instanceof Error ? error.message : 'Gagal mencocokkan transaksi';
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
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
                { success: false, message: 'bankTransactionId harus diisi' },
                { status: 400 }
            );
        }

        // Validasi input
        const validated = unreconcileTransactionSchema.parse({ bankTransactionId });

        // Cek transaksi bank ada dan milik tenant ini
        const bankTx = await prisma.bankTransaction.findFirst({
            where: { id: validated.bankTransactionId, tenantId },
        });
        if (!bankTx) {
            return NextResponse.json(
                { success: false, message: 'Transaksi bank tidak ditemukan' },
                { status: 404 }
            );
        }

        const updated = await prisma.bankTransaction.update({
            where: { id: validated.bankTransactionId },
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
            data: { bankTransactionId: validated.bankTransactionId },
        });
    } catch (error) {
        console.error('[Reconciliation PUT]', error instanceof Error ? error.message : 'Unknown error');
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json(
                { success: false, message: 'Validasi gagal', details: error },
                { status: 400 }
            );
        }
        const message = error instanceof Error ? error.message : 'Gagal membatalkan pencocokan';
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
