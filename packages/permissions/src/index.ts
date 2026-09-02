// ─── @qalcuity/permissions ─────────────────────────────────────────────────────
// Permission Engine untuk Qalcuity Business Operating System.

// Types
export type {
    PermissionString,
    WildcardPermission,
    PermissionCheckResult,
    RoleDefinition,
    SystemRoleName,
    PermissionCategory,
    PermissionDefinition,
} from './types';

export { SUPERADMIN_WILDCARD } from './types';

// Permission Definitions
export {
    PERMISSIONS,
    ALL_PERMISSIONS,
    MODULE_PERMISSIONS,
    PERMISSION_CATEGORIES,
    getPermissionDef,
    isValidPermission,
} from './permissions';

// Role Definitions
export {
    SYSTEM_ROLE_PERMISSIONS,
    ROLE_HIERARCHY,
    SYSTEM_ROLES,
    isSystemRole,
    getRoleLevel,
    hasHigherPrivilege,
    getSystemRoleDescription,
} from './roles';

// Permission Engine
export { PermissionEngine } from './engine';
