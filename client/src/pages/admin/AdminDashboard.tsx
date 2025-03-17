import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { ChartBarIcon, UsersIcon, ServerIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import PerformanceMonitoring from '../../components/admin/PerformanceMonitoring';
import UserManagement from '../../components/admin/UserManagement';
import LogViewer from '../../components/admin/LogViewer';
import LiveUpdates from '../../components/admin/LiveUpdates';

// Import the SystemAlert interface from LiveUpdates component
// This would typically be in a shared types file
interface SystemAlert extends Record<string, unknown> {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
}

// Tab definition
type TabType = 'performance' | 'users' | 'logs' | 'system';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('performance');

  // Handle tab change
  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Handle system alerts
  const handleSystemAlert = (alert: SystemAlert) => {
    // The LiveUpdates component already displays notifications for alerts
    // But we could handle them differently here if needed
    console.log('System alert received:', alert);
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Discord Auto Meme</title>
      </Helmet>

      {/* Invisible component for WebSocket connection management */}
      <LiveUpdates onAlert={handleSystemAlert} />

      <div className="container mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4">
            <button
              onClick={() => changeTab('performance')}
              className={`py-4 px-2 font-medium text-sm border-b-2 ${activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex items-center`}
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Performance Monitoring
            </button>

            <button
              onClick={() => changeTab('users')}
              className={`py-4 px-2 font-medium text-sm border-b-2 ${activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex items-center`}
            >
              <UsersIcon className="h-5 w-5 mr-2" />
              User Management
            </button>

            <button
              onClick={() => changeTab('logs')}
              className={`py-4 px-2 font-medium text-sm border-b-2 ${activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex items-center`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Log Viewer
            </button>

            <button
              onClick={() => changeTab('system')}
              className={`py-4 px-2 font-medium text-sm border-b-2 ${activeTab === 'system'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex items-center`}
            >
              <ServerIcon className="h-5 w-5 mr-2" />
              System Settings
            </button>
          </nav>
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {activeTab === 'performance' && <PerformanceMonitoring />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'logs' && <LogViewer />}
          {activeTab === 'system' && (
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                System Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure system settings, maintenance schedule, and server parameters.
              </p>

              {/* System settings content would go here */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-md p-4 text-gray-500 dark:text-gray-400 text-sm">
                This feature is coming soon.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
