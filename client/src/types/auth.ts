export interface User {
  id: string;
  name: string;
  email: string;
  roles?: Array<{
    _id: string;
    name: string;
    permissions?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
  setupCompleted: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}
