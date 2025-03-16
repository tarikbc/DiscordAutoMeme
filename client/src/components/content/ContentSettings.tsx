import { useState } from 'react';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ContentTypeConfig {
  type: string;
  enabled: boolean;
  priority: number;
  nsfw: boolean;
  maxSizeKB: number;
}

interface DeliverySettings {
  frequency: {
    min: number;
    max: number;
  };
  timeWindows: {
    enabled: boolean;
    windows: {
      dayOfWeek: number; // 0-6 (Sunday-Saturday)
      startHour: number; // 0-23
      endHour: number; // 0-23
    }[];
  };
  contextAware: boolean;
  randomizeDelivery: boolean;
}

interface ContentSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  contentTypes: string[];
}

export interface ContentSettingsData {
  accountId?: string;
  contentTypes: ContentTypeConfig[];
  deliverySettings: DeliverySettings;
  contentSources: ContentSource[];
}

interface ContentSettingsProps {
  accountId?: string;
  onSave?: (settings: ContentSettingsData) => Promise<void>;
}

const ContentSettings = ({ accountId, onSave }: ContentSettingsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Initial content type configurations
  const [contentTypes, setContentTypes] = useState<ContentTypeConfig[]>([
    { type: 'meme', enabled: true, priority: 5, nsfw: false, maxSizeKB: 1024 },
    { type: 'gif', enabled: true, priority: 4, nsfw: false, maxSizeKB: 2048 },
    { type: 'video', enabled: false, priority: 3, nsfw: false, maxSizeKB: 5120 },
    { type: 'image', enabled: true, priority: 4, nsfw: false, maxSizeKB: 1536 }
  ]);

  // Initial delivery settings
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    frequency: {
      min: 4, // hours
      max: 12 // hours
    },
    timeWindows: {
      enabled: true,
      windows: [
        { dayOfWeek: 1, startHour: 10, endHour: 22 }, // Monday, 10 AM - 10 PM
        { dayOfWeek: 2, startHour: 10, endHour: 22 }, // Tuesday, 10 AM - 10 PM
        { dayOfWeek: 3, startHour: 10, endHour: 22 }, // Wednesday, 10 AM - 10 PM
        { dayOfWeek: 4, startHour: 10, endHour: 22 }, // Thursday, 10 AM - 10 PM
        { dayOfWeek: 5, startHour: 10, endHour: 23 }, // Friday, 10 AM - 11 PM
        { dayOfWeek: 6, startHour: 12, endHour: 23 }, // Saturday, 12 PM - 11 PM
        { dayOfWeek: 0, startHour: 12, endHour: 22 }, // Sunday, 12 PM - 10 PM
      ]
    },
    contextAware: true,
    randomizeDelivery: true
  });

  // Initial content sources
  const [contentSources, setContentSources] = useState<ContentSource[]>([
    {
      id: 'source-1',
      name: 'Reddit - r/memes',
      url: 'https://www.reddit.com/r/memes',
      enabled: true,
      contentTypes: ['meme', 'image', 'gif']
    },
    {
      id: 'source-2',
      name: 'Reddit - r/dankmemes',
      url: 'https://www.reddit.com/r/dankmemes',
      enabled: true,
      contentTypes: ['meme', 'image', 'gif']
    },
    {
      id: 'source-3',
      name: 'Giphy - Trending',
      url: 'https://giphy.com/trending',
      enabled: true,
      contentTypes: ['gif']
    },
    {
      id: 'source-4',
      name: 'Imgur - Viral',
      url: 'https://imgur.com/viral',
      enabled: false,
      contentTypes: ['image', 'gif', 'video']
    }
  ]);

  // Add new source form
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    contentTypes: [] as string[]
  });

  const toggleContentType = (index: number) => {
    const updated = [...contentTypes];
    updated[index].enabled = !updated[index].enabled;
    setContentTypes(updated);
  };

  const updateContentTypePriority = (index: number, priority: number) => {
    const updated = [...contentTypes];
    updated[index].priority = priority;
    setContentTypes(updated);
  };

  const toggleContentTypeNSFW = (index: number) => {
    const updated = [...contentTypes];
    updated[index].nsfw = !updated[index].nsfw;
    setContentTypes(updated);
  };

  const updateContentTypeMaxSize = (index: number, size: number) => {
    const updated = [...contentTypes];
    updated[index].maxSizeKB = size;
    setContentTypes(updated);
  };

  const updateFrequency = (min: number, max: number) => {
    setDeliverySettings({
      ...deliverySettings,
      frequency: { min, max }
    });
  };

  const toggleTimeWindows = () => {
    setDeliverySettings({
      ...deliverySettings,
      timeWindows: {
        ...deliverySettings.timeWindows,
        enabled: !deliverySettings.timeWindows.enabled
      }
    });
  };

  const toggleContextAware = () => {
    setDeliverySettings({
      ...deliverySettings,
      contextAware: !deliverySettings.contextAware
    });
  };

  const toggleRandomizeDelivery = () => {
    setDeliverySettings({
      ...deliverySettings,
      randomizeDelivery: !deliverySettings.randomizeDelivery
    });
  };

  const toggleContentSource = (sourceId: string) => {
    const updated = contentSources.map(source =>
      source.id === sourceId
        ? { ...source, enabled: !source.enabled }
        : source
    );
    setContentSources(updated);
  };

  const handleNewSourceTypeToggle = (type: string) => {
    if (newSource.contentTypes.includes(type)) {
      setNewSource({
        ...newSource,
        contentTypes: newSource.contentTypes.filter(t => t !== type)
      });
    } else {
      setNewSource({
        ...newSource,
        contentTypes: [...newSource.contentTypes, type]
      });
    }
  };

  const addContentSource = () => {
    if (!newSource.name || !newSource.url || newSource.contentTypes.length === 0) {
      return;
    }

    const newSourceObj: ContentSource = {
      id: `source-${Date.now()}`,
      name: newSource.name,
      url: newSource.url,
      enabled: true,
      contentTypes: newSource.contentTypes
    };

    setContentSources([...contentSources, newSourceObj]);

    // Reset form
    setNewSource({
      name: '',
      url: '',
      contentTypes: []
    });
  };

  const removeContentSource = (sourceId: string) => {
    setContentSources(contentSources.filter(source => source.id !== sourceId));
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      const settings: ContentSettingsData = {
        accountId,
        contentTypes,
        deliverySettings,
        contentSources
      };

      await onSave(settings);
      setSuccessMessage('Settings saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Content Settings</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure content types, delivery frequency, and content sources.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Content Type Configuration */}
        <div>
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Content Type Configuration</h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead>
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NSFW</th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max Size (KB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {contentTypes.map((type, index) => (
                  <tr key={type.type}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleContentType(index)}
                        className={`px-2 py-1 text-xs font-medium rounded ${type.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                          }`}
                      >
                        {type.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <select
                        value={type.priority}
                        onChange={(e) => updateContentTypePriority(index, parseInt(e.target.value))}
                        className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((priority) => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleContentTypeNSFW(index)}
                        className={`px-2 py-1 text-xs font-medium rounded ${type.nsfw
                          ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                          }`}
                      >
                        {type.nsfw ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <input
                        type="number"
                        value={type.maxSizeKB}
                        onChange={(e) => updateContentTypeMaxSize(index, parseInt(e.target.value))}
                        className="w-20 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Frequency Settings */}
        <div>
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Delivery Frequency Settings</h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency Range (hours between content)
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Min</label>
                  <input
                    type="number"
                    min="1"
                    max={deliverySettings.frequency.max}
                    value={deliverySettings.frequency.min}
                    onChange={(e) => updateFrequency(parseInt(e.target.value), deliverySettings.frequency.max)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Max</label>
                  <input
                    type="number"
                    min={deliverySettings.frequency.min}
                    value={deliverySettings.frequency.max}
                    onChange={(e) => updateFrequency(deliverySettings.frequency.min, parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="time-windows"
                type="checkbox"
                checked={deliverySettings.timeWindows.enabled}
                onChange={toggleTimeWindows}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="time-windows" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Enable time windows for delivery
              </label>
            </div>

            {deliverySettings.timeWindows.enabled && (
              <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Content will only be delivered during these time windows.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dayIndex) => {
                    const window = deliverySettings.timeWindows.windows.find(w => w.dayOfWeek === dayIndex);
                    return (
                      <div key={day} className="flex items-center space-x-2 text-sm">
                        <span className="w-24 text-gray-700 dark:text-gray-300">{day}:</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {window
                            ? `${window.startHour}:00 - ${window.endHour}:00`
                            : 'No window set'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Time windows can be customized in advanced settings.
                </p>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="context-aware"
                type="checkbox"
                checked={deliverySettings.contextAware}
                onChange={toggleContextAware}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="context-aware" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Enable context-aware delivery
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="randomize-delivery"
                type="checkbox"
                checked={deliverySettings.randomizeDelivery}
                onChange={toggleRandomizeDelivery}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="randomize-delivery" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Randomize delivery times within frequency range
              </label>
            </div>
          </div>
        </div>

        {/* Content Source Management */}
        <div>
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Content Source Management</h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead>
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">URL</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content Types</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {contentSources.map((source) => (
                    <tr key={source.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {source.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                          {source.url}
                        </a>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-wrap gap-1">
                          {source.contentTypes.map(type => (
                            <span key={type} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleContentSource(source.id)}
                          className={`px-2 py-1 text-xs font-medium rounded ${source.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                            }`}
                        >
                          {source.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <button
                          onClick={() => removeContentSource(source.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Source</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="source-name" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    id="source-name"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Reddit - r/example"
                  />
                </div>
                <div>
                  <label htmlFor="source-url" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">URL</label>
                  <input
                    type="text"
                    id="source-url"
                    value={newSource.url}
                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Content Types</label>
                <div className="flex flex-wrap gap-2">
                  {contentTypes.map(type => (
                    <button
                      key={type.type}
                      onClick={() => handleNewSourceTypeToggle(type.type)}
                      className={`px-2 py-1 text-xs font-medium rounded ${newSource.contentTypes.includes(type.type)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                        }`}
                    >
                      {type.type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={addContentSource}
                disabled={!newSource.name || !newSource.url || newSource.contentTypes.length === 0}
                className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-right sm:px-6 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
        {successMessage && (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckIcon className="h-5 w-5 mr-1" />
            <span>{successMessage}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default ContentSettings; 