import { useState, useEffect } from 'react';
import {
  FriendListView,
  FriendDetailView
} from '../../components/friends';
import type { TargetingSettingsUpdate } from '../../components/friends';

const FriendMonitoringPage = () => {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'list' | 'detail'>('list');
  const [loading, setLoading] = useState(false);

  // Reset friend selection when changing to list view
  useEffect(() => {
    if (selectedView !== 'detail') {
      setSelectedFriendId(null);
    }
  }, [selectedView]);

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriendId(friendId);
    setSelectedView('detail');
  };

  // Empty handler for backwards compatibility
  const handleFriendTimelineView = () => { };

  const handleBackToList = () => {
    setSelectedView('list');
    setSelectedFriendId(null);
  };

  const handleSettingsChanged = async (friendId: string, settings: TargetingSettingsUpdate) => {
    // Simulate API call to update settings
    setLoading(true);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLoading(false);
        // In a real app, we would actually save the settings to the backend
        console.log('Updated settings for friend', friendId, settings);
        resolve();
      }, 1000);
    });
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friend Activity Monitoring</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track your friends' activity patterns and optimize content delivery.
        </p>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {selectedView === 'list' && (
          <FriendListView
            onFriendSelect={handleFriendSelect}
            onFriendTimelineView={handleFriendTimelineView}
          />
        )}

        {selectedView === 'detail' && selectedFriendId && (
          <FriendDetailView
            friendId={selectedFriendId}
            loading={loading}
            onBack={handleBackToList}
            onSettingsChanged={handleSettingsChanged}
          />
        )}
      </div>
    </div>
  );
};

export default FriendMonitoringPage; 