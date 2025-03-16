import { Navigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useContext } from 'react';
import { AuthContext } from '../../context';

interface PrivateRouteProps {
  component: React.ComponentType;
  withLayout?: boolean;
  adminRequired?: boolean;
}

const PrivateRoute = ({
  component: Component,
  withLayout = false,
  adminRequired = false
}: PrivateRouteProps) => {
  const { isAuthenticated, loading, isAdmin } = useContext(AuthContext);

  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If admin required but user is not admin, redirect to dashboard
  if (adminRequired && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated, render the component with or without layout
  if (withLayout) {
    return (
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    );
  }

  // If no layout requested, just render the component
  return <Component />;
};

export default PrivateRoute; 