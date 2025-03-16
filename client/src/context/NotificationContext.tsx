import { useState, ReactNode } from 'react';
import Notification, { NotificationType } from '../components/common/Notification';
import { NotificationContext } from '.';

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: NotificationType;
    title: string;
    message: string;
    autoClose: boolean;
    duration: number;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    autoClose: true,
    duration: 5000,
  });

  const showNotification = (
    type: NotificationType,
    title: string,
    message: string,
    autoClose = true,
    duration = 5000,
  ) => {
    setNotification({
      visible: true,
      type,
      title,
      message,
      autoClose,
      duration,
    });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        show={notification.visible}
        onClose={hideNotification}
        autoClose={notification.autoClose}
        duration={notification.duration}
      />
    </NotificationContext.Provider>
  );
}; 