import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, casesApi, analyticsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// Auth hooks
export function useAuthInit() {
  const { isAuthenticated, accessToken, setAuth, setLoading, clearAuth } = useAuthStore();

  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated && !!accessToken,
    retry: false,
    staleTime: Infinity,
  });

  // Initialize auth from stored tokens
  React.useEffect(() => {
    const stored = localStorage.getItem('sentinel-auth');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        if (state?.accessToken && state?.user) {
          setAuth(state.user, state.accessToken, state.refreshToken);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    }
    setLoading(false);
  }, [setAuth, clearAuth, setLoading]);

  // Update user when query succeeds
  React.useEffect(() => {
    if (userData && isAuthenticated) {
      useAuthStore.getState().updateUser(userData);
    }
  }, [userData, isAuthenticated]);

  // Clear auth on 401
  React.useEffect(() => {
    if (error && 'status' in error && error.status === 401) {
      clearAuth();
    }
  }, [error, clearAuth]);

  return { user: userData, isLoading: isLoading || useAuthStore.getState().isLoading };
}

// Case hooks
export function useCases(params?: { page?: number; limit?: number; status?: string; priority?: string; assignee?: string }) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => casesApi.list(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: () => casesApi.get(id),
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

export function useAssignCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => casesApi.assign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useResolveCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action: string; rationale: string } }) =>
      casesApi.resolve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

// Analytics hooks
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useContentAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'content'],
    queryFn: () => analyticsApi.getContent(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCaseAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'cases'],
    queryFn: () => analyticsApi.getCases(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDecisionAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'decisions'],
    queryFn: () => analyticsApi.getDecisions(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAppealAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'appeals'],
    queryFn: () => analyticsApi.getAppeals(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoryDistribution() {
  return useQuery({
    queryKey: ['analytics', 'categories'],
    queryFn: () => analyticsApi.getCategories(),
    staleTime: 1000 * 60 * 5,
  });
}

// Auth mutations
export function useLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: (data: { user: any; accessToken: string; refreshToken: string }) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string; organizationName: string }) =>
      authApi.register(data),
    onSuccess: (data: { user: any; accessToken: string; refreshToken: string }) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

export function useRefreshToken() {
  const { refreshToken, setAuth } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.refreshToken(refreshToken!),
    onSuccess: (data) => {
      const currentAuth = useAuthStore.getState();
      setAuth(currentAuth.user!, data.accessToken, data.refreshToken);
    },
    onError: () => {
      useAuthStore.getState().clearAuth();
    },
  });
}