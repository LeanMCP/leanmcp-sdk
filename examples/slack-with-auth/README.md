# Slack MCP Server with Authentication

A comprehensive example of building a Slack integration using the LeanMCP SDK with AWS Cognito authentication.

## Overview

This example demonstrates:
- **Protected Slack operations** using `@Authenticated` decorator
- **Token-based authentication** with AWS Cognito
- **Environment-based configuration** using `.env` files
- **Multiple services** (Slack, Auth) with different access levels
- **Tools, Resources, and Prompts** with authentication

## Architecture

### Services

#### 1. **SlackService** (Protected)
All methods require authentication via `@Authenticated` decorator at class level.

**Tools:**
- `sendMessage` - Send messages to Slack channels
- `getChannelHistory` - Retrieve channel message history
- `createChannel` - Create new public/private channels
- `searchMessages` - Search messages across workspace
- `setUserStatus` - Update user status with emoji
- `addReaction` - Add emoji reactions to messages

**Resources:**
- `listChannels` - Get list of all workspace channels
- `getWorkspaceInfo` - Get workspace information

**Prompts:**
- `composeMessagePrompt` - Generate professional message templates
- `channelDescriptionPrompt` - Generate channel descriptions

#### 2. **PublicSlackService** (Public)
No authentication required.

**Tools:**
- `getServiceInfo` - Get service information and capabilities

#### 3. **AuthService** (Token Management)
No authentication required (used to obtain tokens).

**Tools:**
- `refreshToken` - Refresh expired access tokens
- `getAuthInfo` - Get authentication requirements

## Setup

### 1. Prerequisites

- Node.js 18+ installed
- AWS Cognito User Pool configured
- Slack workspace and bot token (optional for testing)

### 2. Install Dependencies

```bash
cd examples/slack-with-auth
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# AWS Cognito Configuration
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id

# Slack Configuration (optional for testing)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. AWS Cognito Setup

If you don't have a Cognito User Pool:

1. Go to AWS Console → Cognito
2. Create a new User Pool
3. Configure app client (no client secret for this example)
4. Note your User Pool ID and Client ID
5. Create a test user

### 5. Run the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Usage

### Authentication Flow

1. **Obtain Access Token** (outside this server):
   ```bash
   # Use AWS CLI or Cognito SDK to authenticate
   aws cognito-idp initiate-auth \
     --auth-flow USER_PASSWORD_AUTH \
     --client-id YOUR_CLIENT_ID \
     --auth-parameters USERNAME=user@example.com,PASSWORD=YourPassword
   ```

2. **Use Token in Requests**:
   ```json
   {
     "token": "eyJraWQiOiJ...",
     "channel": "#general",
     "text": "Hello World!"
   }
   ```

3. **Refresh Expired Token**:
   ```json
   {
     "refreshToken": "your-refresh-token",
     "username": "user@example.com"
   }
   ```

### Example Requests

#### Send a Message (Protected)

```json
{
  "method": "tools/call",
  "params": {
    "name": "sendMessage",
    "arguments": {
      "token": "eyJraWQiOiJ...",
      "channel": "#general",
      "text": "Hello from MCP!"
    }
  }
}
```

#### Get Service Info (Public)

```json
{
  "method": "tools/call",
  "params": {
    "name": "getServiceInfo",
    "arguments": {}
  }
}
```

#### Refresh Token

```json
{
  "method": "tools/call",
  "params": {
    "name": "refreshToken",
    "arguments": {
      "refreshToken": "your-refresh-token",
      "username": "user@example.com"
    }
  }
}
```

#### List Channels (Protected Resource)

```json
{
  "method": "resources/read",
  "params": {
    "uri": "slack://listChannels"
  }
}
```

Note: For resources, the token should be passed in the request context/headers.

## Error Handling

### Authentication Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `MISSING_TOKEN` | No token provided | Include `token` field in request |
| `INVALID_TOKEN` | Token is invalid or expired | Use `refreshToken` to get new token |
| `VERIFICATION_FAILED` | Token verification failed | Check Cognito configuration |

### Example Error Response

```json
{
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authentication required. Please provide a valid token in the request."
  }
}
```

## Project Structure

```
slack-with-auth/
├── main.ts                  # Main server entry point
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment template
├── .env                     # Your configuration (gitignored)
├── README.md                # This file
└── mcp/
    ├── config.ts            # Shared configuration (authProvider)
    ├── slack/
    │   └── index.ts         # Slack service implementation
    └── auth/
        └── index.ts         # Auth service implementation
```

## Key Features Demonstrated

### 1. Class-Level Authentication

```typescript
@Authenticated(authProvider)
export class SlackService {
  // All methods automatically require authentication
  @Tool({ description: 'Send message' })
  async sendMessage(args: SendMessageInput) {
    // Implementation
  }
}
```

### 2. Shared Configuration

```typescript
// mcp/config.ts
import { AuthProvider } from "@leanmcp/auth";

export const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
});

await authProvider.init();
```

### 3. Auto-Discovery with Zero Config

```typescript
// main.ts
const serverFactory = async () => {
  const server = new MCPServer({
    name: 'slack-with-auth',
    version: '1.0.0',
    logging: true
  });

  // Services are automatically discovered and registered from ./mcp
  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: parseInt(process.env.PORT || '3000'),
  cors: true,
  logging: true  // Log HTTP requests
});
```

### 4. Mixed Public/Private APIs

```typescript
// Protected service
@Authenticated(authProvider)
export class SlackService { }

// Public service (no decorator)
export class PublicSlackService { }
```

### 5. Token Management

```typescript
export class AuthService {
  @Tool({ description: 'Refresh token' })
  async refreshToken(args: RefreshTokenInput) {
    return await this.authProvider.refreshToken(
      args.refreshToken,
      args.username
    );
  }
}
```

## Testing Without Slack

The example works without a real Slack token - it simulates API calls for testing purposes. To use with real Slack:

1. Create a Slack App at https://api.slack.com/apps
2. Add bot token scopes (chat:write, channels:read, etc.)
3. Install app to workspace
4. Copy bot token to `.env` file
5. Install `@slack/web-api` package
6. Replace simulated calls with real Slack API calls

## Best Practices Demonstrated

1. **Zero-config auto-discovery** - Services automatically registered from `./mcp` directory
2. **Shared configuration** - `config.ts` for dependencies used across services
3. **Environment-based configuration** - No hardcoded credentials
4. **Class-level authentication** - DRY principle for protected services
5. **Separate public/private services** - Clear access control
6. **Token refresh capability** - Handle expired tokens gracefully
7. **Comprehensive error handling** - Clear error messages
8. **Type-safe inputs/outputs** - Full TypeScript support
9. **Proper service separation** - Auth logic separate from business logic

## Troubleshooting

### "Missing required AWS Cognito configuration"
- Ensure `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` are set in `.env`

### "Authentication required"
- Include `token` field in your request arguments
- Ensure token is valid and not expired

### "Token verification failed"
- Check that User Pool ID and Client ID are correct
- Verify token was issued by your Cognito User Pool
- Ensure token hasn't expired

### Decorator errors during development
- Run `npm run build` in the core and auth packages
- Ensure `@leanmcp/core@^0.2.0` and `@leanmcp/auth` are properly installed
- Check that services are exported from `mcp/*/index.ts` files

## Next Steps

- Add more Slack operations (file upload, user management, etc.)
- Implement rate limiting
- Add request logging and monitoring
- Integrate with real Slack API
- Add role-based access control
- Implement webhook handlers

## License

MIT
