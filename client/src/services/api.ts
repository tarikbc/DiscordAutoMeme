import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../types/auth';
import { DiscordAccount, CreateAccountRequest, UpdateAccountRequest } from '../types/account';
import { PerformanceAlertConfig } from './socketService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types for API responses
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string[]> | Array<{ msg: string }>;
  status?: number;
}

// Dashboard response types
interface AccountStats {
  total: number;
  active: number;
  inactive: number;
  connected: number;
  disconnected: number;
  accounts: Array<{
    id: string;
    name: string;
    status: string;
    isActive: boolean;
  }>;
}

interface ActivityData {
  activity: Array<{
    id: string;
    accountId: string;
    accountName: string;
    type: string;
    name: string;
    startTime: string;
    endTime?: string;
    duration?: number;
  }>;
  total: number;
}

interface ContentStats {
  totalSent: number;
  sentByDay: Array<{
    date: string;
    count: number;
  }>;
  topFriends: Array<{
    friendId: string;
    friendName: string;
    count: number;
  }>;
  contentTypes: Array<{
    type: string;
    count: number;
  }>;
}

interface SystemMetrics {
  current: {
    cpu: number;
    memory: number;
    threadCount: number;
    activeWorkers: number;
    connectedAccounts: number;
  };
  history: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    threadCount: number;
    activeWorkers: number;
  }>;
}

interface SetupStep {
  id: string;
  name: string;
  completed: boolean;
  order: number;
}

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds auth token to requests
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Create a new headers object
      const headers = new AxiosHeaders({
        ...config.headers,
        Authorization: `Bearer ${token}`,
      });
      config.headers = headers;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor - handles token refresh on 401 errors
axiosInstance.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Check if the request is not a login request and if it resulted in a 401 error
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/login'
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          // No refresh token, force logout
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post<{ token: string; refreshToken: string }>(
          `${API_URL}/auth/refresh`,
          { refreshToken },
        );

        const { token, refreshToken: newRefreshToken } = response.data;

        // Save new tokens
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', newRefreshToken);

        // Update authorization header
        if (originalRequest.headers) {
          // Create a new headers object with the authorization
          const headers = new AxiosHeaders({
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          });
          originalRequest.headers = headers;
        }

        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, force logout
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Generic request handling
const handleRequest = async <T>(request: Promise<AxiosResponse<T>>): Promise<T> => {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      // Format error message
      let errorMessage = 'Something went wrong';

      if (axiosError.response?.data?.error) {
        errorMessage = axiosError.response.data.error;
      } else if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError.response?.data?.errors) {
        const errors = axiosError.response.data.errors;
        const firstError = Array.isArray(errors) ? errors[0]?.msg : Object.values(errors)[0]?.[0];
        if (firstError) {
          errorMessage = firstError;
        }
      }

      throw new Error(errorMessage);
    }
    throw error;
  }
};

// API client with typed methods for all endpoints
const api = {
  // Auth endpoints
  auth: {
    login: (data: LoginRequest) =>
      handleRequest<LoginResponse>(axiosInstance.post('/auth/login', data)),

    register: (data: RegisterRequest) =>
      handleRequest<LoginResponse>(axiosInstance.post('/auth/register', data)),

    logout: () => handleRequest<{ success: boolean }>(axiosInstance.post('/auth/logout')),

    refreshToken: (refreshToken: string) =>
      handleRequest<{ token: string; refreshToken: string }>(
        axiosInstance.post('/auth/refresh', { refreshToken }),
      ),

    forgotPassword: (email: string) =>
      handleRequest<{ success: boolean }>(axiosInstance.post('/auth/forgot-password', { email })),

    resetPassword: (token: string, newPassword: string) =>
      handleRequest<{ success: boolean }>(
        axiosInstance.post('/auth/reset-password', { token, newPassword }),
      ),
  },

  // User endpoints
  users: {
    getProfile: () => handleRequest<User>(axiosInstance.get('/users/profile')),

    updateProfile: (data: { name?: string; email?: string }) =>
      handleRequest<User>(axiosInstance.put('/users/profile', data)),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      handleRequest<{ success: boolean }>(axiosInstance.post('/users/change-password', data)),
  },

  // Discord account endpoints
  accounts: {
    getAll: (page = 1, limit = 10) =>
      handleRequest<PaginatedResponse<DiscordAccount>>(
        axiosInstance.get(`/accounts?page=${page}&limit=${limit}`),
      ),

    getById: (id: string) => handleRequest<DiscordAccount>(axiosInstance.get(`/accounts/${id}`)),

    create: (data: CreateAccountRequest) =>
      handleRequest<DiscordAccount>(axiosInstance.post('/accounts', data)),

    update: (id: string, data: UpdateAccountRequest) =>
      handleRequest<DiscordAccount>(axiosInstance.put(`/accounts/${id}`, data)),

    delete: (id: string) =>
      handleRequest<{ success: boolean }>(axiosInstance.delete(`/accounts/${id}`)),

    start: (id: string) =>
      handleRequest<{ status: string }>(axiosInstance.post(`/accounts/${id}/start`)),

    stop: (id: string) =>
      handleRequest<{ status: string }>(axiosInstance.post(`/accounts/${id}/stop`)),

    getStatus: (id: string) =>
      handleRequest<{ status: string; uptime: number; friendCount: number }>(
        axiosInstance.get(`/accounts/${id}/status`),
      ),

    getStatusHistory: (id: string) =>
      handleRequest<{ history: Array<{ timestamp: string; status: string }> }>(
        axiosInstance.get(`/accounts/${id}/status/history`),
      ),
  },

  // Dashboard endpoints
  dashboard: {
    getAccountsStats: () => handleRequest<AccountStats>(axiosInstance.get('/dashboard/accounts')),

    getActivity: (limit = 10) =>
      handleRequest<ActivityData>(axiosInstance.get(`/dashboard/activity?limit=${limit}`)),

    getContentStats: (days = 7) =>
      handleRequest<ContentStats>(axiosInstance.get(`/dashboard/content?days=${days}`)),

    getSystemMetrics: () => handleRequest<SystemMetrics>(axiosInstance.get('/dashboard/system')),
  },

  // Setup endpoints
  setup: {
    getStatus: () =>
      handleRequest<{ completed: boolean; steps: SetupStep[] }>(axiosInstance.get('/setup/status')),

    addAccount: (data: { name: string; token: string }) =>
      handleRequest<{ account: DiscordAccount; success: boolean }>(
        axiosInstance.post('/setup/account', data),
      ),

    complete: () => handleRequest<{ success: boolean }>(axiosInstance.post('/setup/complete')),
  },

  // Admin endpoints
  admin: {
    getUsers: (page = 1, limit = 10) =>
      handleRequest<PaginatedResponse<User>>(
        axiosInstance.get(`/users?page=${page}&limit=${limit}`),
      ),

    getUserById: (id: string) => handleRequest<User>(axiosInstance.get(`/users/${id}`)),

    updateUser: (id: string, data: { role?: string }) =>
      handleRequest<User>(axiosInstance.put(`/users/${id}`, data)),

    deleteUser: (id: string) =>
      handleRequest<{ success: boolean }>(axiosInstance.delete(`/users/${id}`)),

    // Performance monitoring endpoints
    getPerformanceAlerts: () =>
      handleRequest<PerformanceAlertConfig>(axiosInstance.get('/performance/alerts')),

    setPerformanceAlerts: (config: PerformanceAlertConfig) =>
      handleRequest<{ success: boolean }>(axiosInstance.post('/performance/alerts', config)),

    togglePerformanceAlert: (metricId: string, enabled: boolean) =>
      handleRequest<{ success: boolean; config?: PerformanceAlertConfig }>(
        axiosInstance.post('/performance/alerts/toggle', { metricId, enabled }),
      ),
  },
};

export default api;
