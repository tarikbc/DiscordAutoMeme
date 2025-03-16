import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { User } from '../types/auth';
import api from '../services/api';
import { AuthContext } from '.';

// Helper function to check if a user is an admin
const checkIsAdmin = (user: User | null): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  return user.roles.some(role =>
    typeof role === 'object' && role.name === 'admin'
  );
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Compute isAdmin status whenever user changes
  const isAdmin = useMemo(() => checkIsAdmin(user), [user]);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
        setupTokenRefresh(storedToken);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('refresh_token');
      }
    }

    setLoading(false);
  }, []);

  // Setup token refresh timer
  const setupTokenRefresh = (currentToken: string) => {
    // Clear existing timer if any
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    // Calculate refresh time (refresh 5 minutes before expiration)
    // Default to 55 minutes if we can't decode the token
    let refreshTime = 55 * 60 * 1000; // 55 minutes

    try {
      // Decode JWT to get expiration time
      const base64Url = currentToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const { exp } = JSON.parse(jsonPayload);
      const expirationTime = exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      // Refresh 5 minutes before expiration or immediately if less than 6 minutes remain
      refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);

      if (refreshTime < 60000) { // Less than 1 minute left
        refreshToken();
        return;
      }
    } catch (error) {
      console.error('Error calculating token refresh time:', error);
    }

    // Set timer to refresh token
    const timer = setTimeout(refreshToken, refreshTime);
    setTokenRefreshTimer(timer);
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        logout();
        return;
      }

      const data = await api.auth.refreshToken(refreshToken);

      // Update token and refresh token in storage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refreshToken);

      setToken(data.token);
      setupTokenRefresh(data.token);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
    }
  };

  // Login function
  const login = (newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
    setupTokenRefresh(newToken);
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await api.auth.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('refresh_token');

    setToken(null);
    setUser(null);

    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
      setTokenRefreshTimer(null);
    }
  };

  // Update user function
  const updateUser = (userData: User) => {
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }
    };
  }, [tokenRefreshTimer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 