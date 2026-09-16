// ─── Session Tracker ─────────────────────────────────────────────────────────
// Tracks user login sessions and manages session lifecycle.
// Separated from auth.ts to comply with Do Not Touch rule.
//
// Features:
//   - Creates UserSession records on login
//   - Enforces max sessions limit per user (default: 5)
//   - Cleans up expired/inactive sessions
//   - Extracts device info from User-Agent string
//
// @see packages/db/prisma/schema.prisma — UserSession model

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { CronTaskResult } from '@/lib/cron-scheduler';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_MAX_SESSIONS = 5;
const SESSION_EXPIRY_DAYS = 30;
const CLEANUP_INACTIVE_DAYS = 30;

// ─── Device Parsing ──────────────────────────────────────────────────────────

/**
 * Parse User-Agent string to extract human-readable device info.
 * Examples: "Chrome on Windows", "Safari on iPhone", "Firefox on Linux"
 */
export function parseDeviceFromUserAgent(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown Device';

    const ua = userAgent.toLowerCase();

    // Detect OS
    let os = 'Unknown OS';
    if (ua.includes('windows nt 10')) os = 'Windows';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os x') || ua.includes('macintosh')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = ua.includes('ipad') ? 'iPad' : 'iPhone';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('cros')) os = 'Chrome OS';

    // Detect browser
    let browser = 'Unknown Browser';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome') && !ua.includes('edg/')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    return `${browser} on ${os}`;
}

// ─── Session Tracking ────────────────────────────────────────────────────────

/**
 * Track a login session by creating a UserSession record.
 * Enforces max sessions limit — deactivates oldest session if exceeded.
 *
 * Errors are caught and logged — this should never break the login flow.
 *
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param token - The JWT token
 * @param device - Optional device name (auto-detected from userAgent if not provided)
 * @param ipAddress - Client IP address
 * @param userAgent - Client User-Agent string
 */
export async function trackLoginSession(
    userId: string,
    tenantId: string,
    token: string,
    device?: string,
    ipAddress?: string,
    userAgent?: string,
): Promise<void> {
    try {
        const deviceName = device || parseDeviceFromUserAgent(userAgent);

        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

        // Check current active session count
        const activeSessions = await prisma.userSession.count({
            where: { userId, tenantId, isActive: true },
        });

        // If at max capacity, deactivate the oldest session
        if (activeSessions >= DEFAULT_MAX_SESSIONS) {
            const oldestSession = await prisma.userSession.findFirst({
                where: { userId, tenantId, isActive: true },
                orderBy: { lastActiveAt: 'asc' },
                select: { id: true },
            });

            if (oldestSession) {
                await prisma.userSession.update({
                    where: { id: oldestSession.id },
                    data: { isActive: false },
                });
                logger.info(`[SessionTracker] Deactivated oldest session ${oldestSession.id} for user ${userId} (max sessions: ${DEFAULT_MAX_SESSIONS})`);
            }
        }

        // Create new session record
        await prisma.userSession.create({
            data: {
                userId,
                tenantId,
                token,
                device: deviceName,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                expiresAt,
            },
        });

        logger.info(`[SessionTracker] Tracked login session for user ${userId} — device: ${deviceName}, ip: ${ipAddress || 'unknown'}`);
    } catch (error) {
        // Session tracking should never break the login flow
        logger.error('[SessionTracker] Failed to track login session', error);
    }
}

// ─── Session Cleanup (Cron Handler) ──────────────────────────────────────────

/**
 * Clean up expired and stale sessions.
 * - Deletes sessions where expiresAt < now
 * - Deactivates sessions where isActive = false and lastActiveAt > 30 days ago
 *
 * Registered as a cron task in the unified cron scheduler.
 *
 * @returns CronTaskResult with count of cleaned sessions
 */
export async function cleanupExpiredSessions(): Promise<CronTaskResult> {
    const now = new Date();
    let expiredDeleted = 0;
    let staleDeactivated = 0;

    try {
        // 1. Delete sessions that have expired
        const expiredResult = await prisma.userSession.deleteMany({
            where: {
                expiresAt: { lt: now },
            },
        });
        expiredDeleted = expiredResult.count;

        // 2. Deactivate stale sessions (inactive + last active > 30 days ago)
        const staleCutoff = new Date(now.getTime() - CLEANUP_INACTIVE_DAYS * 24 * 60 * 60 * 1000);
        const staleResult = await prisma.userSession.updateMany({
            where: {
                isActive: true,
                lastActiveAt: { lt: staleCutoff },
            },
            data: { isActive: false },
        });
        staleDeactivated = staleResult.count;

        const totalCleaned = expiredDeleted + staleDeactivated;

        if (totalCleaned > 0) {
            logger.info(`[SessionTracker] Cleanup: deleted ${expiredDeleted} expired, deactivated ${staleDeactivated} stale sessions`);
        }

        return {
            success: true,
            message: `Cleaned ${expiredDeleted} expired and deactivated ${staleDeactivated} stale sessions`,
            data: { expiredDeleted, staleDeactivated, totalCleaned },
        };
    } catch (error) {
        logger.error('[SessionTracker] Session cleanup failed', error);
        return {
            success: false,
            message: `Session cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

// ─── Session Update (Heartbeat) ──────────────────────────────────────────────

/**
 * Update the lastActiveAt timestamp for a session.
 * Called periodically to keep session alive.
 *
 * @param sessionId - The session ID to update
 */
export async function touchSession(sessionId: string): Promise<void> {
    try {
        await prisma.userSession.update({
            where: { id: sessionId },
            data: { lastActiveAt: new Date() },
        });
    } catch (error) {
        // Touch should never break the main flow
        logger.error('[SessionTracker] Failed to touch session', error);
    }
}
