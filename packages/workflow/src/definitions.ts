/**
 * @qalcuity/workflow — Default Workflow Definitions
 *
 * Berisi definisi default workflow untuk setiap entity type.
 * Workflow ini digunakan sebagai fallback jika tenant tidak
 * memiliki custom workflow definition.
 */

import type { Transition } from './types';

// ─── Invoice Workflow ─────────────────────────────────────────────────────────

const INVOICE_TRANSITIONS: Transition[] = [
    { from: 'DRAFT', to: 'SENT', action: 'send', permissions: ['finance:edit'] },
    { from: 'SENT', to: 'VIEWED', action: 'view', auto: true },
    { from: 'SENT', to: 'PAID', action: 'pay', permissions: ['finance:edit'] },
    { from: 'VIEWED', to: 'PAID', action: 'pay', permissions: ['finance:edit'] },
    { from: 'SENT', to: 'OVERDUE', action: 'overdue', auto: true, condition: 'days > 30' },
    { from: 'VIEWED', to: 'OVERDUE', action: 'overdue', auto: true, condition: 'days > 30' },
    { from: 'DRAFT', to: 'CANCELLED', action: 'cancel', permissions: ['finance:delete'] },
    { from: 'SENT', to: 'CANCELLED', action: 'cancel', permissions: ['finance:delete'] },
];

// ─── Quotation Workflow ──────────────────────────────────────────────────────

const QUOTATION_TRANSITIONS: Transition[] = [
    { from: 'DRAFT', to: 'SENT', action: 'send', permissions: ['finance:edit'] },
    { from: 'SENT', to: 'ACCEPTED', action: 'accept', permissions: ['finance:edit'] },
    { from: 'SENT', to: 'REJECTED', action: 'reject', permissions: ['finance:edit'] },
    { from: 'SENT', to: 'EXPIRED', action: 'expire', auto: true, condition: 'past_valid_until' },
    { from: 'DRAFT', to: 'CANCELLED', action: 'cancel', permissions: ['finance:delete'] },
    { from: 'ACCEPTED', to: 'CONVERTED', action: 'convert', permissions: ['finance:edit'] },
];

// ─── Purchase Order Workflow ─────────────────────────────────────────────────

const PURCHASE_ORDER_TRANSITIONS: Transition[] = [
    { from: 'DRAFT', to: 'SENT', action: 'send', permissions: ['finance:edit'] },
    { from: 'SENT', to: 'RECEIVED', action: 'receive', permissions: ['finance:edit'] },
    { from: 'DRAFT', to: 'CANCELLED', action: 'cancel', permissions: ['finance:delete'] },
    { from: 'SENT', to: 'CANCELLED', action: 'cancel', permissions: ['finance:delete'] },
];

// ─── Leave Request Workflow ──────────────────────────────────────────────────

const LEAVE_REQUEST_TRANSITIONS: Transition[] = [
    { from: 'PENDING', to: 'APPROVED', action: 'approve', permissions: ['hr:edit'] },
    { from: 'PENDING', to: 'REJECTED', action: 'reject', permissions: ['hr:edit'] },
    { from: 'PENDING', to: 'CANCELLED', action: 'cancel', permissions: ['hr:edit'] },
];

// ─── Payroll Workflow ────────────────────────────────────────────────────────

const PAYROLL_TRANSITIONS: Transition[] = [
    { from: 'DRAFT', to: 'PENDING_APPROVAL', action: 'submit', permissions: ['hr:edit'] },
    { from: 'PENDING_APPROVAL', to: 'APPROVED', action: 'approve', permissions: ['hr:edit'] },
    { from: 'PENDING_APPROVAL', to: 'REJECTED', action: 'reject', permissions: ['hr:edit'] },
    { from: 'APPROVED', to: 'PROCESSED', action: 'process', permissions: ['hr:edit'] },
    { from: 'PROCESSED', to: 'PAID', action: 'pay', permissions: ['hr:edit'] },
    { from: 'DRAFT', to: 'CANCELLED', action: 'cancel', permissions: ['hr:delete'] },
];

// ─── Deal Workflow ───────────────────────────────────────────────────────────

const DEAL_TRANSITIONS: Transition[] = [
    { from: 'LEAD', to: 'QUALIFICATION', action: 'qualify', permissions: ['crm:edit'] },
    { from: 'QUALIFICATION', to: 'PROPOSAL', action: 'propose', permissions: ['crm:edit'] },
    { from: 'PROPOSAL', to: 'NEGOTIATION', action: 'negotiate', permissions: ['crm:edit'] },
    { from: 'NEGOTIATION', to: 'CLOSED_WON', action: 'close_won', permissions: ['crm:edit'] },
    { from: 'NEGOTIATION', to: 'CLOSED_LOST', action: 'close_lost', permissions: ['crm:edit'] },
    { from: 'LEAD', to: 'CLOSED_LOST', action: 'close_lost', permissions: ['crm:edit'] },
    { from: 'QUALIFICATION', to: 'CLOSED_LOST', action: 'close_lost', permissions: ['crm:edit'] },
    { from: 'PROPOSAL', to: 'CLOSED_LOST', action: 'close_lost', permissions: ['crm:edit'] },
];

// ─── Default Workflows ──────────────────────────────────────────────────────

/**
 * Default workflow definitions untuk semua entity types.
 * Digunakan sebagai fallback jika tenant tidak memiliki custom workflow.
 */
export const DEFAULT_WORKFLOWS: Record<string, {
    states: string[];
    transitions: Transition[];
    initialState: string;
    finalStates: string[];
}> = {
    INVOICE: {
        states: ['DRAFT', 'SENT', 'VIEWED', 'OVERDUE', 'PAID', 'CANCELLED'],
        transitions: INVOICE_TRANSITIONS,
        initialState: 'DRAFT',
        finalStates: ['PAID', 'CANCELLED'],
    },
    QUOTATION: {
        states: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED'],
        transitions: QUOTATION_TRANSITIONS,
        initialState: 'DRAFT',
        finalStates: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED'],
    },
    PURCHASE_ORDER: {
        states: ['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'],
        transitions: PURCHASE_ORDER_TRANSITIONS,
        initialState: 'DRAFT',
        finalStates: ['RECEIVED', 'CANCELLED'],
    },
    LEAVE_REQUEST: {
        states: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        transitions: LEAVE_REQUEST_TRANSITIONS,
        initialState: 'PENDING',
        finalStates: ['APPROVED', 'REJECTED', 'CANCELLED'],
    },
    PAYROLL: {
        states: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED'],
        transitions: PAYROLL_TRANSITIONS,
        initialState: 'DRAFT',
        finalStates: ['PAID', 'CANCELLED'],
    },
    DEAL: {
        states: ['LEAD', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'],
        transitions: DEAL_TRANSITIONS,
        initialState: 'LEAD',
        finalStates: ['CLOSED_WON', 'CLOSED_LOST'],
    },
};

/**
 * Entity type keys yang didukung oleh workflow engine.
 */
export const SUPPORTED_ENTITY_TYPES = Object.keys(DEFAULT_WORKFLOWS) as string[];
