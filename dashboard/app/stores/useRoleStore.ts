/**
 * Role Management Store for Dashboard
 *
 * Manages user roles and provides role-checking utilities
 * Works in conjunction with useAuthStore for complete auth state
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Available roles in the CNC Portal
 */
export enum UserRole {
  ROLE_USER = 'ROLE_USER',
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN'
}

/**
 * Role hierarchy for permission inheritance
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ROLE_USER]: [UserRole.ROLE_USER],
  [UserRole.ROLE_ADMIN]: [UserRole.ROLE_ADMIN, UserRole.ROLE_USER],
  [UserRole.ROLE_SUPER_ADMIN]: [UserRole.ROLE_SUPER_ADMIN, UserRole.ROLE_ADMIN, UserRole.ROLE_USER]
}

export const useRoleStore = defineStore('roles', () => {
  // State is managed via auth store
  const userStore = useUserStore()

  /**
   * Get current user's roles from auth store
   * Roles are decoded from JWT token
   */
  const userRoles = computed<UserRole[]>(() => {
    // Roles should be extracted from JWT token when auth is initialized
    // For now, return empty array if not set
    return (userStore.user?.roles as UserRole[]) || []
  })

  /**
   * Check if user has a specific role
   * Considers role hierarchy - higher roles inherit lower role permissions
   *
   * @param role - Role to check for
   * @returns true if user has the role (or a higher role)
   */
  const hasRole = (role: UserRole): boolean => {
    return userRoles.value.some((userRole) => {
      const hierarchy = ROLE_HIERARCHY[userRole]
      return hierarchy.includes(role)
    })
  }

  /**
   * Check if user has ANY of the specified roles
   *
   * @param roles - Array of roles to check
   * @returns true if user has at least one of the roles
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role))
  }

  /**
   * Check if user has ALL of the specified roles
   *
   * @param roles - Array of roles to check
   * @returns true if user has all of the roles
   */
  const hasAllRoles = (roles: UserRole[]): boolean => {
    return roles.every(role => hasRole(role))
  }

  /**
   * Computed property: Check if user is an admin
   * Returns true if user has ROLE_ADMIN or ROLE_SUPER_ADMIN
   */
  const isAdmin = computed(() => {
    return hasRole(UserRole.ROLE_ADMIN) || hasRole(UserRole.ROLE_SUPER_ADMIN)
  })

  /**
   * Computed property: Check if user is a super admin
   * Returns true if user has ROLE_SUPER_ADMIN
   */
  const isSuperAdmin = computed(() => {
    return hasRole(UserRole.ROLE_SUPER_ADMIN)
  })

  /**
   * Computed property: Check if user is a regular user
   * Returns true if user has at least ROLE_USER
   */
  const isRegularUser = computed(() => {
    return hasRole(UserRole.ROLE_USER)
  })

  /**
   * Get user's role level for display
   * Returns the highest role the user has
   */
  const highestRole = computed<UserRole | null>(() => {
    if (isSuperAdmin.value) return UserRole.ROLE_SUPER_ADMIN
    if (isAdmin.value) return UserRole.ROLE_ADMIN
    if (isRegularUser.value) return UserRole.ROLE_USER
    return null
  })

  /**
   * Get all user roles
   */
  const getAllRoles = (): UserRole[] => {
    return userRoles.value
  }

  /**
   * Get role description
   */
  const getRoleDescription = (role: UserRole): string => {
    const descriptions: Record<UserRole, string> = {
      [UserRole.ROLE_USER]: 'Regular user with basic access',
      [UserRole.ROLE_ADMIN]: 'Administrator with dashboard access',
      [UserRole.ROLE_SUPER_ADMIN]: 'Super administrator with full platform access'
    }
    return descriptions[role]
  }

  return {
    // State
    userRoles,

    // Methods
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getAllRoles,
    getRoleDescription,

    // Computed
    isAdmin,
    isSuperAdmin,
    isRegularUser,
    highestRole
  }
})
