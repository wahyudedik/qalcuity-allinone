export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ─── Reset Password Schema ────────────────────
const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    newPassword: z.string().min(8, MSG.PASSWORD_MIN_LENGTH),
});

// ─── POST /api/auth/reset-password ─────────────
// Validates the reset token and sets a new password.
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validated = resetPasswordSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            );
        }
        const { token, newPassword } = validated.data;

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
            },
            select: { id: true, resetTokenExpiry: true },
        });

        // Validate token exists and hasn't expired
        if (!user || !user.resetTokenExpiry) {
            return NextResponse.json(
                { success: false, error: MSG.RESET_TOKEN_INVALID_OR_EXPIRED },
                { status: 400 }
            );
        }

        if (new Date() > user.resetTokenExpiry) {
            return NextResponse.json(
                { success: false, error: MSG.RESET_TOKEN_INVALID_OR_EXPIRED },
                { status: 400 }
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password and clear reset token fields
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: MSG.PASSWORD_RESET_SUCCESS,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
