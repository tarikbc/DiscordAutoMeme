import { useState, useEffect } from 'react';
import {
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';

interface ContentHistoryItem {
  id: string;
  contentType: string;
  title: string;
  url: string;
  source: string;
  sentAt: string;
  accountId: string;
  accountName: string;
  friendId: string;
  friendName: string;
  reactions: string[];
}

interface ContentHistoryProps {
  initialItems?: ContentHistoryItem[];
  loading?: boolean;
}

const ContentHistoryView = ({ initialItems = [], loading = false }: ContentHistoryProps) => {
  const [items, setItems] = useState<ContentHistoryItem[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<ContentHistoryItem[]>(initialItems);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedFriend, setSelectedFriend] = useState<string>('all');
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Mock data for development
  useEffect(() => {
    if (initialItems.length === 0 && !loading) {
      const mockItems: ContentHistoryItem[] = Array.from({ length: 20 }, (_, i) => {
        const accountId = `acc-${Math.floor(i / 5) + 1}`;
        const friendId = `friend-${(i % 7) + 1}`;
        const types = ['meme', 'gif', 'video', 'image'];
        const date = new Date();
        date.setDate(date.getDate() - i);

        return {
          id: `content-${i}`,
          contentType: types[i % types.length],
          title: `Content item ${i + 1}`,
          url: `https://example.com/content/${i + 1}`,
          source: `Source ${(i % 3) + 1}`,
          sentAt: date.toISOString(),
          accountId,
          accountName: `Account ${accountId.split('-')[1]}`,
          friendId,
          friendName: `Friend ${friendId.split('-')[1]}`,
          reactions: i % 3 === 0 ? ['👍', '😂'] : i % 3 === 1 ? ['👍'] : [],
        };
      });

      setItems(mockItems);
      setFilteredItems(mockItems);

      // Extract unique accounts, friends and content types
      const uniqueAccounts = Array.from(new Set(mockItems.map(item => item.accountId))).map(id => ({
        id,
        name: mockItems.find(item => item.accountId === id)?.accountName || id,
      }));

      const uniqueFriends = Array.from(new Set(mockItems.map(item => item.friendId))).map(id => ({
        id,
        name: mockItems.find(item => item.friendId === id)?.friendName || id,
      }));

      const uniqueContentTypes = Array.from(new Set(mockItems.map(item => item.contentType)));

      setAccounts(uniqueAccounts);
      setFriends(uniqueFriends);
      setContentTypes(uniqueContentTypes);
    }
  }, [initialItems, loading]);

  // Apply filters
  useEffect(() => {
    let filtered = [...items];

    if (selectedAccount !== 'all') {
      filtered = filtered.filter(item => item.accountId === selectedAccount);
    }

    if (selectedFriend !== 'all') {
      filtered = filtered.filter(item => item.friendId === selectedFriend);
    }

    if (selectedContentType !== 'all') {
      filtered = filtered.filter(item => item.contentType === selectedContentType);
    }

    setFilteredItems(filtered);
  }, [items, selectedAccount, selectedFriend, selectedContentType]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimelinePosition = (index: number) => {
    // Alternate items between left and right side of the timeline
    return index % 2 === 0 ? 'left' : 'right';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Content History</h2>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FunnelIcon className="h-5 w-5" />
        </button>
      </div>

      {isFilterOpen && (
        <div className="p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="account-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              <UserIcon className="h-4 w-4 inline mr-1" /> Account
            </label>
            <select
              id="account-filter"
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="all">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="friend-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              <UserIcon className="h-4 w-4 inline mr-1" /> Friend
            </label>
            <select
              id="friend-filter"
              value={selectedFriend}
              onChange={e => setSelectedFriend(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="all">All Friends</option>
              {friends.map(friend => (
                <option key={friend.id} value={friend.id}>
                  {friend.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="content-type-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              <ChatBubbleBottomCenterTextIcon className="h-4 w-4 inline mr-1" /> Content Type
            </label>
            <select
              id="content-type-filter"
              value={selectedContentType}
              onChange={e => setSelectedContentType(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="all">All Types</option>
              {contentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No content history found with the current filters.
        </div>
      ) : (
        <div className="relative px-4 py-6">
          {/* Timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-x-1/2"></div>

          {/* Timeline items */}
          <div className="relative">
            {filteredItems.map((item, index) => {
              const position = getTimelinePosition(index);
              return (
                <div
                  key={item.id}
                  className={`mb-8 flex items-center ${position === 'left' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`w-5/12 ${position === 'right' && 'order-1'}`}>
                    <div className="p-4 bg-white dark:bg-gray-700 rounded shadow hover:shadow-md transition-shadow duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(item.sentAt)}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                          {item.contentType}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Sent to <span className="font-medium">{item.friendName}</span> from{' '}
                        <span className="font-medium">{item.accountName}</span>
                      </p>
                      {item.reactions.length > 0 && (
                        <div className="mt-2 flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                            Reactions:
                          </span>
                          {item.reactions.map((reaction, i) => (
                            <span key={i} className="text-sm mr-1">
                              {reaction}
                            </span>
                          ))}
                        </div>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline inline-block"
                      >
                        View Content
                      </a>
                    </div>
                  </div>
                  <div className="z-10 flex items-center order-1 bg-blue-500 shadow-xl w-6 h-6 rounded-full">
                    <div className="mx-auto font-semibold text-lg text-white"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentHistoryView;
