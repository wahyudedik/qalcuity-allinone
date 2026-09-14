/**
 * Encryption utility for sensitive data at rest.
 * 
 * Uses AES-256-GCM (authenticated encryption) to protect SMTP passwords
 * and other sensitive credentials stored in the database.
 * 
 * Format: base64(iv):base64(authTag):base64(encrypted)
 * 
 * Requires SMTP_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Generate with: openssl rand -hex 32
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable.
 * Key must be 64 hex characters (32 bytes).
 */
function getEncryptionKey(): string {
    const key = process.env.SMTP_ENCRYPTION_KEY;
    if (!key) {
        throw new Error(
            'SMTP_ENCRYPTION_KEY environment variable is required. ' +
            'Generate one with: openssl rand -hex 32'
        );
    }
    return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * 
 * @param text - The plaintext string to encrypt
 * @returns Encrypted string in format: base64(iv):base64(authTag):base64(encrypted)
 */
export function encrypt(text: string): string {
    const key = Buffer.from(getEncryptionKey(), 'hex'); // 32 bytes
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv:authTag:encrypted (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt an encrypted string back to plaintext.
 * 
 * @param encryptedText - Encrypted string in format: base64(iv):base64(authTag):base64(encrypted)
 * @returns The original plaintext string
 */
export function decrypt(encryptedText: string): string {
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const [ivB64, authTagB64, encryptedB64] = encryptedText.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Check if a string is in encrypted format (base64:base64:base64).
 * Used for backward compatibility — plain text passwords from before
 * encryption was enabled can still be read.
 * 
 * @param text - The string to check
 * @returns true if the string matches the encrypted format
 */
export function isEncrypted(text: string): boolean {
    // Check if text matches encrypted format: base64:base64:base64
    return /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/.test(text);
}

/**
 * Safely decrypt a value — handles both encrypted and plain text (backward compat).
 * If the value is already encrypted, it decrypts it.
 * If it's plain text (from before encryption was enabled), returns as-is.
 * 
 * @param value - The value to potentially decrypt
 * @returns The decrypted or original value
 */
export function safeDecrypt(value: string | null | undefined): string | null {
    if (!value) return null;
    if (isEncrypted(value)) {
        return decrypt(value);
    }
    // Plain text (backward compatibility — old data before encryption)
    return value;
}
