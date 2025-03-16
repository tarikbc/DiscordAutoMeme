# Discord Auto Content - Multi-Service Architecture Plan

## Project Overview

The current Discord Auto Meme project is a single-instance Node.js application that:

1. Connects to Discord using a self-bot token
2. Monitors friends' gaming and music activities
3. Searches for relevant memes using SerpAPI
4. Sends these memes to friends via DM

Our goal is to transform this into a scalable multi-discord service architecture that can:

1. Support multiple Discord accounts simultaneously
2. Provide a centralized management interface
3. Allow configuration of each account independently
4. Maintain all existing functionality
5. Scale efficiently
6. Support sending various types of content (not limited to memes)

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────┐
│            Client (Frontend)                    │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌────────┐          │
│  │ Account │  │ Content  │  │ User   │          │
│  │ Manager │  │ Manager  │  │ Config │          │
│  └─────────┘  └──────────┘  └────────┘          │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │          Admin Dashboard                │    │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐     │    │
│  │  │Stats│  │Users│  │Logs │  │Perf.│     │    │
│  │  └─────┘  └─────┘  └─────┘  └─────┘     │    │
│  └─────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────┘
                    │
                    │ WebSocket (Socket.io)
                    │ REST API
                    ▼
┌─────────────────────────────────────────────────┐
│            Server (Backend)                     │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌────────┐          │
│  │ Account │  │ Content  │  │ Auth   │          │
│  │ Service │  │ Service  │  │ Service│          │
│  └─────────┘  └──────────┘  └────────┘          │
│                                                 │
│  ┌─────────┐  ┌──────────────────────┐          │
│  │ Metrics │  │ System Monitor       │          │
│  │ Service │  │ Service              │          │
│  └─────────┘  └──────────────────────┘          │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │          Worker Thread Manager          │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │        Discord Clients          │    │    │
│  │  │  ┌─────┐  ┌─────┐  ┌─────┐      │    │    │
│  │  │  │Bot 1│  │Bot 2│  │Bot 3│  ... │    │    │
│  │  │  └─────┘  └─────┘  └─────┘      │    │    │
│  │  └─────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
                 ┌─────────┐
                 │MongoDB  │
                 └─────────┘
```

## Technology Stack

### Frontend (Client)

- **Framework**: Vite + React + TypeScript
- **State Management**: Redux or Context API
- **UI Library**: Tailwind CSS
- **Communication**:
  - REST API via Fetch/Axios
  - Real-time via Socket.io client
- **Authentication**: JWT-based auth with secure storage
- **Charting**: Chart.js or D3.js for admin statistics
- **Routing**: React Router for page navigation

### Backend (Server)

- **Runtime**: Node.js with Express + TypeScript
- **API**: REST endpoints with validation
- **Real-time**: Socket.io for live updates with namespaced events
- **Multi-threading**: Worker threads (one per Discord client)
- **Authentication**: Passport.js with JWT strategy
- **System Monitoring**: node-os-utils for system stats
- **Logging**: Winston for structured logging
- **Documentation**: Swagger for API documentation

### Database

- **Database**: MongoDB
- **ODM**: Mongoose for schema definition and validation
- **Collections**:
  - Users (both regular and admin users)
  - DiscordAccounts (tokens, settings)
  - Friends (tracked friends)
  - ActivityHistory (game/music activity log)
  - ContentHistory (sent content log)
  - SystemMetrics (server performance metrics)
  - Notifications (user notifications)

## User Roles and Authentication

### User Management

- **Simple Registration**: Only email and password required
- **User Roles**:
  - Regular users: Manage their own Discord accounts
  - Admin users: Additional access to system statistics and user management
- **First-time Login Flow**:
  - Dashboard displays warning banner if no Discord tokens are set up
  - Guided setup process for adding first Discord account
- **Role-based Access Control**:
  - Admins have access to user management and system dashboard
  - Regular users can only manage their own accounts and content
- **Security Features**:
  - bcrypt password hashing
  - JWT with refresh tokens
  - Rate limiting for login attempts
  - Token encryption for Discord tokens

## Detailed Component Design

### 1. Backend Services

#### Account Service

- Manages Discord account tokens securely
- Starts/stops individual Discord client instances
- Tracks status of each client instance
- Stores account-specific settings
- Provides encrypted token storage

#### Worker Thread Manager

- Manages the lifecycle of Discord client worker threads
- Monitors health and performance of worker threads
- Handles communication between main thread and worker threads
- Provides graceful recovery from failures
- Implements resource allocation and load balancing

#### Discord Client Worker

- Runs in an isolated thread
- Connects to Discord with provided token
- Monitors friend activity and status
- Reports events back to the main thread
- Receives commands and configuration updates

#### Content Service

- Plugin-based architecture for different content types
- Content provider registry
- Content search and selection logic
- Content delivery and tracking
- Content preference management
- Support for multiple content types (memes, GIFs, quotes, etc.)

#### Authentication Service

- Simple user registration with email and password
- Role assignment (regular vs admin)
- JWT token generation and validation
- Account security measures
- Password reset functionality
- Audit logging

#### System Monitoring Service

- Collects system metrics (CPU, memory, thread count)
- Monitors application performance
- Tracks resource usage per Discord client
- Stores historical performance data
- Generates alerts based on thresholds

#### Real-time Communication Service

- Socket.io server implementation
- Event dispatching and routing
- Authentication middleware for WebSocket connections
- Message throttling and batching
- Room management for user-specific updates

### 2. Frontend Components

#### Account Manager

- Add/remove Discord accounts
- Configure account settings
- Warning banner for missing Discord tokens
- View status and statistics for each account
- Start/stop/restart individual clients
- Friend management interface

#### Content Manager

- View content history by account or friend
- Configure content search parameters
- Block/approve specific content
- Preview content before sending (optional)
- Support for different content types
- Content preference settings
- Content effectiveness analytics

#### User Configuration

- User authentication and profile management
- Global application settings
- Theme preferences and notification settings
- Password management
- First-time setup wizard

#### Admin Dashboard

- **System Statistics**:
  - Real-time CPU/memory usage charts
  - Thread count and status
  - Active users and client counts
  - Performance graphs and trends
- **User Management**:
  - View/edit all users
  - Change user roles
  - Reset passwords
- **Client Monitoring**:
  - View all running Discord clients
  - Performance metrics per client
  - Error logs and diagnostics
- **System Configuration**:
  - Global settings management
  - Feature flags
  - Maintenance controls

#### Notification Center

- In-app notifications
- Activity feed
- Read/unread state tracking
- Notification preferences
- Action buttons for common tasks

## Database Schema

### Users Collection

```
{
  _id: ObjectId,
  email: String,               // Only email required
  passwordHash: String,
  role: String,                // "admin" or "user"
  setupCompleted: Boolean,     // Whether first-time setup is complete
  createdAt: Date,
  lastLogin: Date,
  settings: {
    theme: String,             // UI theme preference
    notifications: {           // Notification preferences
      enabled: Boolean,
      categories: [String]     // Enabled notification categories
    }
  }
}
```

### DiscordAccounts Collection

```
{
  _id: ObjectId,
  userId: ObjectId,            // Reference to Users
  name: String,                // Display name
  token: String,               // Encrypted token
  isActive: Boolean,
  settings: {
    contentCount: Number,
    checkIntervalMinutes: Number,
    targetUserIds: [String],
    cooldownMinutes: Number,
    language: String,
    contentTypes: [String]     // Types of content to send (e.g., "meme", "gif", "news")
  },
  status: {
    isConnected: Boolean,
    lastConnected: Date,
    friendCount: Number,
    error: String,
    uptime: Number             // Uptime in seconds
  },
  metrics: {
    memoryUsage: Number,       // Memory usage in MB
    responseTime: Number,      // Average response time in ms
    errorCount: Number         // Number of errors since start
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Friends Collection

```
{
  _id: ObjectId,
  discordAccountId: ObjectId,  // Reference to DiscordAccounts
  userId: String,              // Discord user ID
  username: String,
  lastActivity: {
    type: String,              // "GAME" or "MUSIC"
    gameName: String,
    artistName: String,
    songName: String,
    timestamp: Date
  },
  contentReceived: Number,
  lastContentTime: Date,
  contentPreferences: {
    enabledTypes: [String],    // Enabled content types for this friend
    blacklist: [String],       // Blacklisted content keywords
    timeRestrictions: {        // Time restrictions for content delivery
      startHour: Number,
      endHour: Number
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### ActivityHistory Collection

```
{
  _id: ObjectId,
  friendId: ObjectId,          // Reference to Friends
  discordAccountId: ObjectId,  // Reference to DiscordAccounts
  type: String,                // "GAME" or "MUSIC"
  details: {
    gameName: String,
    artistName: String,
    songName: String,
    albumName: String,
    playerName: String
  },
  startTime: Date,
  endTime: Date
}
```

### ContentHistory Collection

```
{
  _id: ObjectId,
  discordAccountId: ObjectId,  // Reference to DiscordAccounts
  friendId: ObjectId,          // Reference to Friends
  contentType: String,         // "meme", "gif", "news", etc.
  content: [{
    url: String,
    title: String,
    source: String,
    type: String               // Content type
  }],
  triggerType: String,         // "GAME" or "MUSIC" or "MANUAL"
  triggerName: String,         // Game name or artist
  sentAt: Date,
  deliveryStatus: String,      // "SUCCESS", "FAILED", etc.
  userFeedback: {              // Optional user feedback
    rating: Number,            // Rating (1-5)
    comment: String            // Optional comment
  }
}
```

### SystemMetrics Collection

```
{
  _id: ObjectId,
  timestamp: Date,
  cpuUsage: Number,            // Percentage
  memoryUsage: {
    total: Number,
    used: Number,
    free: Number
  },
  threadCount: Number,
  activeClients: Number,
  activeUsers: Number,
  requestsPerMinute: Number,
  errorRate: Number            // Errors per minute
}
```

### Notifications Collection

```
{
  _id: ObjectId,
  userId: ObjectId,            // Reference to Users
  type: String,                // Notification type
  title: String,               // Notification title
  message: String,             // Notification message
  read: Boolean,               // Whether notification has been read
  data: Object,                // Additional data related to notification
  actions: [{                  // Optional actions user can take
    label: String,
    action: String,
    data: Object
  }],
  createdAt: Date
}
```

## Implementation Phases

The implementation plan is divided into six distinct phases with estimated durations. The total implementation time is estimated at **105-138 developer days**.

### Phase 1: Server-Side Restructuring (15-20 days)

1. Set up Express server with basic API endpoints
2. Implement worker thread architecture for Discord clients
3. Create MongoDB connection and schemas
4. Refactor existing Discord client code for multi-instance support

### Phase 2: Authentication and Account Management (18-25 days)

1. Implement simple user authentication system (email + password)
2. Add role-based access control (admin vs. regular users)
3. Create account management endpoints
4. Develop secure token storage system
5. Build client status monitoring

### Phase 3: Frontend Development (20-25 days)

1. Create React application with Vite
2. Implement authentication UI with first-time setup guidance
3. Build account management dashboard with warning banners
4. Develop configuration interfaces
5. Create admin dashboard with system statistics

### Phase 4: Content Service Abstraction (16-22 days)

1. Refactor meme service to be a generic content service
2. Add support for different content types
3. Create extensible content search and delivery mechanisms
4. Build content preference system

### Phase 5: Real-time Communication (16-21 days)

1. Set up Socket.io for real-time updates
2. Implement live status updates
3. Add real-time notifications
4. Create live activity feed and system metrics

### Phase 6: Admin Features and Optimization (20-25 days)

1. Implement advanced admin dashboard with system metrics
2. Add comprehensive user management features
3. Create performance monitoring and visualization tools
4. Optimize system for many concurrent Discord clients
5. Implement advanced content filtering options

## Integration Points Between Phases

The phases are designed to build upon each other:

1. **Phase 1 → Phase 2**: The basic API endpoints created in Phase 1 will be enhanced with authentication and access control in Phase 2.

2. **Phase 2 → Phase 3**: The authentication and account management APIs from Phase 2 will be consumed by the frontend in Phase 3.

3. **Phase 3 → Phase 4**: The frontend components created in Phase 3 will be enhanced to support the content abstraction developed in Phase 4.

4. **Phase 4 → Phase 5**: The content delivery system from Phase 4 will be enhanced with real-time notifications in Phase 5.

5. **Phase 5 → Phase 6**: The real-time communication infrastructure from Phase 5 will be leveraged for the admin dashboard and performance monitoring in Phase 6.

## Key Technical Challenges

1. **Worker Thread Management**: Creating reliable communication between main thread and worker threads, handling crashes, and providing clean shutdown.

2. **Discord Token Security**: Implementing secure storage and handling of Discord tokens, which are sensitive credentials.

3. **Stateful Connections**: Managing multiple long-lived Discord connections with proper resource management.

4. **Real-time Updates**: Building an efficient Socket.io implementation that can scale to many concurrent connections.

5. **Content Provider Architecture**: Designing a flexible yet performant plugin system for content providers.

6. **Performance Optimization**: Ensuring the system remains efficient when running many concurrent Discord clients.

7. **Data Synchronization**: Keeping frontend and backend state synchronized through real-time updates.

## Security Considerations

1. **Discord Token Storage**

   - Encrypt tokens at rest in the database
   - Decrypt only in memory when needed
   - Implement secure secrets management
   - Regular token validation and rotation

2. **User Authentication**

   - Use bcrypt for password hashing
   - Implement rate limiting for login attempts
   - Add JWT with proper expiration and refresh mechanism
   - Store secure HTTPOnly cookies for web clients

3. **API Security**
   - Validate all inputs server-side
   - Use HTTPS for all communications
   - Implement proper CORS settings
   - Add rate limiting for all endpoints
   - Validate token permissions for each request

## Deployment Considerations

1. **Containerization**

   - Docker containers for server and client
   - Docker Compose for local development
   - Kubernetes for production scaling (optional)

2. **Monitoring**

   - Implement health checks for all services
   - Set up logging with Winston/Pino
   - Add error tracking and alerting
   - Implement performance metrics collection

3. **Scaling Strategy**
   - Horizontal scaling for API servers
   - Vertical scaling for Discord client nodes
   - Database sharding for large-scale deployments
   - Load balancing with sticky sessions for WebSocket connections

## Next Steps

1. Begin implementation of Phase One
2. Set up project repository structure with client and server directories
3. Establish development, staging, and production environments
4. Create initial Express server and MongoDB connection
5. Start refactoring existing Discord client code for worker thread architecture
