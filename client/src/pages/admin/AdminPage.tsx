import { useState, useEffect, useContext } from 'react';
import { ShieldCheckIcon, UserIcon, TrashIcon } from '@heroicons/react/24/outline';
import { NotificationContext } from '../../context';

interface User {
  id: string;
  name: string;
  email: string;
  roles?: Array<{
    _id: string;
    name: string;
    permissions?: string[];
  }>;
  status: 'active' | 'inactive';
  accountCount: number;
  createdAt: string;
  lastLogin?: string;
}

// Helper function to check if user is admin (used for filtering users in the admin panel)
const isAdmin = (user: User): boolean => {
  return user.roles?.some(role => role.name === 'admin') || false;
}

// Helper function to get user role name for display
const getUserRoleName = (user: User): string => {
  return user.roles?.some(role => role.name === 'admin') ? 'admin' : 'user';
}

const AdminPage = () => {
  const { showNotification } = useContext(NotificationContext);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        // This would be an API call to fetch users
        // For now, we'll use mock data

        // Mock users data
        const mockUsers: User[] = [
          {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            roles: [{
              _id: '1',
              name: 'admin',
              permissions: []
            }],
            status: 'active',
            accountCount: 3,
            createdAt: '2023-01-15T12:00:00Z',
            lastLogin: '2023-05-10T09:30:00Z'
          },
          {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            roles: [{
              _id: '2',
              name: 'user',
              permissions: []
            }],
            status: 'active',
            accountCount: 1,
            createdAt: '2023-02-20T14:00:00Z',
            lastLogin: '2023-05-09T18:45:00Z'
          },
          {
            id: 'user3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            roles: [{
              _id: '2',
              name: 'user',
              permissions: []
            }],
            status: 'inactive',
            accountCount: 0,
            createdAt: '2023-03-10T09:00:00Z',
            lastLogin: '2023-04-01T10:15:00Z'
          },
          {
            id: 'user4',
            name: 'Alice Williams',
            email: 'alice@example.com',
            roles: [{
              _id: '2',
              name: 'user',
              permissions: []
            }],
            status: 'active',
            accountCount: 2,
            createdAt: '2023-04-05T11:30:00Z',
            lastLogin: '2023-05-11T14:20:00Z'
          },
          {
            id: 'user5',
            name: 'Charlie Brown',
            email: 'charlie@example.com',
            roles: [{
              _id: '2',
              name: 'user',
              permissions: []
            }],
            status: 'active',
            accountCount: 1,
            createdAt: '2023-03-22T16:45:00Z',
            lastLogin: '2023-05-08T09:10:00Z'
          }
        ];

        setUsers(mockUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        showNotification('error', 'Error Loading Users', 'Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [showNotification]);

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      // This would be an API call to update the user's role

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? {
            ...user,
            roles: [{
              _id: '1', // This would normally come from the API response
              name: newRole,
              permissions: []
            }]
          } : user
        )
      );

      showNotification('success', 'Role Updated', `User role updated to ${newRole}.`);
    } catch (error) {
      console.error('Failed to update user role:', error);
      showNotification('error', 'Error Updating Role', 'Failed to update user role. Please try again.');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    try {
      // This would be an API call to update the user's status

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );

      showNotification('success', 'Status Updated', `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
    } catch (error) {
      console.error('Failed to update user status:', error);
      showNotification('error', 'Error Updating Status', 'Failed to update user status. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // This would be an API call to delete the user

      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));

      showNotification('success', 'User Deleted', 'User has been deleted successfully.');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showNotification('error', 'Error Deleting User', 'Failed to delete user. Please try again.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'all' || getUserRoleName(user) === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <>
      <div className="pb-5 border-b border-gray-200 dark:border-gray-700 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-8 w-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Search */}
              <div>
                <label htmlFor="search" className="sr-only">Search</label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Role filter */}
              <div>
                <label htmlFor="role-filter" className="sr-only">Filter by role</label>
                <select
                  id="role-filter"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'all' | 'user' | 'admin')}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center my-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Accounts
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={getUserRoleName(user)}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                            className="block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.status}
                            onChange={(e) => handleStatusChange(user.id, e.target.value as 'active' | 'inactive')}
                            className="block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.accountCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No users found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery || selectedRole !== 'all' || selectedStatus !== 'all'
                    ? 'Try changing your filters to find more users.'
                    : 'No users exist in the system yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Statistics */}
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">System Statistics</h2>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Users</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-800 dark:text-blue-200">{users.length}</dd>
              </div>

              <div className="bg-green-50 dark:bg-green-900/30 overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-green-600 dark:text-green-400 truncate">Active Users</dt>
                <dd className="mt-1 text-3xl font-semibold text-green-800 dark:text-green-200">
                  {users.filter(u => u.status === 'active').length}
                </dd>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-purple-600 dark:text-purple-400 truncate">Total Accounts</dt>
                <dd className="mt-1 text-3xl font-semibold text-purple-800 dark:text-purple-200">
                  {users.reduce((acc, user) => acc + user.accountCount, 0)}
                </dd>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/30 overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-yellow-600 dark:text-yellow-400 truncate">Admins</dt>
                <dd className="mt-1 text-3xl font-semibold text-yellow-800 dark:text-yellow-200">
                  {users.filter(u => isAdmin(u)).length}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage; 