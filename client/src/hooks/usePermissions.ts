import { useContext } from 'react';
import { AuthContext } from '../context';

/**
 * Custom hook for checking user permissions
 *
 * @returns Permission-related utility functions
 */
export function usePermissions() {
  const { isAdmin, user } = useContext(AuthContext);

  /**
   * Check if user has the admin role
   */
  const checkIsAdmin = (): boolean => {
    return isAdmin;
  };

  /**
   * Check if user has a specific role
   *
   * @param roleName The name of the role to check for
   */
  const hasRole = (roleName: string): boolean => {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    return user.roles.some(role => typeof role === 'object' && role.name === roleName);
  };

  return {
    isAdmin: checkIsAdmin,
    hasRole,
  };
}
