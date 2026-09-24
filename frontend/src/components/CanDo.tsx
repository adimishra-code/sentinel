import React, { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { hasPermission, hasAnyRole } from '../utils/permissions';

interface CanDoProps {
  action?: string;
  roles?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Role & permission based UI guard component
 * Conditionally renders children if current user has the required action or role
 */
export const CanDo: React.FC<CanDoProps> = ({
  action,
  roles,
  fallback = null,
  children,
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  if (roles && !hasAnyRole(userRole, roles)) {
    return <>{fallback}</>;
  }

  if (action && !hasPermission(userRole, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
