/**
 * PermissionEngine Unit Tests
 *
 * Tests untuk core permission checking logic:
 * - matchPermission: wildcard matching
 * - hasPermission: permission check dari array
 * - hasRolePermission: permission check dari role name
 * - resolvePermissions: wildcard expansion
 * - validatePermissions: format validation
 * - comparePermissions: set comparison
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionEngine } from '../engine';
import { ALL_PERMISSIONS, MODULE_PERMISSIONS } from '../permissions';
import { SYSTEM_ROLE_PERMISSIONS } from '../roles';

describe('PermissionEngine', () => {
    // ─── matchPermission ──────────────────────────────────────────────

    describe('matchPermission', () => {
        it('should match exact permission string', () => {
            expect(PermissionEngine.matchPermission('finance:view', 'finance:view')).toBe(true);
        });

        it('should match module wildcard (finance:* matches finance:view)', () => {
            expect(PermissionEngine.matchPermission('finance:view', 'finance:*')).toBe(true);
        });

        it('should NOT match module wildcard across modules (finance:* does NOT match crm:view)', () => {
            expect(PermissionEngine.matchPermission('crm:view', 'finance:*')).toBe(false);
        });

        it('should match global wildcard (* matches everything)', () => {
            expect(PermissionEngine.matchPermission('finance:view', '*')).toBe(true);
            expect(PermissionEngine.matchPermission('crm:create', '*')).toBe(true);
            expect(PermissionEngine.matchPermission('hr:approve', '*')).toBe(true);
        });

        it('should NOT match different action in same module (finance:view != finance:create)', () => {
            expect(PermissionEngine.matchPermission('finance:create', 'finance:view')).toBe(false);
        });

        it('should NOT match empty string', () => {
            expect(PermissionEngine.matchPermission('', '')).toBe(true); // exact match empty
            expect(PermissionEngine.matchPermission('finance:view', '')).toBe(false);
        });

        it('should NOT match partial module name (fin does NOT match finance:view)', () => {
            expect(PermissionEngine.matchPermission('finance:view', 'fin')).toBe(false);
        });

        it('should match module wildcard for all actions in module', () => {
            const financePerms = MODULE_PERMISSIONS['finance'];
            for (const action of financePerms) {
                expect(PermissionEngine.matchPermission(`finance:${action}`, 'finance:*')).toBe(true);
            }
        });
    });

    // ─── hasPermission ────────────────────────────────────────────────

    describe('hasPermission', () => {
        it('should return true when user has exact permission', () => {
            expect(PermissionEngine.hasPermission(['finance:view'], 'finance:view')).toBe(true);
        });

        it('should return false when user lacks permission', () => {
            expect(PermissionEngine.hasPermission(['finance:view'], 'finance:create')).toBe(false);
        });

        it('should return true when user has wildcard permission', () => {
            expect(PermissionEngine.hasPermission(['*'], 'anything:goes')).toBe(true);
        });

        it('should return false for empty permissions array', () => {
            expect(PermissionEngine.hasPermission([], 'finance:view')).toBe(false);
        });

        it('should return true when user has module wildcard', () => {
            expect(PermissionEngine.hasPermission(['finance:*'], 'finance:delete')).toBe(true);
            expect(PermissionEngine.hasPermission(['finance:*'], 'finance:view')).toBe(true);
        });

        it('should return false when module wildcard is from different module', () => {
            expect(PermissionEngine.hasPermission(['finance:*'], 'crm:view')).toBe(false);
        });
    });

    // ─── hasRolePermission ────────────────────────────────────────────

    describe('hasRolePermission', () => {
        it('should return true for SUPERADMIN with any permission', () => {
            expect(PermissionEngine.hasRolePermission('SUPERADMIN', 'finance:view')).toBe(true);
            expect(PermissionEngine.hasRolePermission('SUPERADMIN', 'audit:view')).toBe(true);
            expect(PermissionEngine.hasRolePermission('SUPERADMIN', 'settings:billing')).toBe(true);
        });

        it('should return false for VIEWER trying to create', () => {
            expect(PermissionEngine.hasRolePermission('VIEWER', 'finance:create')).toBe(false);
        });

        it('should return true for MEMBER with view permission', () => {
            expect(PermissionEngine.hasRolePermission('MEMBER', 'finance:view')).toBe(true);
        });

        it('should return true for ADMIN with most permissions', () => {
            expect(PermissionEngine.hasRolePermission('ADMIN', 'finance:edit')).toBe(true);
            expect(PermissionEngine.hasRolePermission('ADMIN', 'hr:approve')).toBe(true);
        });

        it('should return false for unknown role', () => {
            expect(PermissionEngine.hasRolePermission('UNKNOWN_ROLE', 'finance:view')).toBe(false);
        });

        it('should return false for VIEWER trying to delete', () => {
            expect(PermissionEngine.hasRolePermission('VIEWER', 'finance:delete')).toBe(false);
            expect(PermissionEngine.hasRolePermission('VIEWER', 'crm:delete')).toBe(false);
        });

        it('should return true for MEMBER with limited edit permissions', () => {
            expect(PermissionEngine.hasRolePermission('MEMBER', 'finance:edit')).toBe(true);
            expect(PermissionEngine.hasRolePermission('MEMBER', 'crm:edit')).toBe(true);
        });

        it('should return false for MEMBER without delete permission', () => {
            expect(PermissionEngine.hasRolePermission('MEMBER', 'finance:delete')).toBe(false);
            expect(PermissionEngine.hasRolePermission('MEMBER', 'hr:delete')).toBe(false);
        });
    });

    // ─── resolvePermissions ───────────────────────────────────────────

    describe('resolvePermissions', () => {
        it('should resolve global wildcard to all permissions', () => {
            const resolved = PermissionEngine.resolvePermissions(['*']);
            expect(resolved).toEqual(ALL_PERMISSIONS);
        });

        it('should resolve module wildcard to all module permissions', () => {
            const resolved = PermissionEngine.resolvePermissions(['finance:*']);
            expect(resolved).toContain('finance:view');
            expect(resolved).toContain('finance:create');
            expect(resolved).toContain('finance:edit');
            expect(resolved).toContain('finance:delete');
            expect(resolved).toContain('finance:approve');
            expect(resolved).toHaveLength(MODULE_PERMISSIONS['finance'].length);
        });

        it('should handle mixed wildcards and exact permissions', () => {
            const resolved = PermissionEngine.resolvePermissions(['finance:*', 'crm:view']);
            expect(resolved).toContain('finance:view');
            expect(resolved).toContain('finance:create');
            expect(resolved).toContain('crm:view');
            expect(resolved).not.toContain('crm:create');
        });

        it('should return empty array for empty input', () => {
            const resolved = PermissionEngine.resolvePermissions([]);
            expect(resolved).toEqual([]);
        });

        it('should ignore invalid permission strings', () => {
            const resolved = PermissionEngine.resolvePermissions(['invalid:perm', 'finance:view']);
            expect(resolved).toEqual(['finance:view']);
        });

        it('should resolve unknown module wildcard to empty for that module', () => {
            const resolved = PermissionEngine.resolvePermissions(['nonexistent:*']);
            expect(resolved).toEqual([]);
        });
    });

    // ─── validatePermissions ──────────────────────────────────────────

    describe('validatePermissions', () => {
        it('should return no errors for valid permission strings', () => {
            const result = PermissionEngine.validatePermissions(['finance:view', 'crm:create']);
            expect(result.valid).toBe(true);
            expect(result.invalid).toEqual([]);
        });

        it('should detect invalid format permission', () => {
            const result = PermissionEngine.validatePermissions(['invalidperm']);
            expect(result.valid).toBe(false);
            expect(result.invalid).toContain('invalidperm');
        });

        it('should detect unknown module in wildcard', () => {
            const result = PermissionEngine.validatePermissions(['nonexistent:*']);
            expect(result.valid).toBe(false);
            expect(result.invalid).toContain('nonexistent:*');
        });

        it('should accept global wildcard as valid', () => {
            const result = PermissionEngine.validatePermissions(['*']);
            expect(result.valid).toBe(true);
            expect(result.invalid).toEqual([]);
        });

        it('should accept valid module wildcards', () => {
            const result = PermissionEngine.validatePermissions(['finance:*', 'hr:*']);
            expect(result.valid).toBe(true);
            expect(result.invalid).toEqual([]);
        });

        it('should handle mix of valid and invalid permissions', () => {
            const result = PermissionEngine.validatePermissions([
                'finance:view',
                'totally:bad',
                'crm:create',
            ]);
            expect(result.valid).toBe(false);
            expect(result.invalid).toEqual(['totally:bad']);
        });
    });

    // ─── comparePermissions ───────────────────────────────────────────

    describe('comparePermissions', () => {
        it('should detect no changes for same permission sets', () => {
            const result = PermissionEngine.comparePermissions(
                ['finance:view', 'crm:create'],
                ['finance:view', 'crm:create']
            );
            expect(result.added).toEqual([]);
            expect(result.removed).toEqual([]);
            expect(result.common).toContain('finance:view');
            expect(result.common).toContain('crm:create');
        });

        it('should detect added and removed permissions', () => {
            const result = PermissionEngine.comparePermissions(
                ['finance:view', 'crm:create'],
                ['finance:view', 'hr:edit']
            );
            expect(result.added).toContain('hr:edit');
            expect(result.removed).toContain('crm:create');
            expect(result.common).toContain('finance:view');
        });

        it('should handle wildcard comparisons correctly', () => {
            const result = PermissionEngine.comparePermissions(
                ['*'],
                ['finance:view']
            );
            // After resolving, * = all permissions, finance:view = just one
            expect(result.common).toContain('finance:view');
            expect(result.removed.length).toBeGreaterThan(0);
            expect(result.added).toEqual([]);
        });

        it('should handle empty vs non-empty permission sets', () => {
            const result = PermissionEngine.comparePermissions([], ['finance:view']);
            expect(result.added).toContain('finance:view');
            expect(result.removed).toEqual([]);
            expect(result.common).toEqual([]);
        });
    });

    // ─── hasFlatPermission ────────────────────────────────────────────

    describe('hasFlatPermission', () => {
        it('should return true for exact match in flat array', () => {
            expect(PermissionEngine.hasFlatPermission(['finance:view', 'crm:create'], 'finance:view')).toBe(true);
        });

        it('should return false when not in flat array', () => {
            expect(PermissionEngine.hasFlatPermission(['finance:view'], 'finance:create')).toBe(false);
        });
    });

    // ─── getPermissionsByModule ───────────────────────────────────────

    describe('getPermissionsByModule', () => {
        it('should group permissions by module', () => {
            const result = PermissionEngine.getPermissionsByModule([
                'finance:view',
                'finance:create',
                'crm:view',
            ]);
            expect(result['finance']).toContain('view');
            expect(result['finance']).toContain('create');
            expect(result['crm']).toContain('view');
        });
    });

    // ─── hasFullModuleAccess ──────────────────────────────────────────

    describe('hasFullModuleAccess', () => {
        it('should return true for wildcard module access', () => {
            expect(PermissionEngine.hasFullModuleAccess(['finance:*'], 'finance')).toBe(true);
        });

        it('should return true for explicit all permissions', () => {
            expect(PermissionEngine.hasFullModuleAccess([
                'finance:view', 'finance:create', 'finance:edit', 'finance:delete', 'finance:approve'
            ], 'finance')).toBe(true);
        });

        it('should return false for partial module access', () => {
            expect(PermissionEngine.hasFullModuleAccess(['finance:view'], 'finance')).toBe(false);
        });

        it('should return false for unknown module', () => {
            expect(PermissionEngine.hasFullModuleAccess(['finance:view'], 'nonexistent')).toBe(false);
        });
    });
});
