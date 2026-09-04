import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { inviteTeamMemberSchema, updateTeamMemberSchema, formatZodError } from '@/lib/validation-schemas'
import { sanitizeObject } from '@/lib/sanitize'

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const members = await prisma.user.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        })

        const data = members.map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            avatar: member.avatar,
            status: member.isActive ? 'active' : 'inactive',
            isCurrentUser: member.id === userId,
            lastActive: member.lastLoginAt?.toISOString() || null,
            joinedAt: member.createdAt.toISOString(),
        }))

        return NextResponse.json({ success: true, data })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId, role: callerRole } = auth

        // Only ADMIN and SUPERADMIN can invite team members
        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Only admins can invite team members' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const sanitizedBody = sanitizeObject(body)

        const validation = inviteTeamMemberSchema.safeParse(sanitizedBody)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        const email = validation.data.email.trim().toLowerCase()
        const role = validation.data.role || 'MEMBER'

        // Check if user already exists in this tenant
        const existingUser = await prisma.user.findFirst({
            where: {
                email,
                tenantId,
                deletedAt: null,
            },
        })

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'User already exists in this team' },
                { status: 409 }
            )
        }

        // Create user with temporary password (they'll need to set their own)
        const bcrypt = await import('bcryptjs')
        const tempPassword = await bcrypt.hash('ChangeMe123!', 12)

        const newUser = await prisma.user.create({
            data: {
                email,
                name: validation.data.name?.trim() || email.split('@')[0],
                passwordHash: tempPassword,
                role,
                tenantId,
                isActive: false, // Inactive until they set their password
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'User',
            entityId: newUser.id,
            newValues: { email, role },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...newUser,
                status: newUser.isActive ? 'active' : 'pending',
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId, role: callerRole } = auth

        // Only ADMIN and SUPERADMIN can update team members
        if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Only admins can update team members' },
                { status: 403 }
            )
        }
        const body = await request.json()
        const sanitizedBody = sanitizeObject(body)

        const validation = updateTeamMemberSchema.safeParse(sanitizedBody)
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            )
        }

        // Prevent changing own role (owner protection)
        if (validation.data.memberId === userId) {
            return NextResponse.json(
                { success: false, error: 'Cannot change your own role' },
                { status: 403 }
            )
        }

        const updateData: Record<string, unknown> = {}
        if (validation.data.role) {
            // SECURITY: Block ALL SUPERADMIN role assignments — no exceptions.
            // The SUPERADMIN role is exclusively for the platform owner (info@qalcuity.com)
            // and can ONLY be assigned via direct database operation by the platform owner.
            // This prevents privilege escalation even by existing SUPERADMIN users.
            if (validation.data.role === 'SUPERADMIN') {
                return NextResponse.json(
                    { success: false, error: 'Cannot assign SUPERADMIN role — platform owner only' },
                    { status: 403 }
                )
            }
            updateData.role = validation.data.role
        }
        if (validation.data.isActive !== undefined) {
            updateData.isActive = validation.data.isActive
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid fields to update' },
                { status: 400 }
            )
        }

        const member = await prisma.user.findFirst({
            where: { id: validation.data.memberId, tenantId, deletedAt: null },
        })

        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Member not found' },
                { status: 404 }
            )
        }

        const updated = await prisma.user.update({
            where: { id: validation.data.memberId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'User',
            entityId: validation.data.memberId,
            oldValues: { role: member.role, isActive: member.isActive },
            newValues: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                ...updated,
                status: updated.isActive ? 'active' : 'inactive',
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth
        const { searchParams } = new URL(request.url)
        const memberId = searchParams.get('id')

        if (!memberId) {
            return NextResponse.json(
                { success: false, error: 'Member ID is required' },
                { status: 400 }
            )
        }

        // Prevent self-deletion
        if (memberId === userId) {
            return NextResponse.json(
                { success: false, error: 'Cannot remove yourself from the team' },
                { status: 403 }
            )
        }

        const member = await prisma.user.findFirst({
            where: { id: memberId, tenantId, deletedAt: null },
        })

        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Member not found' },
                { status: 404 }
            )
        }

        // Soft delete
        await prisma.user.update({
            where: { id: memberId },
            data: { deletedAt: new Date(), isActive: false },
        })

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'User',
            entityId: memberId,
            oldValues: { name: member.name, email: member.email, role: member.role },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
