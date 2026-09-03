/**
 * TOTP (Time-based One-Time Password) Utility
 * 
 * Implements TOTP based on RFC 6238 using Node.js built-in crypto.
 * No external dependencies required.
 * 
 * Used for Two-Factor Authentication (2FA) setup and verification.
 */

import crypto from 'crypto';

// Base32 alphabet (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random base32 secret key for TOTP.
 * Returns a 16-character base32 string (80 bits of entropy).
 */
export function generateSecret(): string {
    const buffer = crypto.randomBytes(10); // 80 bits
    return base32Encode(buffer);
}

/**
 * Base32 encode a buffer.
 */
function base32Encode(buffer: Buffer): string {
    let bits = '';
    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, '0');
    }
    // Pad to multiple of 5
    while (bits.length % 5 !== 0) {
        bits += '0';
    }
    let result = '';
    for (let i = 0; i < bits.length; i += 5) {
        const index = parseInt(bits.substring(i, i + 5), 2);
        result += BASE32_CHARS[index];
    }
    return result;
}

/**
 * Base32 decode a string to a buffer.
 */
function base32Decode(encoded: string): Buffer {
    const normalized = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of normalized) {
        const index = BASE32_CHARS.indexOf(char);
        if (index === -1) continue;
        bits += index.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
    }
    return Buffer.from(bytes);
}

/**
 * Generate a TOTP code for a given secret and time step.
 * 
 * @param secret - Base32-encoded secret key
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits in the code (default: 6)
 * @returns The TOTP code as a string
 */
export function generateTOTP(
    secret: string,
    timeStep: number = 30,
    digits: number = 6
): string {
    const key = base32Decode(secret);
    const time = Math.floor(Date.now() / 1000 / timeStep);

    // Convert time to big-endian 8-byte buffer
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
    ) % Math.pow(10, digits);

    return code.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP code against the secret.
 * Checks current time step and ±1 time step for clock skew tolerance.
 * 
 * @param secret - Base32-encoded secret key
 * @param code - The code to verify
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits in the code (default: 6)
 * @returns true if the code is valid
 */
export function verifyTOTP(
    secret: string,
    code: string,
    timeStep: number = 30,
    digits: number = 6
): boolean {
    // Check current and ±1 time step for clock skew tolerance
    for (const offset of [-1, 0, 1]) {
        const key = base32Decode(secret);
        const time = Math.floor(Date.now() / 1000 / timeStep) + offset;

        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(0, 0);
        timeBuffer.writeUInt32BE(time, 4);

        const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
        const dynamicOffset = hmac[hmac.length - 1] & 0x0f;
        const expectedCode = (
            ((hmac[dynamicOffset] & 0x7f) << 24) |
            ((hmac[dynamicOffset + 1] & 0xff) << 16) |
            ((hmac[dynamicOffset + 2] & 0xff) << 8) |
            (hmac[dynamicOffset + 3] & 0xff)
        ) % Math.pow(10, digits);

        if (expectedCode.toString().padStart(digits, '0') === code) {
            return true;
        }
    }
    return false;
}

/**
 * Generate backup codes for 2FA recovery.
 * Returns an array of 8 random 8-character alphanumeric codes.
 * 
 * @returns Array of plain-text backup codes
 */
export function generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 for clarity

    for (let i = 0; i < 8; i++) {
        let code = '';
        const buffer = crypto.randomBytes(8);
        for (let j = 0; j < 8; j++) {
            code += chars[buffer[j] % chars.length];
        }
        codes.push(code);
    }
    return codes;
}

/**
 * Hash backup codes for secure storage.
 * 
 * @param codes - Array of plain-text backup codes
 * @returns JSON string of hashed codes
 */
export async function hashBackupCodes(codes: string[]): Promise<string> {
    const bcrypt = await import('bcryptjs');
    const hashed = await Promise.all(
        codes.map(async (code) => {
            const hash = await bcrypt.hash(code.toLowerCase(), 10);
            return hash;
        })
    );
    return JSON.stringify(hashed);
}

/**
 * Verify a backup code against stored hashes.
 * 
 * @param code - The backup code to verify
 * @param storedHashesJson - JSON string of hashed backup codes
 * @returns Object with isValid boolean and updated hashes (with used code removed)
 */
export async function verifyBackupCode(
    code: string,
    storedHashesJson: string
): Promise<{ isValid: boolean; updatedHashes: string }> {
    const bcrypt = await import('bcryptjs');
    const hashes: string[] = JSON.parse(storedHashesJson);
    const codeLower = code.toLowerCase();

    for (let i = 0; i < hashes.length; i++) {
        const match = await bcrypt.compare(codeLower, hashes[i]);
        if (match) {
            // Remove used code
            hashes.splice(i, 1);
            return {
                isValid: true,
                updatedHashes: JSON.stringify(hashes),
            };
        }
    }

    return {
        isValid: false,
        updatedHashes: storedHashesJson,
    };
}

/**
 * Generate the otpauth:// URI for QR code generation.
 * Compatible with Google Authenticator, Authy, etc.
 * 
 * @param secret - Base32-encoded secret key
 * @param email - User's email address
 * @param issuer - Service name (default: 'Qalcuity')
 * @returns otpauth:// URI string
 */
export function generateOtpAuthUri(
    secret: string,
    email: string,
    issuer: string = 'Qalcuity'
): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
