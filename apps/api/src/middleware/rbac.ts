/**
 * Role-Based Access Control (RBAC) middleware for Azure Functions.
 * Enforces permission checks based on user roles.
 */

import type { HttpResponseInit } from '@azure/functions';
import type { User, UserRole } from '@fire-sim/shared';

/**
 * Check if user has a specific role.
 */
export function hasRole(user: User, role: UserRole): boolean {
  return user.roles.includes(role);
}

/**
 * Check if user has any of the specified roles.
 */
export function hasAnyRole(user: User, roles: UserRole[]): boolean {
  return roles.some(role => user.roles.includes(role));
}

/**
 * Check if user has all of the specified roles.
 */
export function hasAllRoles(user: User, roles: UserRole[]): boolean {
  return roles.every(role => user.roles.includes(role));
}

/**
 * Check if user is an admin.
 */
export function isAdmin(user: User): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user is a trainer (or higher).
 */
export function isTrainer(user: User): boolean {
  return hasAnyRole(user, ['trainer', 'admin']);
}

/**
 * Create a 403 Forbidden response.
 */
export function createForbiddenResponse(message: string = 'Insufficient permissions'): HttpResponseInit {
  return {
    status: 403,
    jsonBody: {
      error: 'Forbidden',
      message,
    },
  };
}

/**
 * Require user to have a specific role.
 * Returns null if authorized, or a 403 response if not.
 */
export function requireRole(user: User, role: UserRole): HttpResponseInit | null {
  if (!hasRole(user, role)) {
    return createForbiddenResponse(`This action requires the '${role}' role`);
  }
  return null;
}

/**
 * Require user to have any of the specified roles.
 * Returns null if authorized, or a 403 response if not.
 */
export function requireAnyRole(user: User, roles: UserRole[]): HttpResponseInit | null {
  if (!hasAnyRole(user, roles)) {
    return createForbiddenResponse(`This action requires one of the following roles: ${roles.join(', ')}`);
  }
  return null;
}

/**
 * Require user to have all of the specified roles.
 * Returns null if authorized, or a 403 response if not.
 */
export function requireAllRoles(user: User, roles: UserRole[]): HttpResponseInit | null {
  if (!hasAllRoles(user, roles)) {
    return createForbiddenResponse(`This action requires all of the following roles: ${roles.join(', ')}`);
  }
  return null;
}

/**
 * Require user to be an admin.
 * Returns null if authorized, or a 403 response if not.
 */
export function requireAdmin(user: User): HttpResponseInit | null {
  if (!isAdmin(user)) {
    return createForbiddenResponse('This action requires admin privileges');
  }
  return null;
}

/**
 * Permission definitions for common actions.
 */
export const Permissions = {
  // Scenario actions
  CREATE_SCENARIO: (user: User) => isTrainer(user),
  VIEW_SCENARIO: (user: User) => isTrainer(user),
  DELETE_OWN_SCENARIO: (user: User) => isTrainer(user),
  DELETE_ANY_SCENARIO: (user: User) => isAdmin(user),

  // Image/video actions
  GENERATE_IMAGE: (user: User) => isTrainer(user),
  GENERATE_VIDEO: (user: User) => isTrainer(user),
  REGENERATE_VIEWPOINT: (user: User) => isTrainer(user),
  DOWNLOAD_OUTPUT: (user: User) => isTrainer(user),

  // Gallery actions
  VIEW_GALLERY: (user: User) => isTrainer(user),
  VIEW_OWN_SCENARIOS: (user: User) => isTrainer(user),
  VIEW_ALL_SCENARIOS: (user: User) => isAdmin(user),

  // Admin actions
  VIEW_USAGE_ANALYTICS: (user: User) => isAdmin(user),
  MANAGE_QUOTAS: (user: User) => isAdmin(user),
  VIEW_AUDIT_LOGS: (user: User) => isAdmin(user),
  UPDATE_SETTINGS: (user: User) => isAdmin(user),
  UPDATE_CONTENT_SAFETY_CONFIG: (user: User) => isAdmin(user),
};

/**
 * Check if user has permission for an action.
 * Returns null if authorized, or a 403 response if not.
 */
export function checkPermission(
  user: User,
  permission: (user: User) => boolean,
  action: string
): HttpResponseInit | null {
  if (!permission(user)) {
    return createForbiddenResponse(`You do not have permission to ${action}`);
  }
  return null;
}
