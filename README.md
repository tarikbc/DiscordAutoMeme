# Discord Auto Content

A scalable multi-client Discord service that automatically detects when your friends are playing games or listening to music and sends them relevant content.

## Features

- **Multi-Client Support**: Run multiple Discord clients simultaneously, each with its own configuration
- **Worker Thread Architecture**: Each Discord client runs in its own worker thread for improved stability and performance
- **Friend Activity Monitoring**: Automatically detects when friends start playing games or listening to music on Discord
- **Game-Specific Content**: Searches for content related to the specific game your friend is playing
- **Artist-Specific Content**: Detects when friends are listening to music and sends content related to the artist
- **System Monitoring**: Real-time monitoring of system metrics, worker status, and performance
- **Customizable**: Configure how many content items to send, how often to check, and more
- **Test Mode**: Option to run without actually sending messages, for testing
- **Targeted Mode**: Can focus on specific users for efficiency
- **Multilanguage Support (i18n)**: Supports English and Portuguese languages
- **Real-time Response**: Sends content immediately when a friend starts playing a game or listening to music
- **MongoDB Integration**: Persistent storage for accounts, friends, and content history
- **RESTful API**: Comprehensive API for managing accounts and monitoring system status
- **Secure Authentication**: Email/password authentication with JWT tokens and refresh mechanism
- **Role-based Access Control**: Flexible permission system for controlling access to features
- **Real-time Status Monitoring**: Track the status of Discord clients with history
- **Critical Issue Alerting**: Customizable alerts for connection problems, token issues, and error rates with batch processing for scalability
- **Monitoring Dashboard**: Real-time metrics and status information

## Development Roadmap

The project is being developed in six phases, each focusing on specific aspects of the system:

### Phase 1: Server-Side Restructuring (Completed)

- [x] Set up Express server with TypeScript
- [x] Implement worker thread architecture for Discord client management
- [x] MongoDB integration with Mongoose schemas
- [x] Basic testing infrastructure
- [x] Activity monitoring system
  - [x] Game activity detection
  - [x] Music activity detection
  - [x] Streaming activity detection
  - [x] Watching activity detection
  - [x] Custom activity detection
  - [x] Competing activity detection
  - [x] Activity history tracking
  - [x] Cooldown management
- [x] Content delivery system
  - [x] Content provider interface
  - [x] Content history tracking
  - [x] Error handling and retries
- [x] System monitoring and metrics
  - [x] Worker health checks
  - [x] Performance metrics
  - [x] Error reporting

### Phase 2: Authentication and Account Management (Current Phase)

- [x] User authentication system with JWT
  - [x] Secure password hashing with bcrypt
  - [x] JWT token generation and validation
  - [x] Token refresh mechanism
  - [x] Password reset functionality
  - [x] Login rate limiting
- [x] Role-based access control
  - [x] Flexible permission system
  - [x] Permission-based middleware
  - [x] Role management endpoints
- [x] Account management endpoints
  - [x] CRUD operations for Discord accounts
  - [x] Validation and error handling
  - [x] Filtering and pagination
- [x] Secure token storage
  - [x] Token encryption at rest
  - [x] Token validation before usage
- [x] Client status monitoring
  - [x] Real-time status tracking
  - [x] Status history
  - [x] Automatic client recovery
- [x] First-time setup experience
  - [x] Guided setup process
  - [x] Setup status tracking
- [ ] Security audit and testing
  - [x] Authentication and role-based security tests
  - [ ] Penetration testing
  - [ ] Security documentation

### Phase 3: Frontend Development

- React application with Vite
- Authentication UI
- Account management dashboard
- Configuration interfaces
- Admin dashboard with system statistics

### Phase 4: Content Service Abstraction

- Plugin-based content providers
- Extended content types support
- Content search optimization
- Content preference system
- Content delivery tracking

### Phase 5: Real-time Communication

- Socket.io integration
- Live status updates
- Real-time notifications
- Activity feed
- System metrics streaming

### Phase 6: Admin Features and Optimization

- Advanced admin dashboard
- User management features
- Performance monitoring tools
- System optimization
- Advanced content filtering

## Development Timeline & Integration

The complete project is estimated to take **105-138 developer days** to implement:

- Phase 1: 15-20 days
- Phase 2: 18-25 days
- Phase 3: 20-25 days
- Phase 4: 16-22 days
- Phase 5: 16-21 days
- Phase 6: 20-25 days

### Integration Points

The phases are designed to build upon each other:

1. **Phase 1 → Phase 2**: Basic API endpoints are enhanced with authentication and access control.

2. **Phase 2 → Phase 3**: Authentication and account management APIs are consumed by the frontend.

3. **Phase 3 → Phase 4**: Frontend components are enhanced to support the content abstraction system.

4. **Phase 4 → Phase 5**: Content delivery system is enhanced with real-time notifications.

5. **Phase 5 → Phase 6**: Real-time infrastructure is leveraged for admin features and monitoring.

### Key Technical Challenges

1. **Worker Thread Management**:

   - Reliable communication between threads
   - Crash handling and recovery
   - Clean shutdown procedures

2. **Discord Token Security**:

   - Secure storage and encryption
   - Safe token handling
   - Access control and auditing

3. **Stateful Connections**:

   - Managing multiple Discord connections
   - Resource allocation
   - Connection recovery

4. **Real-time Updates**:

   - Efficient Socket.io implementation
   - State synchronization
   - Event handling at scale

5. **Content Provider Architecture**:
   - Plugin system design
   - Content type abstraction
   - Delivery optimization

## System Architecture

The application follows a multi-service architecture:

```
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

## Prerequisites

- Node.js (v16+)
- MongoDB (v4.4+)
- npm or yarn
- Discord account tokens
- SerpApi API key (for content search)

## Configuration

The application can be configured using environment variables in a `.env` file:

```env
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/discord-auto-meme

# SerpApi (Google Search API) credentials
SERP_API_KEY=your_serpapi_key_here

# Discord tokens (for multiple accounts)
DISCORD_TOKEN_1=your_first_discord_token
DISCORD_TOKEN_2=your_second_discord_token
# Add more tokens as needed...

# System configuration
NODE_ENV=development
LOG_LEVEL=info
```

## API Endpoints

### Authentication

- **POST /api/auth/register**: Register a new user
- **POST /api/auth/login**: Authenticate user
- **POST /api/auth/refresh**: Refresh access token
- **POST /api/auth/forgot-password**: Request password reset
- **POST /api/auth/reset-password**: Reset password with token

### User Management

- **GET /api/users**: List all users (admin only)
- **GET /api/users/:id**: Get specific user details
- **PUT /api/users/:id**: Update user information
- **DELETE /api/users/:id**: Remove a user

### Roles and Permissions

- **GET /api/roles**: List all roles
- **GET /api/roles/:id**: Get specific role details
- **POST /api/roles**: Create a new role
- **PUT /api/roles/:id**: Update a role
- **POST /api/roles/assign/:userId**: Assign roles to a user
- **GET /api/roles/my-permissions**: Get current user's permissions

### Discord Accounts

- **GET /api/accounts**: List all Discord accounts
- **GET /api/accounts/:id**: Get specific account details
- **POST /api/accounts**: Add a new Discord account
- **PUT /api/accounts/:id**: Update account settings
- **DELETE /api/accounts/:id**: Remove an account
- **POST /api/accounts/:id/start**: Start a Discord client
- **POST /api/accounts/:id/stop**: Stop a Discord client
- **GET /api/accounts/:id/status**: Get current account status
- **GET /api/accounts/:id/status/history**: Get account status history

### Dashboard

- **GET /api/dashboard/accounts**: Get account statistics
- **GET /api/dashboard/activity**: Get recent activity data
- **GET /api/dashboard/content**: Get content delivery statistics

### Setup

- **GET /api/setup/status**: Get setup completion status
- **POST /api/setup/account**: Add first Discord account
- **POST /api/setup/complete**: Mark setup as complete

### Health & Status

- **GET /health**: Basic health check
- **GET /api/health**: Detailed system status

## Testing Tools

The application includes comprehensive testing tools:

### Demo Script

Run a demonstration of core functionality:

```bash
npm run ts-node src/demo.ts
```

The demo:

- Creates test Discord accounts
- Starts Discord clients
- Monitors worker status
- Tests content search
- Collects system metrics

### Load Testing

Test system stability and performance:

```bash
npm run ts-node src/loadTest.ts
```

The load test:

- Runs multiple concurrent Discord clients
- Monitors memory and CPU usage
- Performs periodic content searches
- Tracks error rates
- Generates performance metrics

Configure load test parameters in `loadTest.ts`:

```typescript
const NUM_ACCOUNTS = 5; // Number of concurrent clients
const NUM_FRIENDS_PER_ACCOUNT = 3; // Friends per account
const TEST_DURATION_MS = 5 * 60000; // Test duration (5 minutes)
const METRICS_INTERVAL_MS = 10000; // Metrics collection interval
```

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd server
   npm install
   ```
3. Create `.env` file with required configuration
4. Start MongoDB
5. Run in development mode:
   ```bash
   npm run dev
   ```

### Testing

Run unit tests:

```bash
npm test
```

Run integration tests:

```bash
npm run test:integration
```

### Code Quality

Check for linting issues:

```bash
npm run lint
```

Fix automatic linting issues:

```bash
npm run lint:fix
```

## Known Limitations

1. **Discord API Restrictions**:

   - Limited presence data accessibility
   - Rate limiting on API calls
   - Token security considerations

2. **System Resources**:

   - Each Discord client requires a separate worker thread
   - Memory usage scales with number of active clients
   - Recommended maximum of 10 concurrent clients per instance

3. **Content Search**:
   - SerpApi free tier limited to 100 searches/month
   - Content relevance depends on search query quality
   - Some content may be inappropriate or irrelevant

## Security Features

- **Password Security**: Passwords are hashed using bcrypt with appropriate salt rounds
- **JWT Authentication**: Secure authentication using JWT tokens with proper expiration
- **Token Refresh**: Implemented token refresh mechanism to maintain sessions securely
- **Token Revocation**: System for invalidating tokens on logout, password change, or security concerns
- **Rate Limiting**: Protection against brute force attacks
- **Role-based Access Control**: Granular permissions system for access control
- **Encrypted Token Storage**: Discord tokens are encrypted at rest in the database
- **Input Validation**: Thorough validation of all API inputs
- **Error Handling**: Secure error handling that doesn't expose sensitive information

## Future Enhancements (Phase 2+)

1. **User Authentication**:

   - JWT-based authentication
   - Role-based access control
   - User management interface

2. **Content Providers**:

   - Plugin system for different content sources
   - Content filtering and moderation
   - User feedback and rating system

3. **Monitoring**:
   - Advanced metrics dashboard
   - Alert system for issues
   - Performance optimization tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
