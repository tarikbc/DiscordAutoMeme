import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context';

interface PublicRouteProps {
  component: React.ComponentType;
  redirectPath?: string;
}

const PublicRoute = ({
  component: Component,
  redirectPath = '/dashboard'
}: PublicRouteProps) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

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

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // If not authenticated, render the public component
  return <Component />;
};

export default PublicRoute; 