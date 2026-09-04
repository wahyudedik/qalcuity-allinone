import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { updateRoleSchema, formatZodError } from '@/lib/validation-schemas'
import { PermissionEngine, SYSTEM_ROLE_PERMISSIONS } from '@qalcuity/permissions'
import { sanitizeObject } from '@/lib/sanitize'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// ─── GET /api/settings/roles/[id] ──────────────────────────────────────────────
// Get role details.

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rl = checkRateLimit(`settings:roles:[id]:${ip}`, 60, 60_000)
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        // Handle system roles
        if (id.startsWith('system_')) {
            const roleName = id.replace('system_', '').toUpperCase()
            const systemPermissions = SYSTEM_ROLE_PERMISSIONS[roleName]
            if (!systemPermissions) {
                return NextResponse.json(
                    { success: false, error: 'Role tidak ditemukan' },
                    { status: 404 }
                )
            }

            const descriptions: Record<string, string> = {
                SUPERADMIN: 'Full access ke semua fitur dan pengaturan platform',
                ADMIN: 'Akses penuh ke semua modul bisnis dan pengaturan',
                MEMBER: 'Akses terbatas untuk operasi sehari-hari',
                VIEWER: 'Hanya bisa melihat data, tidak bisa mengubah',
            }

            // Count users with this system role
            const userCount = await prisma.user.count({
                where: { tenantId, role: roleName, deletedAt: null },
            })

            return NextResponse.json({
                success: true,
                data: {
                    id,
                    name: roleName,
                    description: descriptions[roleName] || '',
                    isSystem: true,
                    permissions: PermissionEngine.resolvePermissions(systemPermissions),
                    userCount,
                },
            })
        }

        // Handle custom roles
        const role = await prisma.role.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        })

        if (!role) {
            return NextResponse.json(
                { success: false, error: 'Role tidak ditemukan' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                id: role.id,
                name: role.name,
                description: role.description,
                isSystem: role.isSystem,
                permissions: (role.permissions as string[]) || [],
                userCount: role._count.users,
                createdAt: role.createdAt.toISOString(),
                updatedAt: role.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

// ─── PUT /api/settings/roles/[id] ──────────────────────────────────────────────
// Update custom role.

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rl = checkRateLimit(`settings:roles:[id]:PUT:${ip}`, 30, 60_000)
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const { id } = params

        // System roles cannot be updated
        if (id.startsWith('system_')) {
            return NextResponse.json(
                { success: false, error: 'System role tidak bisa diubah' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const sanitizedBody = sanitizeObject(body)

        const validation = updateRoleSchema.safeParse(sanitizedBody)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        // Find existing role
        const existingRole = await prisma.role.findFirst({
            where: { id, tenantId },
        })

        if (!existingRole) {
            return NextResponse.json(
                { success: false, error: 'Role tidak ditemukan' },
                { status: 404 }
            )
        }

        if (existingRole.isSystem) {
            return NextResponse.json(
                { success: false, error: 'System role tidak bisa diubah' },
                { status: 400 }
            )
        }

        const { name, description, permissions } = validation.data

        // Validate permissions if provided
        if (permissions) {
            const { valid, invalid } = PermissionEngine.validatePermissions(permissions)
            if (!valid) {
                return NextResponse.json(
                    { success: false, error: `Permission tidak valid: ${invalid.join(', ')}` },
                    { status: 400 }
                )
            }
        }

        // Check name uniqueness if changed
        if (name && name !== existingRole.name) {
            const nameExists = await prisma.role.findFirst({
                where: {
                    tenantId,
                    name: { equals: name, mode: 'insensitive' },
                    id: { not: id },
                },
            })

            if (nameExists) {
                return NextResponse.json(
                    { success: false, error: 'Role dengan nama ini sudah ada' },
                    { status: 409 }
                )
            }

            // Check system role names
            const systemRoleNames = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER']
            if (systemRoleNames.includes(name.toUpperCase())) {
                return NextResponse.json(
                    { success: false, error: 'Nama role tidak boleh sama dengan system role' },
                    { status: 400 }
                )
            }
        }

        const updatedRole = await prisma.role.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(permissions && { permissions }),
            },
        })

        // Audit log
        await logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Role',
            entityId: id,
            oldValues: {
                name: existingRole.name,
                permissions: existingRole.permissions,
            },
            newValues: {
                name: updatedRole.name,
                permissions: updatedRole.permissions,
            } as Record<string, unknown>,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updatedRole.id,
                name: updatedRole.name,
                description: updatedRole.description,
                isSystem: updatedRole.isSystem,
                permissions: updatedRole.permissions,
                createdAt: updatedRole.createdAt.toISOString(),
                updatedAt: updatedRole.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

// ─── DELETE /api/settings/roles/[id] ───────────────────────────────────────────
// Delete custom role.

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request)
        const rl = checkRateLimit(`settings:roles:[id]:DELETE:${ip}`, 30, 60_000)
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth
        const { id } = params

        // System roles cannot be deleted
        if (id.startsWith('system_')) {
            return NextResponse.json(
                { success: false, error: 'System role tidak bisa dihapus' },
                { status: 400 }
            )
        }

        const existingRole = await prisma.role.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        })

        if (!existingRole) {
            return NextResponse.json(
                { success: false, error: 'Role tidak ditemukan' },
                { status: 404 }
            )
        }

        if (existingRole.isSystem) {
            return NextResponse.json(
                { success: false, error: 'System role tidak bisa dihapus' },
                { status: 400 }
            )
        }

        // Check if role is in use
        if (existingRole._count.users > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Role masih digunakan oleh ${existingRole._count.users} user. Ubah role user terlebih dahulu sebelum menghapus.`,
                },
                { status: 400 }
            )
        }

        await prisma.role.delete({ where: { id } })

        // Audit log
        await logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Role',
            entityId: id,
            oldValues: {
                name: existingRole.name,
                permissions: existingRole.permissions,
            } as Record<string, unknown>,
        })

        return NextResponse.json({ success: true, message: 'Role berhasil dihapus' })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
