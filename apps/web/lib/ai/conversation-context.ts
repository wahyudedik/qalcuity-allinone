// ─── Multi-turn Context Manager ──────────────────────────────────────────────
// Simple in-memory context tracking (per tenant, per session).
// Stores last 5 queries + responses per session, tracks active module,
// supports pronoun resolution, and auto-expires after 30 minutes.

import { logger } from '@/lib/logger';
import type { IntentType, ModuleName } from './nlu-parser';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConversationTurn {
    /** User query */
    query: string;
    /** AI response */
    response: string;
    /** Detected intent */
    intent: IntentType;
    /** Detected module */
    moduleName?: ModuleName;
    /** Timestamp */
    timestamp: number;
}

export interface ContextState {
    /** Session identifier (userId + tenantId combo) */
    sessionId: string;
    /** Conversation turns (last 5) */
    turns: ConversationTurn[];
    /** Currently active module (if user asks about invoices, follow-up defaults to invoices) */
    activeModule?: ModuleName;
    /** Last activity timestamp */
    lastActivity: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TURNS = 5;
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

// ─── In-memory Store ─────────────────────────────────────────────────────────

const contextStore = new Map<string, ContextState>();

let lastCleanup = Date.now();

/**
 * Run cleanup of expired sessions.
 */
function cleanupExpiredSessions(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

    lastCleanup = now;
    let expired = 0;

    for (const [sessionId, state] of contextStore.entries()) {
        if (now - state.lastActivity > EXPIRY_MS) {
            contextStore.delete(sessionId);
            expired++;
        }
    }

    if (expired > 0) {
        logger.debug(`[ContextManager] Cleaned up ${expired} expired sessions`);
    }
}

// ─── Pronoun Resolution Patterns ─────────────────────────────────────────────

/**
 * Indonesian pronouns and references that refer to previous context.
 */
const REFERENCE_PATTERNS: RegExp[] = [
    // Indonesian
    /\b(yang\s*lain|sisanya|itu\s*saja|juga|lagi|sama|dengan\s*yang)\b/,
    /\b(bagaimana\s+dengan|gimana\s+dengan|gmn\s+dengan|kalau\s+dengan|kalo\s+dengan)\b/,
    /\b(dan\s+yang|lalu\s+yang|terus\s+yang|trus\s+yang)\b/,
    // English
    /\b(and\s+the\s+rest|the\s+others|also|what\s+about|how\s+about)\b/,
    /\b(and\s+those|and\s+that)\b/,
];

/**
 * Check if a query contains pronouns/references to previous context.
 */
function hasContextReference(query: string): boolean {
    const lower = query.toLowerCase();
    return REFERENCE_PATTERNS.some((pattern) => pattern.test(lower));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a session ID from tenantId and userId.
 */
export function getSessionId(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
}

/**
 * Get the current conversation context for a session.
 * Returns null if no context exists or if it has expired.
 *
 * @param sessionId - The session identifier
 * @returns ContextState or null
 */
export function getContext(sessionId: string): ContextState | null {
    cleanupExpiredSessions();

    const state = contextStore.get(sessionId);
    if (!state) return null;

    // Check expiry
    if (Date.now() - state.lastActivity > EXPIRY_MS) {
        contextStore.delete(sessionId);
        return null;
    }

    return state;
}

/**
 * Add a new turn to the conversation context.
 *
 * @param sessionId - The session identifier
 * @param query - User query
 * @param response - AI response
 * @param intent - Detected intent
 * @param moduleName - Detected module name
 */
export function addTurn(
    sessionId: string,
    query: string,
    response: string,
    intent: IntentType,
    moduleName?: ModuleName
): void {
    cleanupExpiredSessions();

    let state = contextStore.get(sessionId);

    if (!state) {
        state = {
            sessionId,
            turns: [],
            lastActivity: Date.now(),
        };
        contextStore.set(sessionId, state);
    }

    // Add new turn
    state.turns.push({
        query,
        response,
        intent,
        moduleName,
        timestamp: Date.now(),
    });

    // Keep only last MAX_TURNS
    if (state.turns.length > MAX_TURNS) {
        state.turns = state.turns.slice(-MAX_TURNS);
    }

    // Update active module
    if (moduleName) {
        state.activeModule = moduleName;
    }

    // Update last activity
    state.lastActivity = Date.now();

    logger.debug(`[ContextManager] Added turn to session ${sessionId}, activeModule=${state.activeModule}`);
}

/**
 * Check if a query needs context from previous conversation.
 * Returns the previous context if the query contains pronouns/references.
 *
 * @param sessionId - The session identifier
 * @param query - Current user query
 * @returns Previous turn context or null
 */
export function resolveContextReference(
    sessionId: string,
    query: string
): { previousQuery?: string; previousResponse?: string; activeModule?: ModuleName } | null {
    if (!hasContextReference(query)) return null;

    const state = getContext(sessionId);
    if (!state || state.turns.length === 0) return null;

    const lastTurn = state.turns[state.turns.length - 1];

    return {
        previousQuery: lastTurn?.query,
        previousResponse: lastTurn?.response,
        activeModule: state.activeModule,
    };
}

/**
 * Build conversation history messages for AI context.
 * Returns the last N turns as system messages.
 *
 * @param sessionId - The session identifier
 * @param maxTurns - Maximum number of previous turns to include (default: 3)
 * @returns Array of formatted context strings
 */
export function buildConversationHistory(
    sessionId: string,
    maxTurns: number = 3
): string[] {
    const state = getContext(sessionId);
    if (!state || state.turns.length === 0) return [];

    const recentTurns = state.turns.slice(-maxTurns);

    return recentTurns.map((turn) => {
        const timeAgo = Date.now() - turn.timestamp;
        const minutesAgo = Math.floor(timeAgo / 60000);
        const timeLabel = minutesAgo < 1 ? 'baru saja' : `${minutesAgo} menit lalu`;

        return `[Percakapan sebelumnya (${timeLabel})]
User: ${turn.query}
Intent: ${turn.intent}${turn.moduleName ? `, Module: ${turn.moduleName}` : ''}
AI: ${turn.response.substring(0, 200)}${turn.response.length > 200 ? '...' : ''}`;
    });
}

/**
 * Get the active module for a session.
 * Useful for follow-up queries that don't specify a module.
 *
 * @param sessionId - The session identifier
 * @returns ModuleName or undefined
 */
export function getActiveModule(sessionId: string): ModuleName | undefined {
    const state = getContext(sessionId);
    return state?.activeModule;
}

/**
 * Clear the context for a session (e.g., when user starts a new topic).
 *
 * @param sessionId - The session identifier
 */
export function clearContext(sessionId: string): void {
    contextStore.delete(sessionId);
    logger.debug(`[ContextManager] Cleared context for session ${sessionId}`);
}

/**
 * Get the total number of active sessions (for monitoring).
 */
export function getActiveSessionCount(): number {
    cleanupExpiredSessions();
    return contextStore.size;
}
