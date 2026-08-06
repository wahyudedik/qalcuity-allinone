import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
    try {
        const auth = await requireAuth();

        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        logo: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.tenant?.phone || '',
                createdAt: user.createdAt.toISOString(),
                company: {
                    id: user.tenant?.id,
                    name: user.tenant?.name,
                    email: user.tenant?.email,
                    phone: user.tenant?.phone,
                    address: user.tenant?.address,
                    logo: user.tenant?.logo,
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requireAuth();
        const body = await request.json();

        const updateData: Record<string, string> = {};
        if (typeof body.name === 'string' && body.name.trim()) {
            updateData.name = body.name.trim();
        }
        if (typeof body.email === 'string' && body.email.trim()) {
            updateData.email = body.email.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const user = await prisma.user.update({
            where: { id: auth.userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
