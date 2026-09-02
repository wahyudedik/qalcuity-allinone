/**
 * @qalcuity/workflow
 *
 * Configurable Workflow Engine untuk Qalcuity.
 * Mendukung custom workflows per tenant, state machine validation,
 * conditional transitions, dan auto-transitions.
 *
 * @example
 * ```typescript
 * import { WorkflowEngine, DEFAULT_WORKFLOWS } from '@qalcuity/workflow';
 *
 * // Get available transitions
 * const transitions = WorkflowEngine.getTransitions('INVOICE', 'DRAFT');
 *
 * // Check if transition is valid
 * const canSend = WorkflowEngine.canTransition('INVOICE', 'DRAFT', 'SENT');
 *
 * // Execute transition
 * const result = WorkflowEngine.executeTransition('INVOICE', 'DRAFT', 'send');
 * // result: { success: true, fromState: 'DRAFT', toState: 'SENT', action: 'send' }
 * ```
 */

export { WorkflowEngine } from './engine';
export { DEFAULT_WORKFLOWS, SUPPORTED_ENTITY_TYPES } from './definitions';
export type {
    Transition,
    WorkflowDefinition,
    ValidationResult,
    TransitionResult,
    WorkflowEntityType,
    WorkflowKey,
} from './types';
export { ENTITY_TYPE_MAP } from './types';
