/**
 * Mobile Authentication — JWT Token Library
 * 
 * Provides JWT token generation and verification for mobile app authentication.
 * Mobile apps cannot use NextAuth cookie-based sessions, so we use JWT tokens.
 * 
 * Token Strategy:
 * - Access Token: 24-hour expiry, contains user info + tenantId + role
 * - Refresh Token: 7-day expiry, used to obtain new access tokens
 * 
 * @see AGENT.md — Rule 5 (Do Not Touch) does NOT apply to this file.
 * This file is specifically created for mobile auth and is not part of the
 * core NextAuth system.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from './db';

// ─── Security: JWT_SECRET is MANDATORY ────────────────────────────────────────
const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
if (!jwtSecret) {
    throw new Error(
        '[MobileAuth] CRITICAL: JWT_SECRET (or NEXTAUTH_SECRET) is not set! ' +
        'Set it in apps/web/.env'
    );
}

// Separate secret for refresh tokens (defense-in-depth)
const refreshSecret = process.env.JWT_REFRESH_SECRET || `${jwtSecret}-refresh`;

// ─── Token Payload Types ──────────────────────────────────────────────────────

export interface MobileTokenPayload {
    userId: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    type: 'access';
}

export interface RefreshTokenPayload {
    userId: string;
    email: string;
    type: 'refresh';
}

export interface MobileUser {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    avatar?: string | null;
    isActive: boolean;
}

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * Generate JWT access token for mobile app (24h expiry).
 */
export function generateMobileToken(user: MobileUser): string {
    const payload: MobileTokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        type: 'access',
    };

    return jwt.sign(payload, jwtSecret as string, {
        expiresIn: '24h',
        issuer: 'qalcuity-mobile',
        audience: 'qalcuity-mobile-app',
    });
}

/**
 * Generate refresh token for mobile app (7-day expiry).
 */
export function generateRefreshToken(user: MobileUser): string {
    const payload: RefreshTokenPayload = {
        userId: user.id,
        email: user.email,
        type: 'refresh',
    };

    return jwt.sign(payload, refreshSecret as string, {
        expiresIn: '7d',
        issuer: 'qalcuity-mobile',
        audience: 'qalcuity-mobile-app',
    });
}

// ─── Token Verification ───────────────────────────────────────────────────────

/**
 * Verify JWT access token and return decoded payload.
 */
export function verifyMobileToken(token: string): MobileTokenPayload {
    const decoded = jwt.verify(token, jwtSecret as string, {
        issuer: 'qalcuity-mobile',
        audience: 'qalcuity-mobile-app',
    }) as MobileTokenPayload;

    if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
    }

    return decoded;
}

/**
 * Verify refresh token and return decoded payload.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
    const decoded = jwt.verify(token, refreshSecret as string, {
        issuer: 'qalcuity-mobile',
        audience: 'qalcuity-mobile-app',
    }) as RefreshTokenPayload;

    if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
    }

    return decoded;
}

// ─── Authentication Helpers ───────────────────────────────────────────────────

/**
 * Authenticate mobile user with email and password.
 * Returns user data + tokens on success, throws on failure.
 */
export async function authenticateMobileUser(
    email: string,
    password: string
): Promise<{ user: MobileUser; token: string; refreshToken: string }> {
    // Find user with tenant info
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { tenant: true },
    });

    if (!user) {
        throw new Error('Email tidak terdaftar');
    }

    if (!user.isActive) {
        throw new Error('Akun sudah dinonaktifkan');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Password salah');
    }

    // Update last login (non-blocking)
    prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    }).catch((err) => {
        console.error('[MobileAuth] Failed to update lastLoginAt:', err);
    });

    const mobileUser: MobileUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        avatar: user.avatar,
        isActive: user.isActive,
    };

    return {
        user: mobileUser,
        token: generateMobileToken(mobileUser),
        refreshToken: generateRefreshToken(mobileUser),
    };
}

/**
 * Get current user from access token.
 * Returns user data if token is valid, throws otherwise.
 */
export async function getMobileUserFromToken(token: string): Promise<MobileUser> {
    const payload = verifyMobileToken(token);

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
    });

    if (!user) {
        throw new Error('User tidak ditemukan');
    }

    if (!user.isActive) {
        throw new Error('Akun sudah dinonaktifkan');
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        avatar: user.avatar,
        isActive: user.isActive,
    };
}

/**
 * Refresh access token using refresh token.
 * Returns new tokens if refresh token is valid.
 */
export async function refreshMobileToken(
    refreshToken: string
): Promise<{ token: string; refreshToken: string }> {
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
    });

    if (!user) {
        throw new Error('User tidak ditemukan');
    }

    if (!user.isActive) {
        throw new Error('Akun sudah dinonaktifkan');
    }

    const mobileUser: MobileUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        avatar: user.avatar,
        isActive: user.isActive,
    };

    return {
        token: generateMobileToken(mobileUser),
        refreshToken: generateRefreshToken(mobileUser),
    };
}
