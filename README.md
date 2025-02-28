# Discord Auto Meme

A Discord client that automatically detects when your friends are playing games and sends them relevant memes.

## Features

- **Friend Activity Monitoring**: Automatically detects when friends start playing games on Discord.
- **Game-Specific Memes**: Searches for memes related to the specific game your friend is playing.
- **Customizable**: Configure how many memes to send, how often to check, and more.
- **Test Mode**: Option to run without actually sending messages, for testing.
- **Targeted Mode**: Can focus on a specific user for efficiency.
- **Multilanguage Support (i18n)**: Supports English and Portuguese languages with interactive language selection at startup.
- **Real-time Response**: Sends memes immediately when a friend starts playing a game.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Discord account token
- SerpApi API key (for Google image search)

## Configuration

The application can be configured using environment variables in a `.env` file. Here's an example configuration:

```env
# Discord authentication
DISCORD_TOKEN=your_discord_token_here

# SerpApi (Google Search API) credentials
SERPAPI_API_KEY=your_serpapi_key_here

# Configuration
MEME_COUNT=5
CHECK_INTERVAL_MINUTES=15
SEND_MEMES=true
# For multiple users, separate with commas
TARGET_USER_IDS=123456789012345678,234567890123456789
LANGUAGE=en
```

## Environment Variables

- `DISCORD_TOKEN`: Your Discord account token
- `SERPAPI_API_KEY`: API key for SerpApi (used for meme search)
- `MEME_COUNT`: Number of memes to send per message (default: 5)
- `CHECK_INTERVAL_MINUTES`: How often to check friends' status in minutes (default: 15)
- `SEND_MEMES`: Whether to actually send messages or just run in test mode (default: true)
- `TARGET_USER_IDS`: Specific Discord user IDs to target, comma-separated (leave empty to target all friends)
- `LANGUAGE`: Application language code (en, pt)

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the `.env.example` file to `.env`:
   ```
   cp .env.example .env
   ```
4. Edit the `.env` file with your credentials:
   - `DISCORD_TOKEN`: Your Discord account token
   - `SERPAPI_API_KEY`: Your SerpApi API key for Google search
   - `MEME_COUNT`: Number of memes to send (default: 5)
   - `CHECK_INTERVAL_MINUTES`: How often to check for gaming activity (default: 15 minutes)
   - `SEND_MEMES`: Toggle for actually sending messages (set to "false" for testing)
   - `TARGET_USER_IDS`: Specific Discord user IDs to target, comma-separated (leave empty to target all friends)
   - `LANGUAGE`: Default application language (en, pt)

## Testing Mode

The application includes a test mode that allows you to validate all functionality without actually sending messages to your friends. To use test mode:

1. Set `SEND_MEMES=false` in your `.env` file
2. Run the application normally
3. The application will detect games and find memes but will only log what it would have sent rather than actually sending messages
4. Once you're satisfied with the behavior, set `SEND_MEMES=true` to enable actual message sending

## Targeting Specific Friends

If you want to test with or only send memes to specific friends:

1. Find your friends' Discord user IDs (right-click their username and select "Copy ID" if you have Developer Mode enabled)
2. Set `TARGET_USER_IDS=` in your `.env` file with comma-separated IDs:
   ```
   TARGET_USER_IDS=123456789012345678,234567890123456789
   ```
3. The application will only check for and send memes to those specific friends
4. To target all friends again, simply remove the value or leave it empty

## Real-time Game Detection

The application has two methods for detecting when friends are playing games:

1. **Event-based Detection**: Automatically detects when a friend starts playing a game through Discord's presence update events. This happens in real-time and triggers immediate meme sending.

2. **Periodic Polling**: Checks all friends' status at regular intervals (defined by `CHECK_INTERVAL_MINUTES`). This serves as a backup to ensure no gaming activity is missed.

### Checking Current Games Without Waiting

When the application starts, it immediately performs an initial check of all friends' statuses to detect anyone currently playing games. This means you don't have to wait for a friend to change their status - the application will find friends who are already playing games and send memes right away.

If you want to force an immediate check of all friends' current gaming status:

1. Restart the application - it will automatically do an initial check of all friends
2. Reduce `CHECK_INTERVAL_MINUTES` to a lower value (e.g., 1-5 minutes) for more frequent checks

The application uses several methods to find friends' presence information, including:

- Direct user presence data
- Shared guild member presence
- Guild presence cache
- Active fetching of member data from shared servers

This multi-layered approach ensures the application can detect friends playing games even when Discord's presence system doesn't immediately report all status changes.

### Troubleshooting Presence Detection

If you're experiencing issues with the direct user presence method not working, this is likely due to Discord's recent API changes and restrictions. Discord has been actively limiting presence data accessibility, especially for user accounts (self-bots).

To optimize presence detection:

1. **Ensure Shared Servers**: Make sure you share at least one server/guild with the friends you want to track. The shared guild method is generally more reliable than direct presence detection.

2. **Wait for Initial Connection**: When first starting the application, it may take a minute or two for the Discord client to properly establish connections and populate the presence cache.

3. **Check Privacy Settings**: Ask your friends to verify their privacy settings allow activity status to be visible.

## Language Support

The application supports multiple languages. Currently included:

- English (en): Default language
- Portuguese (pt): Portuguese translations

You can select a language in two ways:

1. **Interactive Selection**: When starting the application, you'll be prompted to select a language:

   ```
   === Language Selection / Seleção de Idioma ===
   Available languages / Idiomas disponíveis:
   1. English
   2. Português

   Select a language (1-2) [default: en]:
   ```

2. **Environment Variable**: Set `LANGUAGE=pt` (or another supported language code) in your `.env` file

To add a new language:

1. Create a new folder in `src/locales/` with your language code (e.g., `fr` for French)
2. Copy and translate the JSON files from an existing language folder
3. The new language will be automatically detected and available for selection at startup

## Getting Required API Keys

### How to Get Your Discord Token

⚠️ **WARNING: Sharing your token gives others full access to your account. Never share it with anyone!** ⚠️

There are multiple ways to get your Discord token:

#### Method 1: Using Browser Developer Tools

1. Open Discord in your browser (discord.com/app)
2. Press F12 or Right-click and select "Inspect" to open Developer Tools
3. Go to the Network tab
4. Click on any API request (like /api/v9/users/@me)
5. Find the "authorization" header in the request headers
6. That value is your token

#### Method 2: Using Browser Console

1. Open Discord in your browser
2. Press F12 to open Developer Tools
3. Navigate to the Console tab
4. Paste the following code and press Enter:
   ```javascript
   (webpackChunkdiscord_app.push([
     [""],
     {},
     (e) => {
       m = [];
       for (let c in e.c) m.push(e.c[c]);
     },
   ]),
   m)
     .find((m) => m?.exports?.default?.getToken !== void 0)
     .exports.default.getToken();
   ```
5. Copy the token that appears (without quotes)

#### Method 3: From Discord Desktop Client

1. Press Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac) to open Developer Tools
2. Go to the Network tab and refresh (F5)
3. Type "api" in the filter box
4. Look for requests to Discord's API
5. Find the "authorization" header in any request
6. Copy the token value

**Note**: Discord frequently updates its client which may cause some methods to stop working. If one method fails, try another.

**Important Security Warning**: Using your Discord token in third-party applications is against Discord's Terms of Service and can compromise your account security. This project is for educational purposes only.

### How to Get Your SerpApi Key

1. Go to [SerpApi's website](https://serpapi.com/)
2. Sign up for a free account
3. After signing in, navigate to your dashboard
4. Find your API key in the dashboard (usually displayed prominently)
5. You get 100 free searches per month, which should be enough for testing

## Running the Application

Development mode:

```
npm run dev
```

Production mode:

```
npm run build
npm start
```

## Legal Disclaimer

This project uses a self-bot Discord client, which may be against Discord's Terms of Service. Use at your own risk. This project is for educational purposes only.

## License

This project is licensed under the ISC License.

## Performance Considerations

When using the `TARGET_USER_IDS` setting, the application switches to a more efficient mode where it:

1. Only queries status for the specific users instead of all friends
2. Reduces the API calls to Discord
3. Processes updates more quickly

This is particularly useful when you're only interested in specific friends' gaming activity and want to minimize the application's resource usage.
