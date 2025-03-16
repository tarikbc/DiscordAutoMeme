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

- [x] Create separate `client` and `server` directories
- [x] Set up Express server in the `server` directory
- [x] Configure TypeScript for the server
- [x] Set up environment configuration loading
- [x] Implement basic logging infrastructure using Winston
- [x] Create a basic error handling middleware

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

- [x] Set up MongoDB connection
- [x] Implement Mongoose schemas:
  - [x] Users
  - [x] DiscordAccounts
  - [x] Friends
  - [x] ActivityHistory
  - [x] ContentHistory
  - [x] SystemMetrics
- [x] Create data access layers for each schema
- [x] Implement error handling for database operations
- [x] Set up validation for database models
- [x] Create seed data for development

### 3. Worker Thread Architecture (Estimated time: 3-4 days)

- [x] Design message protocol between main thread and worker threads
- [x] Create worker thread manager to:
  - [x] Spawn new worker threads
  - [x] Monitor worker thread health
  - [x] Restart failed worker threads
  - [x] Handle graceful shutdown
- [x] Implement Discord client worker thread that:
  - [x] Receives configuration from main thread
  - [x] Connects to Discord with provided token
  - [x] Monitors friend activity
  - [x] Reports status back to main thread
  - [x] Receives commands from main thread

### 4. Discord Client Refactoring (Estimated time: 3-4 days)

- [x] Refactor existing `DiscordClient` class to run in a worker thread
- [x] Create serializable message types for worker communication
- [x] Extract core functionality from current implementation:
  - [x] Discord connection handling
  - [x] Friend status monitoring
  - [x] Activity detection
- [x] Ensure proper error handling and reporting
- [x] Implement clean shutdown mechanism

### 5. Basic API Endpoints (Estimated time: 2-3 days)

- [x] Implement basic authentication endpoints (placeholder for Phase 2):
  - [x] POST `/api/auth/register` (create a new user)
  - [x] POST `/api/auth/login` (authenticate user)
- [x] Implement Discord account management endpoints:
  - [x] GET `/api/accounts` (list user's Discord accounts)
  - [x] POST `/api/accounts` (add a new Discord account)
  - [x] GET `/api/accounts/:id` (get account details)
  - [x] PUT `/api/accounts/:id` (update account settings)
  - [x] DELETE `/api/accounts/:id` (remove an account)
  - [x] POST `/api/accounts/:id/start` (start a Discord client)
  - [x] POST `/api/accounts/:id/stop` (stop a Discord client)
- [x] Implement basic health check and status endpoints:
  - [x] GET `/api/status` (get server status)
  - [x] GET `/api/health` (health check)

### 6. Service Layer Implementation (Estimated time: 3-4 days)

- [x] Create `AccountService` for managing User accounts accounts:
  - [x] Store and retrieve account data
  - [x] Encrypt and decrypt Discord tokens
  - [x] Manage account settings
  - [x] Interface with worker thread manager
- [x] Create `ContentService` (basic version):
  - [x] Refactor from existing `MemeService` (./src/meme-service.ts)
  - [x] Make it content-type agnostic
  - [x] Store content history
- [x] Create `SystemService` for monitoring:
  - [x] Track basic system metrics
  - [x] Monitor worker threads
- [x] Update the `seed.ts` file to use the new content service

### 7. Testing and Documentation (Estimated time: 2-3 days)

- [x] Set up testing framework (Jest)
- [x] Create unit tests for core service functions
- [x] Create integration tests for API endpoints
- [x] Document API endpoints with Swagger
- [x] Update project documentation

### 8. Finalizing Phase One (Estimated time: 1-2 days)

- [x] Ensure all major components work together
- [x] Perform load testing with multiple Discord clients
- [x] Fix bugs and optimize performance
- [x] Create demo script for easy testing
- [x] Document known issues and limitations

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
