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

## Development Roadmap

The project is being developed in six phases, each focusing on specific aspects of the system:

### Phase 1: Server-Side Restructuring (Current Phase)

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
- [ ] Content delivery system
  - [ ] Content provider interface
  - [ ] Content history tracking
  - [ ] Error handling and retries
- [ ] System monitoring and metrics
  - [ ] Worker health checks
  - [ ] Performance metrics
  - [ ] Error reporting

### Phase 2: Authentication and Account Management

- User authentication system with JWT
- Role-based access control
- Secure token storage
- Account management endpoints
- Client status monitoring

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

### Discord Accounts

- **GET /accounts**: List all Discord accounts
- **GET /accounts/{id}**: Get specific account details
- **POST /accounts**: Add a new Discord account
- **PATCH /accounts/{id}**: Update account settings
- **DELETE /accounts/{id}**: Remove an account
- **POST /accounts/{id}/start**: Start a Discord client
- **POST /accounts/{id}/stop**: Stop a Discord client

### Health & Status

- **GET /health**: Basic health check
- **GET /health/status**: Detailed system status including:
  - System uptime
  - Current timestamp
  - Worker counts (total and active)
  - Memory usage metrics

### Content

- **POST /content/search**: Search for content based on activity
- **GET /content/history/{friendId}**: Get content history for a friend
- **PATCH /content/history/{friendId}/delivered**: Update delivery status

### Authentication (Phase 2)

- **POST /auth/register**: Register a new user
- **POST /auth/login**: Authenticate user

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

## Security Considerations

1. **Discord Tokens**:

   - Stored encrypted in database
   - Decrypted only in memory when needed
   - Never logged or exposed in API responses

2. **API Security**:
   - Rate limiting on all endpoints
   - Input validation and sanitization
   - Error messages don't expose sensitive information

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
