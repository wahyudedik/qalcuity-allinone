/**
 * @qalcuity/workflow — Workflow Engine Core
 *
 * Mesin utama untuk memproses transisi state machine.
 * Mendukung validasi, conditional transitions, dan auto-transitions.
 */

import type {
    Transition,
    WorkflowDefinition,
    ValidationResult,
    TransitionResult,
} from './types';
import { DEFAULT_WORKFLOWS } from './definitions';

export class WorkflowEngine {
    // ─── Private Cache ───────────────────────────────────────────────────────

    /**
     * Cache untuk custom workflow definitions dari database.
     * Key: `${tenantId}:${entityType}`
     */
    private static customWorkflows: Map<string, WorkflowDefinition> = new Map();

    // ─── Public Methods ──────────────────────────────────────────────────────

    /**
     * Register custom workflow definition untuk tenant tertentu.
     * Dipanggil saat load workflow dari database.
     */
    static registerWorkflow(
        tenantId: string,
        entityType: string,
        definition: WorkflowDefinition
    ): void {
        const key = `${tenantId}:${entityType}`;
        WorkflowEngine.customWorkflows.set(key, definition);
    }

    /**
     * Hapus custom workflow dari cache (misal setelah update/delete).
     */
    static unregisterWorkflow(tenantId: string, entityType: string): void {
        const key = `${tenantId}:${entityType}`;
        WorkflowEngine.customWorkflows.delete(key);
    }

    /**
     * Hapus semua custom workflow dari cache.
     */
    static clearCache(): void {
        WorkflowEngine.customWorkflows.clear();
    }

    /**
     * Dapatkan workflow definition untuk entity type tertentu.
     * Prioritas: custom workflow > default workflow.
     */
    static getWorkflow(
        entityType: string,
        tenantId?: string
    ): WorkflowDefinition | null {
        // Cek custom workflow terlebih dahulu
        if (tenantId) {
            const key = `${tenantId}:${entityType}`;
            const custom = WorkflowEngine.customWorkflows.get(key);
            if (custom) return custom;
        }

        // Fallback ke default workflow
        const upper = entityType.toUpperCase();
        return DEFAULT_WORKFLOWS[upper] || null;
    }

    /**
     * Dapatkan semua transisi yang tersedia untuk state saat ini.
     * Hanya mengembalikan transisi non-auto.
     */
    static getTransitions(
        entityType: string,
        currentState: string,
        tenantId?: string
    ): Transition[] {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return [];

        return workflow.transitions.filter(
            (t) =>
                t.from.toUpperCase() === currentState.toUpperCase() &&
                !t.auto
        );
    }

    /**
     * Dapatkan semua transisi (termasuk auto) untuk state saat ini.
     */
    static getAllTransitions(
        entityType: string,
        currentState: string,
        tenantId?: string
    ): Transition[] {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return [];

        return workflow.transitions.filter(
            (t) => t.from.toUpperCase() === currentState.toUpperCase()
        );
    }

    /**
     * Cek apakah transisi dari state A ke state B valid.
     */
    static canTransition(
        entityType: string,
        from: string,
        to: string,
        tenantId?: string
    ): boolean {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return false;

        return workflow.transitions.some(
            (t) =>
                t.from.toUpperCase() === from.toUpperCase() &&
                t.to.toUpperCase() === to.toUpperCase()
        );
    }

    /**
     * Cek apakah transisi dari state A dengan action tertentu valid.
     */
    static canExecuteAction(
        entityType: string,
        currentState: string,
        action: string,
        tenantId?: string
    ): boolean {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return false;

        return workflow.transitions.some(
            (t) =>
                t.from.toUpperCase() === currentState.toUpperCase() &&
                t.action.toLowerCase() === action.toLowerCase()
        );
    }

    /**
     * Dapatkan state tujuan setelah action dieksekusi.
     * Mengembalikan null jika transisi tidak valid.
     */
    static getNextState(
        entityType: string,
        currentState: string,
        action: string,
        tenantId?: string
    ): string | null {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return null;

        const transition = workflow.transitions.find(
            (t) =>
                t.from.toUpperCase() === currentState.toUpperCase() &&
                t.action.toLowerCase() === action.toLowerCase()
        );

        return transition ? transition.to : null;
    }

    /**
     * Dapatkan semua transisi auto yang mungkin dari state tertentu.
     */
    static getAutoTransitions(
        entityType: string,
        currentState: string,
        tenantId?: string
    ): Transition[] {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return [];

        return workflow.transitions.filter(
            (t) =>
                t.from.toUpperCase() === currentState.toUpperCase() &&
                t.auto === true
        );
    }

    /**
     * Cek apakah state adalah initial state.
     */
    static isInitialState(
        entityType: string,
        state: string,
        tenantId?: string
    ): boolean {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return false;

        return workflow.initialState.toUpperCase() === state.toUpperCase();
    }

    /**
     * Cek apakah state adalah final state.
     */
    static isFinalState(
        entityType: string,
        state: string,
        tenantId?: string
    ): boolean {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return false;

        return workflow.finalStates.some(
            (s) => s.toUpperCase() === state.toUpperCase()
        );
    }

    /**
     * Dapatkan initial state untuk entity type.
     */
    static getInitialState(
        entityType: string,
        tenantId?: string
    ): string | null {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return null;

        return workflow.initialState;
    }

    /**
     * Dapatkan semua states untuk entity type.
     */
    static getStates(
        entityType: string,
        tenantId?: string
    ): string[] {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) return [];

        return [...workflow.states];
    }

    /**
     * Execute transisi dan return result.
     * Tidak melakukan update database — hanya validasi dan return result.
     * Caller bertanggung jawab untuk melakukan update database.
     */
    static executeTransition(
        entityType: string,
        currentState: string,
        action: string,
        tenantId?: string
    ): TransitionResult {
        const workflow = WorkflowEngine.getWorkflow(entityType, tenantId);
        if (!workflow) {
            return {
                success: false,
                fromState: currentState,
                toState: '',
                action,
                error: `Workflow not found for entity type: ${entityType}`,
            };
        }

        const transition = workflow.transitions.find(
            (t) =>
                t.from.toUpperCase() === currentState.toUpperCase() &&
                t.action.toLowerCase() === action.toLowerCase()
        );

        if (!transition) {
            return {
                success: false,
                fromState: currentState,
                toState: '',
                action,
                error: `Invalid transition: ${currentState} -> ${action}`,
            };
        }

        // Cek apakah source state valid
        if (!workflow.states.includes(transition.from)) {
            return {
                success: false,
                fromState: currentState,
                toState: '',
                action,
                error: `Invalid source state: ${transition.from}`,
            };
        }

        // Cek apakah target state valid
        if (!workflow.states.includes(transition.to)) {
            return {
                success: false,
                fromState: currentState,
                toState: '',
                action,
                error: `Invalid target state: ${transition.to}`,
            };
        }

        return {
            success: true,
            fromState: transition.from,
            toState: transition.to,
            action: transition.action,
        };
    }

    // ─── Validation ──────────────────────────────────────────────────────────

    /**
     * Validate workflow definition.
     * Cek apakah workflow valid (no dead ends, initial state exists, dll).
     */
    static validateWorkflow(workflow: WorkflowDefinition): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Cek states
        if (!workflow.states || workflow.states.length === 0) {
            errors.push('Workflow must have at least one state');
        }

        // Cek initialState
        if (!workflow.initialState) {
            errors.push('Workflow must have an initial state');
        } else if (
            workflow.states &&
            !workflow.states.includes(workflow.initialState)
        ) {
            errors.push(`Initial state "${workflow.initialState}" is not in states list`);
        }

        // Cek finalStates
        if (!workflow.finalStates || workflow.finalStates.length === 0) {
            warnings.push('Workflow has no final states');
        } else if (workflow.states) {
            for (const fs of workflow.finalStates) {
                if (!workflow.states.includes(fs)) {
                    errors.push(`Final state "${fs}" is not in states list`);
                }
            }
        }

        // Cek transitions
        if (!workflow.transitions) {
            errors.push('Workflow must have transitions');
        } else if (workflow.states) {
            for (const t of workflow.transitions) {
                // Cek source state exists
                if (!workflow.states.includes(t.from)) {
                    errors.push(
                        `Transition source state "${t.from}" is not in states list`
                    );
                }

                // Cek target state exists
                if (!workflow.states.includes(t.to)) {
                    errors.push(
                        `Transition target state "${t.to}" is not in states list`
                    );
                }

                // Cek duplicate transitions
                const duplicates = workflow.transitions.filter(
                    (tr) =>
                        tr.from === t.from &&
                        tr.to === t.to &&
                        tr.action === t.action
                );
                if (duplicates.length > 1) {
                    warnings.push(
                        `Duplicate transition: ${t.from} -> ${t.to} with action "${t.action}"`
                    );
                }
            }

            // Cek dead ends (states yang bukan final tapi tidak punya outgoing transition)
            for (const state of workflow.states) {
                if (workflow.finalStates.includes(state)) continue;

                const hasOutgoing = workflow.transitions.some(
                    (t) => t.from.toUpperCase() === state.toUpperCase()
                );
                if (!hasOutgoing) {
                    warnings.push(
                        `State "${state}" is not a final state and has no outgoing transitions (dead end)`
                    );
                }
            }

            // Cek unreachable states (selain initial state)
            const reachable = new Set<string>([workflow.initialState]);
            const queue = [workflow.initialState];
            while (queue.length > 0) {
                const current = queue.shift()!;
                for (const t of workflow.transitions) {
                    if (
                        t.from.toUpperCase() === current.toUpperCase() &&
                        !reachable.has(t.to)
                    ) {
                        reachable.add(t.to);
                        queue.push(t.to);
                    }
                }
            }

            for (const state of workflow.states) {
                if (!reachable.has(state)) {
                    warnings.push(
                        `State "${state}" is unreachable from initial state "${workflow.initialState}"`
                    );
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}
