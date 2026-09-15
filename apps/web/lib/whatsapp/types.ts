/**
 * WhatsApp Business API Types
 *
 * TypeScript interfaces for Meta Cloud API payloads.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** WhatsApp Business API configuration for a tenant */
export interface WhatsAppConfig {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
    verifyToken: string;
}

// ---------------------------------------------------------------------------
// Message Payloads
// ---------------------------------------------------------------------------

/** Text message payload */
export interface WhatsAppTextMessage {
    messaging_product: 'whatsapp';
    to: string;
    type: 'text';
    text: {
        preview_url?: boolean;
        body: string;
    };
}

/** Template message payload (for pre-approved Meta templates) */
export interface WhatsAppTemplateMessage {
    messaging_product: 'whatsapp';
    to: string;
    type: 'template';
    template: {
        name: string;
        language: {
            code: string;
        };
        components?: Array<{
            type: string;
            parameters: Array<{
                type: string;
                text: string;
            }>;
        }>;
    };
}

/** Combined message payload type */
export type WhatsAppMessagePayload = WhatsAppTextMessage | WhatsAppTemplateMessage;

// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------

/** Response from Meta Cloud API when sending a message */
export interface WhatsAppApiResponse {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}

// ---------------------------------------------------------------------------
// Webhook Events
// ---------------------------------------------------------------------------

/** Webhook event from Meta Cloud API (status updates, incoming messages) */
export interface WhatsAppWebhookEvent {
    object: string;
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                statuses?: Array<{
                    id: string;
                    status: string;
                    timestamp: string;
                    recipient_id: string;
                    errors?: Array<{
                        code: number;
                        title: string;
                        message: string;
                        error_data?: {
                            details: string;
                        };
                    }>;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    type: string;
                    text?: {
                        body: string;
                    };
                }>;
            };
            field: string;
        }>;
    }>;
}

// ---------------------------------------------------------------------------
// Send Result
// ---------------------------------------------------------------------------

/** Result of sending a WhatsApp message */
export interface SendWhatsAppResult {
    success: boolean;
    messageId?: string;
    error?: string;
    /** Indicates message was skipped due to no API key (dev mode) */
    skipped?: boolean;
}

// ---------------------------------------------------------------------------
// Message Status
// ---------------------------------------------------------------------------

/** WhatsApp message status values */
export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

/** WhatsApp message type values */
export type WhatsAppMessageType = 'text' | 'template' | 'image' | 'document';

/** WhatsApp message channel values */
export type WhatsAppMessageChannel =
    | 'invoice'
    | 'payment_reminder'
    | 'overdue'
    | 'order_confirmation'
    | 'shipping_notification'
    | 'test';

// ---------------------------------------------------------------------------
// Log Entry (for creating WhatsAppMessageLog records)
// ---------------------------------------------------------------------------

/** Data for logging a WhatsApp message to the database */
export interface WhatsAppLogEntry {
    tenantId: string;
    messageId?: string;
    to: string;
    type: WhatsAppMessageType;
    templateName?: string;
    status: WhatsAppMessageStatus;
    channel: WhatsAppMessageChannel;
    entityType?: string;
    entityId?: string;
    error?: string;
}
