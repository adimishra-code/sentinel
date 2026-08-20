import { ROLE_PERMISSIONS, PERMISSIONS } from '../../types';
import { UserRole } from '../../types';

/**
 * Check if a user has a specific permission based on their role and explicit permissions
 */
export const hasPermission = (
  role: UserRole,
  explicitPermissions: string[],
  requiredPermission: string
): boolean => {
  // Platform admins have all permissions
  if (role === UserRole.PLATFORM_ADMIN) {
    return true;
  }

  // Get role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[role] || [];

  // Combine role permissions with explicit permissions
  const allPermissions = [...rolePermissions, ...explicitPermissions];

  return allPermissions.includes(requiredPermission);
};

/**
 * Get all permissions for a user based on role and explicit permissions
 */
export const getUserPermissions = (
  role: UserRole,
  explicitPermissions: string[] = []
): string[] => {
  // Platform admins have all permissions
  if (role === UserRole.PLATFORM_ADMIN) {
    return Object.values(PERMISSIONS);
  }

  // Get role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[role] || [];

  // Combine and deduplicate
  return Array.from(new Set([...rolePermissions, ...explicitPermissions]));
};

/**
 * Check if a role has a specific permission
 */
export const roleHasPermission = (role: UserRole, permission: string): boolean => {
  if (role === UserRole.PLATFORM_ADMIN) {
    return true;
  }

  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
};
