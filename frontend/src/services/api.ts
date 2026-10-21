const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authStore = JSON.parse(localStorage.getItem('sentinel-auth') || '{}');
  const accessToken = authStore.state?.accessToken;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details
    );
  }

  return data.data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError };

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; organizationName: string }) =>
    api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', data),
  logout: () => api.post('/auth/logout', {}),
  refreshToken: (refreshToken: string) => api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  getMe: () => api.get<any>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<any>('/auth/change-password', data),
  forgotPassword: (email: string) => api.post<any>('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post<any>('/auth/reset-password', data),
  getSessions: () => api.get<any[]>('/auth/sessions'),
  revokeSession: (sessionId: string) => api.delete<void>(`/auth/sessions/${sessionId}`),
  revokeAllSessions: () => api.post<void>('/auth/sessions/revoke-all', {}),
  mfaSetup: () => api.post<any>('/auth/2fa/setup', {}),
  mfaEnable: (code: string) => api.post<any>('/auth/2fa/enable', { code }),
  mfaVerify: (code: string) => api.post<any>('/auth/2fa/verify', { code }),
  mfaDisable: () => api.post<void>('/auth/2fa/disable', {}),
};

export const casesApi = {
  list: (params?: { page?: number; limit?: number; status?: string; priority?: string; assignee?: string }) => {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
    }
    return api.get<{ cases: any[]; meta: any }>(`/cases?${search.toString()}`);
  },
  get: (id: string) => api.get<any>(`/cases/${id}`),
  assign: (id: string) => api.post<any>(`/cases/${id}/assign`, {}),
  resolve: (id: string, data: { action: string; rationale: string }) =>
    api.post<any>(`/cases/${id}/resolve`, data),
  bulk: (data: { caseIds: string[]; operation: 'assign' | 'dismiss'; moderatorId?: string }) =>
    api.post<{ updated: number }>('/cases/bulk', data),
};

export const analyticsApi = {
  getOverview: () => api.get<any>('/analytics/overview'),
  getContent: () => api.get<any>('/analytics/content'),
  getCases: () => api.get<any>('/analytics/cases'),
  getDecisions: () => api.get<any>('/analytics/decisions'),
  getAppeals: () => api.get<any>('/analytics/appeals'),
  getCategories: () => api.get<any>('/analytics/categories'),
  getTimeseries: (days?: number) =>
    api.get<any[]>(`/analytics/timeseries${days ? `?days=${days}` : ''}`),
};

export const policiesApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
    }
    return api.get<{ items: any[]; pagination: any }>(`/policies?${search.toString()}`);
  },
  get: (id: string) => api.get<any>(`/policies/${id}`),
  create: (data: { name: string; description?: string; categories: any[]; rules?: any }) =>
    api.post<any>('/policies', data),
  update: (id: string, data: any) => api.patch<any>(`/policies/${id}`, data),
  activate: (id: string) => api.post<any>(`/policies/${id}/activate`, {}),
  archive: (id: string) => api.post<any>(`/policies/${id}/archive`, {}),
  getVersions: (id: string) => api.get<any[]>(`/policies/${id}/versions`),
};

export const notificationsApi = {
  list: (params?: { unread?: boolean; page?: number }) => {
    const search = new URLSearchParams();
    if (params?.unread) search.append('unread', 'true');
    if (params?.page) search.append('page', String(params.page));
    return api.get<{ items: any[]; unreadCount: number; pagination: any }>(
      `/notifications?${search.toString()}`
    );
  },
  markRead: (ids: string[]) => api.post<void>('/notifications/mark-read', { ids }),
  markAllRead: () => api.post<void>('/notifications/mark-all-read', {}),
};

export const integrationsApi = {
  listWebhooks: () => api.get<any[]>('/integrations/webhooks'),
  createWebhook: (data: { name: string; url: string; events: string[] }) =>
    api.post<any>('/integrations/webhooks', data),
  deleteWebhook: (id: string) => api.delete<void>(`/integrations/webhooks/${id}`),
  getDeliveries: (id: string) => api.get<any[]>(`/integrations/webhooks/${id}/deliveries`),
};

export const organizationsApi = {
  get: (id: string) => api.get<any>(`/organizations/${id}`),
  listMembers: (id: string) => api.get<any[]>(`/organizations/${id}/members`),
  update: (id: string, data: { name?: string }) => api.patch<any>(`/organizations/${id}`, data),
  inviteMember: (id: string, data: { email: string; role: string; permissions?: string[] }) =>
    api.post<any>(`/organizations/${id}/members/invite`, data),
  removeMember: (id: string, userId: string) =>
    api.delete<void>(`/organizations/${id}/members/${userId}`),
  updateMember: (id: string, userId: string, data: { role?: string; permissions?: string[] }) =>
    api.patch<any>(`/organizations/${id}/members/${userId}`, data),
};

export const apiKeysApi = {
  list: () => api.get<any[]>('/api-keys'),
  create: (data: { name: string; permissions: string[]; expiresInDays?: number; ipAllowlist?: string[] }) =>
    api.post<any>('/api-keys', data),
  revoke: (id: string) => api.delete<void>(`/api-keys/${id}`),
};

export const appealsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
    }
    return api.get<{ items: any[]; pagination: any }>(`/appeals?${search.toString()}`);
  },
  get: (id: string) => api.get<any>(`/appeals/${id}`),
  create: (data: { caseId: string; reason: string; evidence?: string }) =>
    api.post<any>('/appeals', data),
  resolve: (id: string, data: { outcome: string; reviewerNotes: string }) =>
    api.post<any>(`/appeals/${id}/resolve`, {
      status: data.outcome,
      outcomeRationale: data.reviewerNotes,
    }),
};

export const moderationApi = {
  submit: (data: {
    contentType: string;
    text?: string;
    imageUrls?: string[];
    urls?: string[];
    authorId?: string;
    sourcePlatform?: string;
    metadata?: Record<string, unknown>;
  }) => api.post<any>('/moderate', data),
  getContent: (id: string) => api.get<any>(`/content/${id}`),
  listContent: (params?: { page?: number; limit?: number; contentType?: string }) => {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
    }
    return api.get<any>(`/content?${search.toString()}`);
  },
};

export const auditApi = {
  list: (params?: {
    action?: string;
    actorId?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') search.append(key, String(value));
      });
    }
    return api.get<{ items: any[]; pagination: any }>(`/audit?${search.toString()}`);
  },
  getEntityTrail: (entityType: string, entityId: string) =>
    api.get<any[]>(`/audit/${entityType}/${entityId}`),
};

export const evaluationApi = {
  run: (data: { threshold?: number; useLLM?: boolean }) =>
    api.post<any>('/evaluation/run', data),
  listRuns: (params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
    }
    return api.get<{ items: any[]; pagination: any }>(`/evaluation/runs?${search.toString()}`);
  },
  getRun: (id: string) => api.get<any>(`/evaluation/runs/${id}`),
};