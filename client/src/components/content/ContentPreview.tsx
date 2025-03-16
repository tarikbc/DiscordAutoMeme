import { useState } from 'react';
import { PaperAirplaneIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

interface ContentPreviewProps {
  content?: {
    id: string;
    type: string;
    title: string;
    url: string;
    source: string;
    thumbnail?: string;
  };
  onSend?: (contentId: string, targetId: string) => Promise<void>;
  onClose?: () => void;
  friends?: { id: string; name: string }[];
}

const ContentPreview = ({ content, onSend, onClose, friends = [] }: ContentPreviewProps) => {
  const [isSending, setIsSending] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!content) {
    return null;
  }

  const handleSend = async () => {
    if (!onSend || !selectedFriend || !content.id) return;

    setIsSending(true);
    setErrorMessage('');

    try {
      await onSend(content.id, selectedFriend);
      setSendSuccess(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setSendSuccess(false);
        if (onClose) onClose();
      }, 3000);
    } catch (error) {
      console.error('Error sending content:', error);
      setErrorMessage('Failed to send content. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const renderContentPreview = () => {
    switch (content.type) {
      case 'image':
      case 'meme':
        return (
          <img
            src={content.url || content.thumbnail}
            alt={content.title}
            className="max-h-96 mx-auto rounded-md object-contain"
          />
        );
      case 'gif':
        return (
          <img
            src={content.url || content.thumbnail}
            alt={content.title}
            className="max-h-96 mx-auto rounded-md object-contain"
          />
        );
      case 'video':
        return (
          <div className="relative pt-[56.25%] w-full">
            <iframe
              src={content.url}
              className="absolute top-0 left-0 w-full h-full rounded-md"
              allowFullScreen
              title={content.title}
            ></iframe>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-700 rounded-md">
            <EyeIcon className="h-12 w-12 text-gray-400" />
            <p className="ml-2 text-gray-500 dark:text-gray-400">Preview not available</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Content Preview
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-grow">
          <div className="mb-4">
            {renderContentPreview()}
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Details</h4>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-xs text-gray-500 dark:text-gray-400">Title</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{content.title}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{content.type}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs text-gray-500 dark:text-gray-400">Source</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{content.source}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs text-gray-500 dark:text-gray-400">URL</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white truncate">
                  <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {content.url}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {friends.length > 0 && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <label htmlFor="friend-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Send to Friend:
              </label>
              <div className="mt-2 flex">
                <select
                  id="friend-select"
                  value={selectedFriend}
                  onChange={(e) => setSelectedFriend(e.target.value)}
                  className="flex-grow rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                >
                  <option value="">Select a friend</option>
                  {friends.map(friend => (
                    <option key={friend.id} value={friend.id}>{friend.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!selectedFriend || isSending || sendSuccess}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : sendSuccess ? (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Sent!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                      Send
                    </span>
                  )}
                </button>
              </div>
              {errorMessage && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentPreview; 