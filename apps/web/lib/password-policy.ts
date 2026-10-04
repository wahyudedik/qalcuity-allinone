/**
 * Password Policy Engine
 *
 * Provides per-tenant configurable password validation, history checking,
 * expiry detection, and lockout support.
 *
 * Uses Prisma PasswordPolicy model for tenant-specific configuration.
 */

import { prisma } from '@/lib/db';
import type { PasswordPolicy as PrismaPasswordPolicy } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PasswordPolicyConfig = PrismaPasswordPolicy;

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Password complexity rules — the structural subset shared by all policy
 * sources (per-tenant Prisma `PasswordPolicy` rows and the platform
 * `DEFAULT_POLICY` below).
 *
 * `validatePassword()` accepts any object that structurally satisfies this
 * interface, so both sources are validated with the same function.
 */
export interface PasswordPolicyRules {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    specialChars: string;
}

/** Full default policy shape (complexity rules + operational defaults). */
export interface PasswordPolicyDefaults extends PasswordPolicyRules {
    preventReuse: number;
    expiryDays: number;
    warnBeforeExpiryDays: number;
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
}

/**
 * Platform-wide default password policy — central config for SEC-07.
 *
 * Used when no per-tenant `PasswordPolicy` row exists yet (e.g. tenant
 * registration, first password reset). Tenants can override every rule via
 * `updatePasswordPolicy(tenantId, ...)`, which writes to the Prisma
 * `PasswordPolicy` model; routes then load the tenant policy with
 * `getDefaultPolicy(tenantId)`.
 *
 * Defaults: min 8 / max 128 chars; complexity rules (uppercase, lowercase,
 * number, special char) are disabled by default for backward compatibility —
 * enable them per-tenant as needed via `requireUppercase`, `requireLowercase`,
 * `requireNumbers`, `requireSpecialChars`.
 */
export const DEFAULT_POLICY: PasswordPolicyDefaults = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    preventReuse: 0,
    expiryDays: 0,
    warnBeforeExpiryDays: 7,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
};

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Validate a password against a tenant's password policy.
 *
 * @param password - The plaintext password to validate
 * @param policy - The password policy configuration
 * @returns { valid: boolean, errors: string[] } — errors are i18n keys
 */
export function validatePassword(
    password: string,
    policy: PasswordPolicyRules
): PasswordValidationResult {
    const errors: string[] = [];

    // Length checks
    if (password.length < policy.minLength) {
        errors.push('settings.passwordPolicy.validation.tooShort');
    }
    if (password.length > policy.maxLength) {
        errors.push('settings.passwordPolicy.validation.tooLong');
    }

    // Complexity checks
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('settings.passwordPolicy.validation.needUppercase');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('settings.passwordPolicy.validation.needLowercase');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('settings.passwordPolicy.validation.needNumber');
    }
    if (policy.requireSpecialChars) {
        // Build a regex from the configured special characters
        const escaped = policy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const specialRegex = new RegExp(`[${escaped}]`);
        if (!specialRegex.test(password)) {
            errors.push('settings.passwordPolicy.validation.needSpecial');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate a password against the platform-wide `DEFAULT_POLICY`.
 *
 * Convenience helper for flows where no per-tenant policy row exists yet
 * (e.g. tenant registration) — keeps the default policy centralized in this
 * module instead of duplicating rule objects in route handlers.
 *
 * @param password - The plaintext password to validate
 * @returns { valid: boolean, errors: string[] } — errors are i18n keys
 */
export function validatePasswordWithDefaults(password: string): PasswordValidationResult {
    return validatePassword(password, DEFAULT_POLICY);
}

/**
 * Check if a new password has been used recently (password history).
 *
 * @param userId - The user ID
 * @param newPasswordHash - The bcrypt hash of the new password
 * @param tenantId - The tenant ID (for scoping)
 * @param limit - Number of previous passwords to check
 * @returns true if password is OK (not reused), false if it was reused
 */
export async function checkPasswordHistory(
    userId: string,
    newPasswordHash: string,
    tenantId: string,
    limit: number
): Promise<boolean> {
    if (limit <= 0) return true;

    // Get the user to verify tenant ownership
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
    });

    if (!user || user.tenantId !== tenantId) return false;

    // Fetch recent password history entries
    const historyEntries = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { passwordHash: true },
    });

    // Compare the new hash against each historical hash
    // bcrypt.compareSync is used here for simplicity in batch comparison
    const bcrypt = await import('bcryptjs');
    for (const entry of historyEntries) {
        const isMatch = await bcrypt.compare(
            newPasswordHash.replace('$2y$', '$2a$'),
            entry.passwordHash
        );
        if (isMatch) {
            return false; // Password was reused
        }
    }

    return true; // Password is new
}

/**
 * Get or create the default password policy for a tenant.
 *
 * If no policy exists for the tenant, a default one is created automatically.
 *
 * @param tenantId - The tenant ID
 * @returns The tenant's password policy
 */
export async function getDefaultPolicy(tenantId: string): Promise<PasswordPolicyConfig> {
    const existing = await prisma.passwordPolicy.findUnique({
        where: { tenantId },
    });

    if (existing) {
        return existing;
    }

    // Create default policy for this tenant
    const created = await prisma.passwordPolicy.create({
        data: {
            tenantId,
            ...DEFAULT_POLICY,
        },
    });

    return created;
}

/**
 * Check if a user's password has expired based on the tenant's policy.
 *
 * @param userUpdatedAt - The user's last password update timestamp (updatedAt)
 * @param policy - The password policy
 * @returns true if password is expired
 */
export function isPasswordExpired(
    userUpdatedAt: Date,
    policy: PasswordPolicyConfig
): boolean {
    if (policy.expiryDays <= 0) return false; // Expiry disabled

    const now = new Date();
    const expiryMs = policy.expiryDays * 24 * 60 * 60 * 1000;
    const passwordAge = now.getTime() - userUpdatedAt.getTime();

    return passwordAge > expiryMs;
}

/**
 * Check if a user's password is about to expire (within warn period).
 *
 * @param userUpdatedAt - The user's last password update timestamp
 * @param policy - The password policy
 * @returns true if password will expire within warnBeforeExpiryDays
 */
export function isPasswordExpiringSoon(
    userUpdatedAt: Date,
    policy: PasswordPolicyConfig
): boolean {
    if (policy.expiryDays <= 0) return false;

    const now = new Date();
    const warnMs = policy.warnBeforeExpiryDays * 24 * 60 * 60 * 1000;
    const expiryMs = policy.expiryDays * 24 * 60 * 60 * 1000;
    const passwordAge = now.getTime() - userUpdatedAt.getTime();

    // Expiring soon if within warn period but not yet expired
    return passwordAge > expiryMs - warnMs && passwordAge <= expiryMs;
}

/**
 * Save a password to the history for a user.
 *
 * @param userId - The user ID
 * @param passwordHash - The bcrypt hash of the password
 */
export async function savePasswordHistory(
    userId: string,
    passwordHash: string
): Promise<void> {
    await prisma.passwordHistory.create({
        data: {
            userId,
            passwordHash,
        },
    });
}

/**
 * Get a summary of the active password policy rules for display.
 *
 * @param policy - The password policy
 * @returns Array of rule description strings (i18n keys)
 */
export function getActiveRules(policy: PasswordPolicyConfig): string[] {
    const rules: string[] = [];

    rules.push(`Min. ${policy.minLength} characters`);
    rules.push(`Max. ${policy.maxLength} characters`);

    if (policy.requireUppercase) rules.push('Uppercase letter required');
    if (policy.requireLowercase) rules.push('Lowercase letter required');
    if (policy.requireNumbers) rules.push('Number required');
    if (policy.requireSpecialChars) rules.push('Special character required');
    if (policy.preventReuse > 0) rules.push(`Cannot reuse last ${policy.preventReuse} passwords`);
    if (policy.expiryDays > 0) rules.push(`Password expires every ${policy.expiryDays} days`);
    if (policy.maxFailedAttempts > 0) rules.push(`Lock after ${policy.maxFailedAttempts} failed attempts`);

    return rules;
}

/**
 * Update the password policy for a tenant.
 *
 * @param tenantId - The tenant ID
 * @param updates - Partial policy updates
 * @returns The updated policy
 */
export async function updatePasswordPolicy(
    tenantId: string,
    updates: Partial<{
        minLength: number;
        maxLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        specialChars: string;
        preventReuse: number;
        expiryDays: number;
        warnBeforeExpiryDays: number;
        maxFailedAttempts: number;
        lockoutDurationMinutes: number;
    }>
): Promise<PasswordPolicyConfig> {
    // Ensure policy exists
    await getDefaultPolicy(tenantId);

    const updated = await prisma.passwordPolicy.update({
        where: { tenantId },
        data: updates,
    });

    return updated;
}
