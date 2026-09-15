/**
 * WhatsApp Business API Client
 *
 * HTTP client for Meta Cloud API. Follows the same pattern as email.ts:
 * - Falls back to console.log when API is not configured (dev mode)
 * - All queries filter by tenantId for multi-tenant isolation
 * - Graceful error handling with logging
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type {
    WhatsAppConfig,
    WhatsAppMessagePayload,
    WhatsAppApiResponse,
    SendWhatsAppResult,
    WhatsAppLogEntry,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_API_VERSION = 'v18.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

/**
 * Fetch WhatsApp configuration from TenantIntegration for a given tenant.
 * Returns null if no WhatsApp integration is configured.
 */
export async function getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig | null> {
    try {
        const integration = await prisma.tenantIntegration.findFirst({
            where: {
                tenantId,
                type: 'whatsapp',
            },
        });

        if (!integration || !integration.apiKey) {
            return null;
        }

        // Config is stored in the config JSON field
        const config = integration.config as Record<string, unknown> | null;

        return {
            phoneNumberId: (config?.phoneNumberId as string) || '',
            accessToken: integration.apiKey, // API key stores the access token
            businessAccountId: (config?.businessAccountId as string) || '',
            verifyToken: (config?.verifyToken as string) || '',
        };
    } catch (error) {
        logger.error('[WhatsApp] Failed to fetch config', error);
        return null;
    }
}

/**
 * Check if WhatsApp is configured for a tenant.
 */
export async function isWhatsAppConfigured(tenantId: string): Promise<boolean> {
    const config = await getWhatsAppConfig(tenantId);
    return config !== null && Boolean(config.phoneNumberId && config.accessToken);
}

// ---------------------------------------------------------------------------
// Core sending function
// ---------------------------------------------------------------------------

/**
 * Send a WhatsApp message via Meta Cloud API.
 *
 * - If API is configured, sends via HTTP POST to Meta Graph API.
 * - If not configured, falls back to console.log (development mode).
 *
 * @param config - WhatsApp API configuration
 * @param payload - Message payload
 * @returns SendWhatsAppResult with success status and message ID
 */
export async function sendWhatsAppMessage(
    config: WhatsAppConfig,
    payload: WhatsAppMessagePayload
): Promise<SendWhatsAppResult> {
    try {
        // Validate config
        if (!config.phoneNumberId || !config.accessToken) {
            return {
                success: false,
                error: 'WhatsApp API not configured: missing phoneNumberId or accessToken',
            };
        }

        // --- Meta Cloud API path ---
        if (config.accessToken && config.accessToken !== 'dev-placeholder') {
            const url = `${META_GRAPH_URL}/${config.phoneNumberId}/messages`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const errorMessage =
                    (errorBody as Record<string, unknown>)?.error &&
                        typeof (errorBody as Record<string, unknown>).error === 'object'
                        ? ((errorBody as Record<string, Record<string, unknown>>).error.message as string) || 'Unknown API error'
                        : `HTTP ${response.status}`;

                logger.error('[WhatsApp] Meta API error', {
                    status: response.status,
                    error: errorMessage,
                });

                return {
                    success: false,
                    error: `Meta API error: ${errorMessage}`,
                };
            }

            const data: WhatsAppApiResponse = await response.json();
            const messageId = data.messages?.[0]?.id;

            logger.info('[WhatsApp] Message sent via Meta API', {
                messageId,
                to: payload.to,
                type: payload.type,
            });

            return {
                success: true,
                messageId,
            };
        }

        // --- Fallback: console.log (development / unconfigured API) ---
        logger.warn(
            '[WhatsApp] API not configured — falling back to console.log. ' +
            'Set WHATSAPP_API_KEY in .env to enable real message delivery.'
        );
        logger.info('[WhatsApp] Would be sent (API not configured)', {
            to: payload.to,
            type: payload.type,
        });

        return {
            success: true,
            messageId: `wa-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[WhatsApp] Failed to send message', error);
        return {
            success: false,
            error: `Gagal mengirim WhatsApp: ${message}`,
        };
    }
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Send a plain text WhatsApp message.
 *
 * @param tenantId - Tenant ID for config lookup
 * @param to - Recipient phone number (international format, e.g., +628123456789)
 * @param text - Message body
 * @param options - Optional channel and entity info for logging
 */
export async function sendTextMessage(
    tenantId: string,
    to: string,
    text: string,
    options?: {
        channel?: string;
        entityType?: string;
        entityId?: string;
    }
): Promise<SendWhatsAppResult> {
    const config = await getWhatsAppConfig(tenantId);

    // Dev mode fallback
    if (!config) {
        logger.info('[WhatsApp] Text message (not configured)', { tenantId, to, text });
        const result: SendWhatsAppResult = {
            success: true,
            messageId: `wa-dev-${Date.now()}`,
            skipped: true,
        };

        await logMessage(tenantId, {
            tenantId,
            messageId: result.messageId,
            to,
            type: 'text',
            status: 'sent',
            channel: (options?.channel as WhatsAppLogEntry['channel']) || 'test',
            entityType: options?.entityType,
            entityId: options?.entityId,
        });

        return result;
    }

    const payload: WhatsAppMessagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
    };

    const result = await sendWhatsAppMessage(config, payload);

    // Log to database
    await logMessage(tenantId, {
        tenantId,
        messageId: result.messageId,
        to,
        type: 'text',
        status: result.success ? 'sent' : 'failed',
        channel: (options?.channel as WhatsAppLogEntry['channel']) || 'test',
        entityType: options?.entityType,
        entityId: options?.entityId,
        error: result.error,
    });

    return result;
}

/**
 * Send a template-based WhatsApp message (for pre-approved Meta templates).
 *
 * @param tenantId - Tenant ID for config lookup
 * @param to - Recipient phone number
 * @param templateName - Name of the pre-approved template
 * @param params - Template parameters (replaced in order)
 * @param options - Optional channel and entity info for logging
 */
export async function sendTemplateMessage(
    tenantId: string,
    to: string,
    templateName: string,
    params: string[],
    options?: {
        channel?: string;
        entityType?: string;
        entityId?: string;
    }
): Promise<SendWhatsAppResult> {
    const config = await getWhatsAppConfig(tenantId);

    // Dev mode fallback
    if (!config) {
        logger.info('[WhatsApp] Template message (not configured)', {
            tenantId,
            to,
            templateName,
        });
        const result: SendWhatsAppResult = {
            success: true,
            messageId: `wa-dev-${Date.now()}`,
            skipped: true,
        };

        await logMessage(tenantId, {
            tenantId,
            messageId: result.messageId,
            to,
            type: 'template',
            templateName,
            status: 'sent',
            channel: (options?.channel as WhatsAppLogEntry['channel']) || 'test',
            entityType: options?.entityType,
            entityId: options?.entityId,
        });

        return result;
    }

    const payload: WhatsAppMessagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'id' },
            components: params.length > 0
                ? [
                    {
                        type: 'body',
                        parameters: params.map((p) => ({
                            type: 'text',
                            text: p,
                        })),
                    },
                ]
                : undefined,
        },
    };

    const result = await sendWhatsAppMessage(config, payload);

    // Log to database
    await logMessage(tenantId, {
        tenantId,
        messageId: result.messageId,
        to,
        type: 'template',
        templateName,
        status: result.success ? 'sent' : 'failed',
        channel: (options?.channel as WhatsAppLogEntry['channel']) || 'test',
        entityType: options?.entityType,
        entityId: options?.entityId,
        error: result.error,
    });

    return result;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/**
 * Log a WhatsApp message to the database.
 * Updates TenantIntegration.lastError on failure.
 */
export async function logMessage(
    tenantId: string,
    data: WhatsAppLogEntry
): Promise<void> {
    try {
        await prisma.whatsAppMessageLog.create({
            data: {
                tenantId,
                messageId: data.messageId || null,
                to: data.to,
                type: data.type,
                templateName: data.templateName || null,
                status: data.status,
                channel: data.channel,
                entityType: data.entityType || null,
                entityId: data.entityId || null,
                error: data.error || null,
            },
        });

        // Update lastError on TenantIntegration if failed
        if (data.status === 'failed' && data.error) {
            await prisma.tenantIntegration.updateMany({
                where: {
                    tenantId,
                    type: 'whatsapp',
                },
                data: {
                    lastError: data.error,
                    lastErrorAt: new Date(),
                },
            });
        }
    } catch (error) {
        // Don't throw — logging failure should not break message sending
        logger.error('[WhatsApp] Failed to log message', error);
    }
}
