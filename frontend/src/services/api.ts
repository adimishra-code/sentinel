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
};

export const analyticsApi = {
  getOverview: () => api.get<any>('/analytics/overview'),
  getContent: () => api.get<any>('/analytics/content'),
  getCases: () => api.get<any>('/analytics/cases'),
  getDecisions: () => api.get<any>('/analytics/decisions'),
  getAppeals: () => api.get<any>('/analytics/appeals'),
  getCategories: () => api.get<any>('/analytics/categories'),
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