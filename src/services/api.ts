const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export type Role = 'entrepreneur' | 'investor';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  social?: { linkedin?: string; twitter?: string; website?: string };
  startup?: {
    name?: string;
    description?: string;
    industry?: string;
    stage?: string;
    fundingNeeded?: number;
    founded?: number;
    teamSize?: number;
    website?: string;
  };
  investmentPreferences?: {
    industries?: string[];
    stages?: string[];
    ticketSizeMin?: number;
    ticketSizeMax?: number;
    portfolioSize?: number;
    totalInvested?: number;
    pastInvestments?: string[];
  };
  connections?: string[];
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  user: User;
}

export const tokenStore = {
  get: ()          => localStorage.getItem('nexus_access_token'),
  set: (t: string) => localStorage.setItem('nexus_access_token', t),
  clear: ()        => localStorage.removeItem('nexus_access_token'),
};

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, false);
    tokenStore.clear();
    window.location.href = '/login';
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data as T;
}

export const authAPI = {
  register: (payload: { name: string; email: string; password: string; role: Role }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{ success: boolean; user: User }>('/auth/me'),
};

async function refreshAccessToken(): Promise<boolean> {
  try {
    const data = await request<{ success: boolean; accessToken: string }>(
      '/auth/refresh', { method: 'POST' }, false
    );
    if (data.accessToken) { tokenStore.set(data.accessToken); return true; }
    return false;
  } catch {
    return false;
  }
}

export const profileAPI = {
  getMyProfile: () =>
    request<{ success: boolean; profile: User }>('/profiles/me'),

  updateMyProfile: (updates: Partial<User>) =>
    request<{ success: boolean; profile: User }>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  getProfile: (id: string) =>
    request<{ success: boolean; profile: User }>(`/profiles/${id}`),

  listProfiles: (params?: { role?: Role; page?: number; limit?: number; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; profiles: User[]; total: number; pages: number }>(`/profiles?${qs}`);
  },

  connect: (id: string) =>
    request<{ success: boolean; message: string; connected: boolean }>(
      `/profiles/${id}/connect`, { method: 'POST' }
    ),
};