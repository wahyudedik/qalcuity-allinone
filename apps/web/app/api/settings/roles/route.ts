import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { createRoleSchema, formatZodError } from '@/lib/validation-schemas'
import { SYSTEM_ROLE_PERMISSIONS, PermissionEngine, ALL_PERMISSIONS } from '@qalcuity/permissions'
import { sanitizeObject } from '@/lib/sanitize'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-error'

// ─── GET /api/settings/roles ───────────────────────────────────────────────────
// List semua roles (system + custom) untuk tenant ini.

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request)
        const rl = checkRateLimit(`settings:roles:${ip}`, 60, 60_000)
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth

        // Ambil custom roles dari database
        const customRoles = await prisma.role.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { users: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        // Bangun response dengan system roles + custom roles
        const systemRoles = Object.entries(SYSTEM_ROLE_PERMISSIONS).map(([name, permissions]) => ({
            id: `system_${name.toLowerCase()}`,
            name,
            description: getSystemRoleDescription(name),
            isSystem: true,
            permissions: PermissionEngine.resolvePermissions(permissions),
            userCount: 0, // Will be counted separately if needed
            createdAt: null,
            updatedAt: null,
        }))

        // Hitung user count per system role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            where: { tenantId, deletedAt: null },
            _count: { id: true },
        })

        const roleCountMap: Record<string, number> = {}
        for (const ur of usersByRole) {
            roleCountMap[ur.role] = ur._count.id
        }

        // Update system roles with user counts
        const systemRolesWithCount = systemRoles.map(sr => ({
            ...sr,
            userCount: roleCountMap[sr.name] || 0,
        }))

        const data = [
            ...systemRolesWithCount,
            ...customRoles.map(cr => ({
                id: cr.id,
                name: cr.name,
                description: cr.description ?? '',
                isSystem: cr.isSystem,
                permissions: (cr.permissions as string[]) || [],
                userCount: cr._count.users,
                createdAt: cr.createdAt.toISOString(),
                updatedAt: cr.updatedAt.toISOString(),
            })),
        ]

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return handleApiError(error)
    }
}

// ─── POST /api/settings/roles ──────────────────────────────────────────────────
// Buat custom role baru.

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request)
        const rl = checkRateLimit(`settings:roles:POST:${ip}`, 30, 60_000)
        if (!rl.success) {
            return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi nanti.' }, { status: 429 })
        }

        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { userId, tenantId } = auth

        const body = await request.json()
        const sanitizedBody = sanitizeObject(body)

        const validation = createRoleSchema.safeParse(sanitizedBody)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const { name, description, permissions } = validation.data

        // Validate permissions
        const { valid, invalid } = PermissionEngine.validatePermissions(permissions)
        if (!valid) {
            return NextResponse.json(
                { success: false, error: `Permission tidak valid: ${invalid.join(', ')}` },
                { status: 400 }
            )
        }

        // Check if role name already exists in this tenant (case-insensitive)
        const existingRole = await prisma.role.findFirst({
            where: {
                tenantId,
                name: { equals: name, mode: 'insensitive' },
            },
        })

        if (existingRole) {
            return NextResponse.json(
                { success: false, error: 'Role dengan nama ini sudah ada' },
                { status: 409 }
            )
        }

        // Check if name conflicts with system role names
        const systemRoleNames = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER']
        if (systemRoleNames.includes(name.toUpperCase())) {
            return NextResponse.json(
                { success: false, error: 'Nama role tidak boleh sama dengan system role' },
                { status: 400 }
            )
        }

        const newRole = await prisma.role.create({
            data: {
                tenantId,
                name,
                description: description || null,
                isSystem: false,
                permissions: permissions,
            },
        })

        // Audit log
        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Role',
            entityId: newRole.id,
            newValues: { name, permissions } as Record<string, unknown>,
        })

        return NextResponse.json({
            success: true,
            data: {
                id: newRole.id,
                name: newRole.name,
                description: newRole.description,
                isSystem: newRole.isSystem,
                permissions: newRole.permissions,
                userCount: 0,
                createdAt: newRole.createdAt.toISOString(),
                updatedAt: newRole.updatedAt.toISOString(),
            },
        }, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function getSystemRoleDescription(roleName: string): string {
    const descriptions: Record<string, string> = {
        SUPERADMIN: 'Full access ke semua fitur dan pengaturan platform',
        ADMIN: 'Akses penuh ke semua modul bisnis dan pengaturan',
        MEMBER: 'Akses terbatas untuk operasi sehari-hari',
        VIEWER: 'Hanya bisa melihat data, tidak bisa mengubah',
    }
    return descriptions[roleName] || ''
}
