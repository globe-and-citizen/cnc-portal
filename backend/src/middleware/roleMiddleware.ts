/**
 * Role-based access control middleware
 * 
 * Middleware functions for protecting routes based on user roles
 */

import { Request, Response, NextFunction } from 'express';
// import { Address } from 'viem';
import { errorResponse } from '../utils/utils';
import { UserRole, UserRoles } from '../types/roles';
import { hasRole, hasAnyRole } from '../utils/roleUtils';

/**
 * Extended Express Request with decoded JWT data
 */
import 'express';

// declare module 'express' {
//   interface Request {
//     address?: Address;
//     roles?: UserRole[];
//   }
// }

/**
 * Middleware factory to require a specific role
 * Must be used AFTER the authorizeUser middleware
 * 
 * @param requiredRole - Single role that is required
 * @returns Express middleware function
 * 
 * @example
 * router.get('/admin-only', authorizeUser, requireRole(UserRole.ROLE_ADMIN), controller)
 */
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles: UserRoles = (req.user?.roles ?? []) as UserRoles;

    if (!hasRole(userRoles, requiredRole)) {
      return errorResponse(
        403,
        `Forbidden: This endpoint requires ${requiredRole} role`,
        res
      );
    }
    
    next();
  };
};

/**
 * Middleware factory to require ANY of the specified roles
 * Must be used AFTER the authorizeUser middleware
 * 
 * @param requiredRoles - Array of roles, user needs at least one
 * @returns Express middleware function
 * 
 * @example
 * router.get('/admin-area', authorizeUser, requireAnyRole([ROLE_ADMIN, ROLE_SUPER_ADMIN]), controller)
 */
export const requireAnyRole = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles: UserRoles = (req.user?.roles ?? []) as UserRoles;

    if (!hasAnyRole(userRoles, requiredRoles)) {
      return errorResponse(
        403,
        `Forbidden: This endpoint requires one of: ${requiredRoles.join(', ')}`,
        res
      );
    }

    next();
  };
};

/**
 * Middleware factory to require ALL of the specified roles
 * Must be used AFTER the authorizeUser middleware
 * 
 * @param requiredRoles - Array of roles, user must have all
 * @returns Express middleware function
 * 
 * @example
 * router.delete('/critical-action', authorizeUser, requireAllRoles([ROLE_ADMIN, ROLE_SPECIAL]), controller)
 */
export const requireAllRoles = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles: UserRoles = (req.user?.roles ?? []) as UserRoles;

    if (!hasAnyRole(userRoles, requiredRoles)) {
      return errorResponse(
        403,
        `Forbidden: This endpoint requires all of: ${requiredRoles.join(', ')}`,
        res
      );
    }

    next();
  };
};

/**
 * Quick middleware to require admin role
 * Convenience wrapper for requireAnyRole([ROLE_ADMIN, ROLE_SUPER_ADMIN])
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRoles = req.user?.roles || [];
  
  const isAdminRole = userRoles.some(role => 
    role === UserRole.ROLE_ADMIN || role === UserRole.ROLE_SUPER_ADMIN
  );

  if (!isAdminRole) {
    return errorResponse(403, 'Forbidden: Admin access required', res);
  }

  next();
};

/**
 * Quick middleware to require super admin role
 * Convenience wrapper for requireRole(ROLE_SUPER_ADMIN)
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRoles = req.user?.roles || [];

  if (!userRoles.includes(UserRole.ROLE_SUPER_ADMIN)) {
    return errorResponse(403, 'Forbidden: Super Admin access required', res);
  }

  next();
};
