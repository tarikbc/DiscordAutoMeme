# Phase One: Server-Side Restructuring

## Overview

Phase One focuses on transforming the current single-instance Discord Auto Meme project into a scalable multi-client server architecture. This phase creates the foundation for all future development by implementing the core backend infrastructure, setting up the database, and refactoring the existing Discord client code to support multiple instances.

## Goals

1. Set up Express server with basic API endpoints
2. Implement worker thread architecture for Discord clients
3. Create MongoDB connection and schemas
4. Refactor existing Discord client code for multi-instance support

## Detailed Tasks

### 1. Project Structure Setup (Estimated time: 1-2 days)

- [ ] Create separate `client` and `server` directories
- [ ] Set up Express server in the `server` directory
- [ ] Configure TypeScript for the server
- [ ] Set up environment configuration loading
- [ ] Implement basic logging infrastructure using Winston
- [ ] Create a basic error handling middleware

```
Discord-auto-content/
├── client/                  # Will be implemented in Phase 3
├── server/
│   ├── src/
│   │   ├── api/             # API endpoints
│   │   ├── config/          # Configuration
│   │   ├── models/          # MongoDB models
│   │   ├── services/        # Service layer
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── workers/         # Worker thread implementations
│   │   ├── app.ts           # Express application
│   │   └── server.ts        # Server entry point
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── tsconfig.json
├── docs/                    # Documentation
│   ├── masterplan.md
│   ├── phase_one.md
│   └── ...
└── README.md
```

### 2. Database Setup (Estimated time: 2-3 days)

- [ ] Set up MongoDB connection
- [ ] Implement Mongoose schemas:
  - [ ] Users
  - [ ] DiscordAccounts
  - [ ] Friends
  - [ ] ActivityHistory
  - [ ] ContentHistory
  - [ ] SystemMetrics
- [ ] Create data access layers for each schema
- [ ] Implement error handling for database operations
- [ ] Set up validation for database models
- [ ] Create seed data for development

### 3. Worker Thread Architecture (Estimated time: 3-4 days)

- [ ] Design message protocol between main thread and worker threads
- [ ] Create worker thread manager to:
  - [ ] Spawn new worker threads
  - [ ] Monitor worker thread health
  - [ ] Restart failed worker threads
  - [ ] Handle graceful shutdown
- [ ] Implement Discord client worker thread that:
  - [ ] Receives configuration from main thread
  - [ ] Connects to Discord with provided token
  - [ ] Monitors friend activity
  - [ ] Reports status back to main thread
  - [ ] Receives commands from main thread

### 4. Discord Client Refactoring (Estimated time: 3-4 days)

- [ ] Refactor existing `DiscordClient` class to run in a worker thread
- [ ] Create serializable message types for worker communication
- [ ] Extract core functionality from current implementation:
  - [ ] Discord connection handling
  - [ ] Friend status monitoring
  - [ ] Activity detection
- [ ] Ensure proper error handling and reporting
- [ ] Implement clean shutdown mechanism

### 5. Basic API Endpoints (Estimated time: 2-3 days)

- [ ] Implement basic authentication endpoints (placeholder for Phase 2):
  - [ ] POST `/api/auth/register` (create a new user)
  - [ ] POST `/api/auth/login` (authenticate user)
- [ ] Implement Discord account management endpoints:
  - [ ] GET `/api/accounts` (list user's Discord accounts)
  - [ ] POST `/api/accounts` (add a new Discord account)
  - [ ] GET `/api/accounts/:id` (get account details)
  - [ ] PUT `/api/accounts/:id` (update account settings)
  - [ ] DELETE `/api/accounts/:id` (remove an account)
  - [ ] POST `/api/accounts/:id/start` (start a Discord client)
  - [ ] POST `/api/accounts/:id/stop` (stop a Discord client)
- [ ] Implement basic health check and status endpoints:
  - [ ] GET `/api/status` (get server status)
  - [ ] GET `/api/health` (health check)

### 6. Service Layer Implementation (Estimated time: 3-4 days)

- [ ] Create `AccountService` for managing User accounts accounts:
  - [ ] Store and retrieve account data
  - [ ] Encrypt and decrypt Discord tokens
  - [ ] Manage account settings
  - [ ] Interface with worker thread manager
- [ ] Create `ContentService` (basic version):
  - [ ] Refactor from existing `MemeService` (./src/meme-service.ts)
  - [ ] Make it content-type agnostic
  - [ ] Store content history
- [ ] Create `SystemService` for monitoring:
  - [ ] Track basic system metrics
  - [ ] Monitor worker threads
- [ ] Update the `seed.ts` file to use the new content service

### 7. Testing and Documentation (Estimated time: 2-3 days)

- [ ] Set up testing framework (Jest)
- [ ] Create unit tests for core service functions
- [ ] Create integration tests for API endpoints
- [ ] Document API endpoints with Swagger
- [ ] Update project documentation

### 8. Finalizing Phase One (Estimated time: 1-2 days)

- [ ] Ensure all major components work together
- [ ] Perform load testing with multiple Discord clients
- [ ] Fix bugs and optimize performance
- [ ] Create demo script for easy testing
- [ ] Document known issues and limitations

## Key Technical Challenges

1. **Worker Thread Management**: Ensuring reliable communication between the main thread and worker threads, handling crashes, and providing clean shutdown.

2. **Token Security**: Implementing secure storage and handling of Discord tokens, which are sensitive credentials.

3. **Stateful Connections**: Managing the stateful nature of Discord connections in a scalable way.

4. **Error Handling**: Creating robust error handling across thread boundaries to ensure system stability.

5. **Resource Management**: Ensuring the system doesn't overuse resources when running multiple Discord clients.

## Expected Outcomes

By the end of Phase One, we will have:

- A functioning Express server with basic API endpoints
- MongoDB database with proper schemas and data access layers
- Worker thread architecture for running multiple Discord clients
- Refactored Discord client code that can run in worker threads
- Basic service layer for account and content management
- Foundational infrastructure for subsequent phases

## Transition to Phase Two

Phase Two will build upon this foundation by implementing:

- Full user authentication system
- Role-based access control
- Secure token storage
- Comprehensive account management
- Client status monitoring

The groundwork laid in Phase One will make these features easier to implement as the core architecture will already be in place.

## Estimated Timeline

Phase One is expected to take approximately **15-20 developer days** to complete, depending on complexity and unforeseen challenges.

## Resources Required

- Node.js developer with TypeScript experience
- MongoDB expertise for database design
- Knowledge of Discord API and discord.js library
- Understanding of worker threads in Node.js
- Experience with Express.js for API development
