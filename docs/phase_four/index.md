# Phase Four: Content Service Abstraction

## Overview

Phase Four focuses on transforming the existing meme-specific functionality into a more versatile content service that can handle various types of content beyond memes. This phase will implement a plugin-based architecture for content providers, allowing the system to be extended with new content types in the future. The backend and frontend components will be updated to support this abstraction.

## Goals

1. Refactor meme service to be a generic content service
2. Add support for different content types
3. Create extensible content search and delivery mechanisms
4. Build content preference system

## Detailed Tasks

### 1. Content Service Architecture (Estimated time: 3-4 days)

- [ ] Design a plugin-based architecture for content providers
- [ ] Create interfaces and abstract classes for content providers
- [ ] Develop a content provider registry system
- [ ] Implement content type detection and routing
- [ ] Create a unified content response format
- [ ] Design content metadata schema
- [ ] Implement content caching mechanisms
- [ ] Create content delivery pipeline

### 2. Refactoring Existing Meme Service (Estimated time: 2-3 days)

- [ ] Convert the existing MemeSearcher to be a MemeContentProvider
- [ ] Refactor MemeService to use the new ContentService architecture
- [ ] Ensure backward compatibility for existing meme functionality
- [ ] Migrate existing data to the new content schema
- [ ] Update database models and repositories
- [ ] Refactor API endpoints to use the new content service
- [ ] Implement migration scripts for existing content data

### 3. Additional Content Providers (Estimated time: 4-5 days)

- [ ] Implement GifContentProvider:
  - [ ] Integrate with Giphy or Tenor API
  - [ ] Add gif-specific search parameters
  - [ ] Implement content filtering
- [ ] Create QuoteContentProvider:
  - [ ] Integrate with quotes API
  - [ ] Add context-aware quote selection
  - [ ] Implement formatting options
- [ ] Develop NewsContentProvider:
  - [ ] Integrate with news API
  - [ ] Add topic matching for games and music
  - [ ] Implement headline extraction
- [ ] Add JokeContentProvider:
  - [ ] Integrate with joke API
  - [ ] Add category filtering
  - [ ] Implement appropriate formatting

### 4. Content Preference System (Estimated time: 3-4 days)

- [ ] Create UserContentPreferences model
- [ ] Implement account-level content preferences
- [ ] Add friend-specific content preferences
- [ ] Develop content type weighting system
- [ ] Create content rotation logic
- [ ] Implement frequency and timing controls
- [ ] Add content blacklist/whitelist capabilities
- [ ] Create preference learning from user feedback

### 5. Content Selection Logic (Estimated time: 2-3 days)

- [ ] Develop intelligent content selection algorithm
- [ ] Implement context-aware content matching
- [ ] Create content relevance scoring
- [ ] Add variety controls to prevent repetition
- [ ] Implement A/B testing framework for content
- [ ] Create analytics for content performance
- [ ] Develop adaptive content selection based on previous interactions

### 6. API Enhancement (Estimated time: 2-3 days)

- [ ] Update existing API endpoints to support multiple content types
- [ ] Create new endpoints for content type management:
  - [ ] GET `/api/content/types` (list available content types)
  - [ ] GET `/api/content/types/:type/settings` (get content type settings)
  - [ ] PUT `/api/content/types/:type/settings` (update content type settings)
- [ ] Implement endpoints for content preferences:
  - [ ] GET `/api/accounts/:id/content/preferences` (get preferences)
  - [ ] PUT `/api/accounts/:id/content/preferences` (update preferences)
  - [ ] GET `/api/friends/:id/content/preferences` (get friend-specific preferences)
  - [ ] PUT `/api/friends/:id/content/preferences` (update friend-specific preferences)
- [ ] Add content testing endpoints:
  - [ ] POST `/api/content/test` (test content selection)
  - [ ] GET `/api/content/preview/:type` (preview content by type)

### 7. Frontend Updates (Estimated time: 3-4 days)

- [ ] Update content management UI to support multiple content types
- [ ] Create content type configuration screens
- [ ] Implement content preview for different types
- [ ] Update content history view to display various content types
- [ ] Add content preference UI for accounts and friends
- [ ] Create content type switching controls
- [ ] Implement content performance analytics display

### 8. Testing and Optimization (Estimated time: 2-3 days)

- [ ] Create unit tests for content providers
- [ ] Implement integration tests for content service
- [ ] Perform load testing with multiple content types
- [ ] Optimize content caching and delivery
- [ ] Test content preference system
- [ ] Validate content selection algorithm
- [ ] Document content provider API

## Content Provider Architecture

```
┌─────────────────────────────────────────────────┐
│              ContentService                     │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         ContentProviderRegistry         │    │
│  └─────────────────────────────────────────┘    │
│                      │                          │
│  ┌──────────┬────────┴───────┬───────────┐      │
│  │          │                │           │      │
│  ▼          ▼                ▼           ▼      │
│ ┌────────┐ ┌────────┐    ┌────────┐   ┌────────┐│
│ │  Meme  │ │  Gif   │    │ Quote  │   │  News  ││
│ │Provider│ │Provider│    │Provider│   │Provider││
│ └────────┘ └────────┘    └────────┘   └────────┘│
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              ContentDelivery                     │
│                                                 │
│  ┌─────────────┐    ┌─────────────────────┐     │
│  │   Content   │    │      Content        │     │
│  │  Selection  │    │     Preferences     │     │
│  └─────────────┘    └─────────────────────┘     │
│         │                                        │
│         ▼                                        │
│  ┌─────────────┐    ┌─────────────────────┐     │
│  │   Content   │    │      Content        │     │
│  │  Formatting │    │      Analytics      │     │
│  └─────────────┘    └─────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## Content Provider Interface

```typescript
interface ContentProvider {
  // Unique identifier for this provider
  readonly type: string;

  // Human-readable name
  readonly displayName: string;

  // Content search method
  searchContent(
    query: string,
    context: ContentContext,
    count: number,
    options?: ContentOptions
  ): Promise<Content[]>;

  // Get provider-specific settings schema
  getSettingsSchema(): SettingsSchema;

  // Validate content before sending
  validateContent(content: Content): boolean;

  // Format content for delivery
  formatContent(
    content: Content,
    deliveryContext: DeliveryContext
  ): FormattedContent;
}

// Example content context
interface ContentContext {
  triggerType: "GAME" | "MUSIC" | "MANUAL";
  gameName?: string;
  artistName?: string;
  songName?: string;
  friendId: string;
  accountId: string;
}

// Content structure
interface Content {
  id: string;
  type: string;
  title: string;
  url?: string;
  text?: string;
  source?: string;
  metadata: Record<string, any>;
}
```

## Content Types to Implement

### 1. Meme Content (existing)

- Images related to games, artists, or general topics
- Uses SerpAPI for search
- Includes image URL and caption

### 2. GIF Content

- Animated GIFs related to the context
- Uses Giphy or Tenor API
- Can be filtered by rating

### 3. Quote Content

- Relevant quotes from games, musicians, or general topics
- Can include attribution
- Formatted text with optional styling

### 4. News Content

- Recent news articles about games or artists
- Includes headline, source, and link
- Can be filtered by recency and relevance

### 5. Joke Content

- Humor related to the context
- Various joke formats (one-liner, question/answer)
- Categorized by type and theme

## Content Preference System

The content preference system will allow users to configure:

1. **Content Type Preferences**:

   - Enable/disable specific content types
   - Set relative frequency of different content types
   - Configure content type specific settings

2. **Delivery Preferences**:

   - Time-based rules (e.g., no news after 10 PM)
   - Content rotation patterns
   - Maximum content per message

3. **Friend-specific Preferences**:

   - Override global preferences for specific friends
   - Set content types that work best for each friend
   - Create personalized content rules

4. **Learning Mechanism**:
   - Track which content performs well with which friends
   - Adjust weights based on observed patterns
   - Allow for feedback-based optimization

## Key Technical Challenges

1. **Plugin Architecture**: Creating a flexible yet performant plugin system for content providers.

2. **Content Relevance**: Ensuring selected content is relevant to the triggering context.

3. **Provider Integration**: Handling different APIs and response formats from various content providers.

4. **Content Caching**: Efficiently caching content to reduce API calls and improve performance.

5. **Selection Algorithm**: Creating an intelligent algorithm that balances variety, relevance, and user preferences.

## Expected Outcomes

By the end of Phase Four, we will have:

- A flexible content service architecture supporting multiple content types
- Several content providers beyond just memes
- A sophisticated content preference system
- Enhanced content selection logic
- Updated API endpoints for content management
- Modified frontend to support multiple content types

## Transition to Phase Five

Phase Five will build upon the content service by implementing real-time communication features. The content delivery system will be enhanced with real-time updates and notifications, ensuring users are immediately informed of friend activities and content delivery events.

## Estimated Timeline

Phase Four is expected to take approximately **16-22 developer days** to complete, depending on the complexity of content provider integrations and the sophistication of the content selection algorithm.

## Resources Required

- Node.js developer with experience in plugin architectures
- Knowledge of various content APIs (Giphy, news services, quote APIs)
- Experience with content categorization and matching
- Understanding of preference systems and recommendation algorithms
- Frontend developer to implement the updated UI components
