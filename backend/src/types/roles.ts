/**
 * Role-Based Access Control (RBAC) Types and Constants
 * 
 * This file defines all roles and permission constants for the CNC Portal.
 * All users have roles as an array, allowing for flexible permission modeling.
 */

/**
 * Available roles in the CNC Portal
 * Each user can have multiple roles
 */
export enum UserRole {
  /** Default role for all users - basic platform access */
  ROLE_USER = 'ROLE_USER',
  
  /** Administrator role - access to admin endpoints and dashboard */
  ROLE_ADMIN = 'ROLE_ADMIN',
  
  /** Super Admin role - full platform access including user management */
  ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN'
}

/**
 * Type for user roles array
 */
export type UserRoles = UserRole[];

/**
 * Type for role requirement in route protection
 * Can be a single role or an array of roles
 */
export type RequiredRoles = UserRole | UserRole[];

/**
 * Map of role descriptions for documentation
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ROLE_USER]: 'Default user role with basic platform access',
  [UserRole.ROLE_ADMIN]: 'Administrator with access to admin endpoints and dashboard',
  [UserRole.ROLE_SUPER_ADMIN]: 'Super administrator with full platform access and user management'
};

/**
 * Role hierarchy for permission inheritance
 * Super Admin inherits all Admin and User permissions
 * Admin inherits all User permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ROLE_USER]: [UserRole.ROLE_USER],
  [UserRole.ROLE_ADMIN]: [UserRole.ROLE_ADMIN, UserRole.ROLE_USER],
  [UserRole.ROLE_SUPER_ADMIN]: [UserRole.ROLE_SUPER_ADMIN, UserRole.ROLE_ADMIN, UserRole.ROLE_USER]
};

/**
 * Default roles assigned to new users
 */
export const DEFAULT_USER_ROLES: UserRoles = [UserRole.ROLE_USER];

/**
 * Admin-only roles (requires at least one of these)
 */
export const ADMIN_ROLES: UserRole[] = [UserRole.ROLE_ADMIN, UserRole.ROLE_SUPER_ADMIN];

/**
 * Super admin-only roles (requires at least one of these)
 */
export const SUPER_ADMIN_ROLES: UserRole[] = [UserRole.ROLE_SUPER_ADMIN];
