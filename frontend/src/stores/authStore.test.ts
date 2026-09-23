import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should initialize with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should update state when setAuth is called', () => {
    const mockUser = {
      id: 'usr_1',
      name: 'Test Moderator',
      email: 'mod@sentinel.test',
      role: 'moderator',
      organizationId: 'org_1',
    };

    useAuthStore.getState().setAuth(mockUser, 'access_token_123', 'refresh_token_123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access_token_123');
    expect(state.isLoading).toBe(false);
  });

  it('should clear state on clearAuth', () => {
    useAuthStore.getState().setAuth(
      { id: '1', name: 'A', email: 'a@b.com', role: 'admin', organizationId: 'o1' },
      't1',
      't2'
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
