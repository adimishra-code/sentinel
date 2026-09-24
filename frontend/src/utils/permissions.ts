export const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_admin: ['*'],
  org_admin: [
    'cases:read',
    'cases:assign',
    'cases:resolve',
    'policies:read',
    'policies:edit',
    'policies:activate',
    'analytics:read',
    'organizations:manage',
    'webhooks:manage',
    'audit:read',
  ],
  moderator: [
    'cases:read',
    'cases:assign',
    'cases:resolve',
    'policies:read',
    'analytics:read',
  ],
  reviewer: [
    'cases:read',
    'appeals:resolve',
    'policies:read',
    'analytics:read',
  ],
  end_user: [
    'cases:read_own',
    'appeals:create',
  ],
};

export const hasPermission = (userRole?: string | null, action?: string): boolean => {
  if (!userRole) return false;
  if (!action) return true;

  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes('*')) return true;

  return permissions.includes(action);
};

export const hasAnyRole = (userRole?: string | null, allowedRoles?: string[]): boolean => {
  if (!userRole) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};
