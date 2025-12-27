/**
 * Role validation utilities for RBAC
 * 
 * Functions for checking user roles and permissions
 */

import { UserRole, UserRoles, ROLE_HIERARCHY } from '../types/roles';

/**
 * Check if a user has a specific role
 * Considers role hierarchy - higher roles include lower role permissions
 * 
 * @param userRoles - Array of roles the user has
 * @param requiredRole - Single role to check for
 * @returns true if user has the required role (or higher)
 */
export const hasRole = (userRoles: UserRoles, requiredRole: UserRole): boolean => {
  for (const userRole of userRoles) {
    const roleHierarchy = ROLE_HIERARCHY[userRole];
    if (roleHierarchy.includes(requiredRole)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if a user has ANY of the specified roles
 * Useful for endpoints that accept multiple role types
 * 
 * @param userRoles - Array of roles the user has
 * @param requiredRoles - Array of roles, user needs at least one
 * @returns true if user has at least one of the required roles
 */
export const hasAnyRole = (userRoles: UserRoles, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.some(role => hasRole(userRoles, role));
};

/**
 * Check if a user has ALL of the specified roles
 * Useful for endpoints that require multiple specific roles
 * 
 * @param userRoles - Array of roles the user has
 * @param requiredRoles - Array of roles, user must have all
 * @returns true if user has all of the required roles
 */
export const hasAllRoles = (userRoles: UserRoles, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.every(role => hasRole(userRoles, role));
};

/**
 * Check if a user is an admin (has ROLE_ADMIN or ROLE_SUPER_ADMIN)
 * 
 * @param userRoles - Array of roles the user has
 * @returns true if user is an admin
 */
export const isAdmin = (userRoles: UserRoles): boolean => {
  return (
    hasRole(userRoles, UserRole.ROLE_ADMIN) ||
    hasRole(userRoles, UserRole.ROLE_SUPER_ADMIN)
  );
};

/**
 * Check if a user is a super admin (has ROLE_SUPER_ADMIN)
 * 
 * @param userRoles - Array of roles the user has
 * @returns true if user is a super admin
 */
export const isSuperAdmin = (userRoles: UserRoles): boolean => {
  return hasRole(userRoles, UserRole.ROLE_SUPER_ADMIN);
};
