import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createCoAAccountSchema, updateCoAAccountSchema } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

// GET: Ambil semua akun CoA (dengan tenant isolation)
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const id = searchParams.get('id');

        // Ambil single akun berdasarkan id
        if (id) {
            const account = await prisma.coAAccount.findFirst({
                where: { id, tenantId },
            });
            if (!account) {
                return NextResponse.json(
                    { success: false, message: 'Akun tidak ditemukan' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, data: account });
        }

        // Build filter
        const where: Record<string, unknown> = { tenantId };

        if (type && type !== 'all') {
            where.type = type;
        }

        if (search) {
            const q = search.toLowerCase();
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
            ];
        }

        const accounts = await prisma.coAAccount.findMany({
            where,
            orderBy: { code: 'asc' },
        });

        const activeCount = accounts.filter((a) => a.isActive).length;

        return NextResponse.json({
            success: true,
            data: accounts,
            meta: {
                total: accounts.length,
                active: activeCount,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST: Buat akun CoA baru
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Validasi input dengan Zod
        const validated = createCoAAccountSchema.parse(body);

        // Cek duplikat kode dalam scope tenant
        const existing = await prisma.coAAccount.findUnique({
            where: { tenantId_code: { tenantId, code: validated.code } },
        });
        if (existing) {
            return NextResponse.json(
                { success: false, message: `Kode akun ${validated.code} sudah digunakan` },
                { status: 409 }
            );
        }

        // Cek parent jika ada
        if (validated.parentId) {
            const parent = await prisma.coAAccount.findFirst({
                where: { id: validated.parentId, tenantId },
            });
            if (!parent) {
                return NextResponse.json(
                    { success: false, message: 'Akun induk tidak ditemukan' },
                    { status: 404 }
                );
            }
        }

        const newAccount = await prisma.coAAccount.create({
            data: {
                tenantId,
                code: validated.code,
                name: validated.name,
                type: validated.type,
                description: validated.description || '',
                parentId: validated.parentId || null,
                balance: validated.balance || 0,
                isActive: true,
            },
        });

        // Audit logging
        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CoAAccount',
            entityId: newAccount.id,
            newValues: newAccount as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Akun ${newAccount.name} berhasil dibuat`,
            data: newAccount,
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

// PUT: Perbarui akun CoA
export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID akun wajib diisi' },
                { status: 400 }
            );
        }

        // Validasi input dengan Zod
        const validated = updateCoAAccountSchema.parse(updateData);

        // Cek akun ada dan milik tenant ini
        const existing = await prisma.coAAccount.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'Akun tidak ditemukan' },
                { status: 404 }
            );
        }

        // Cek duplikat kode (kecuali akun sendiri)
        if (validated.code) {
            const duplicate = await prisma.coAAccount.findFirst({
                where: {
                    tenantId,
                    code: validated.code,
                    id: { not: id },
                },
            });
            if (duplicate) {
                return NextResponse.json(
                    { success: false, message: `Kode akun ${validated.code} sudah digunakan` },
                    { status: 409 }
                );
            }
        }

        // Cek parent jika diubah
        if (validated.parentId) {
            // Pastikan tidak menjadikan diri sendiri sebagai parent
            if (validated.parentId === id) {
                return NextResponse.json(
                    { success: false, message: 'Akun tidak bisa menjadi induk bagi diri sendiri' },
                    { status: 400 }
                );
            }
            const parent = await prisma.coAAccount.findFirst({
                where: { id: validated.parentId, tenantId },
            });
            if (!parent) {
                return NextResponse.json(
                    { success: false, message: 'Akun induk tidak ditemukan' },
                    { status: 404 }
                );
            }
        }

        const updated = await prisma.coAAccount.update({
            where: { id },
            data: {
                ...(validated.code && { code: validated.code }),
                ...(validated.name && { name: validated.name }),
                ...(validated.type && { type: validated.type }),
                ...(validated.description !== undefined && { description: validated.description }),
                ...(validated.parentId !== undefined && { parentId: validated.parentId }),
                ...(validated.balance !== undefined && { balance: validated.balance }),
                ...(validated.isActive !== undefined && { isActive: validated.isActive }),
            },
        });

        // Audit logging
        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'CoAAccount',
            entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            newValues: updated as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Akun ${updated.name} berhasil diperbarui`,
            data: updated,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE: Hapus akun CoA
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID akun wajib diisi' },
                { status: 400 }
            );
        }

        // Cek akun ada dan milik tenant ini
        const existing = await prisma.coAAccount.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'Akun tidak ditemukan' },
                { status: 404 }
            );
        }

        // Cek apakah memiliki sub-akun
        const children = await prisma.coAAccount.findMany({
            where: { parentId: id, tenantId },
        });
        if (children.length > 0) {
            return NextResponse.json(
                { success: false, message: 'Tidak bisa menghapus akun yang memiliki sub-akun' },
                { status: 400 }
            );
        }

        // Cek apakah ada transaksi bank yang terkait
        const linkedTransactions = await prisma.bankTransaction.findMany({
            where: { matchedAccountId: id, tenantId },
        });
        if (linkedTransactions.length > 0) {
            return NextResponse.json(
                { success: false, message: 'Tidak bisa menghapus akun yang memiliki transaksi terkait' },
                { status: 400 }
            );
        }

        await prisma.coAAccount.delete({ where: { id } });

        // Audit logging
        await logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'CoAAccount',
            entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            message: `Akun ${existing.name} berhasil dihapus`,
            data: { id },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
