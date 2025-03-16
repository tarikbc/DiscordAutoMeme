import { createContext } from 'react';
import { User } from '../types/auth';
import { NotificationType } from '../components/common/Notification';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    title: string,
    message: string,
    autoClose?: boolean,
    duration?: number,
  ) => void;
  hideNotification: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {},
  hideNotification: () => {},
});
