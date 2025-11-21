# Auth0 MCP Server Example

This example demonstrates how to build an MCP server with Auth0 authentication using the LeanMCP SDK.

## Features

- **Auth0 Authentication**: Secure your MCP tools with Auth0
- **Token Management**: Refresh tokens and manage user sessions
- **Protected Endpoints**: Demonstrate authenticated tool access
- **Zero-Config Service Discovery**: Services are automatically discovered from the `./mcp` directory

## Prerequisites

- Node.js 18+ installed
- An Auth0 account and application configured
- Auth0 API configured with appropriate permissions

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Auth0**:
   - Create an Auth0 application (Regular Web Application or Single Page Application)
   - Create an Auth0 API
   - Note your Domain, Client ID, Client Secret, and API Audience

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Auth0 credentials:
   ```env
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   AUTH0_AUDIENCE=your-api-audience
   PORT=3000
   ```

## Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Available Tools

### Authentication Service (`AuthService`)

#### `refreshToken`
Refresh an expired access token using a refresh token.

**Input**:
```json
{
  "refreshToken": "your-refresh-token"
}
```

**Output**:
```json
{
  "access_token": "new-access-token",
  "id_token": "new-id-token",
  "expires_in": 86400,
  "token_type": "Bearer",
  "scope": "openid profile email offline_access"
}
```

#### `getAuthInfo`
Get information about the authentication configuration.

**Output**:
```json
{
  "provider": "auth0",
  "authRequired": true,
  "tokenType": "Bearer",
  "instructions": "Include your access token in the 'token' field of authenticated requests..."
}
```

### Demo Service (`DemoService`)

#### `getUserProfile` (Protected)
Get the authenticated user's profile information from the JWT token.

**Authentication**: Token is automatically extracted from `_meta.authorization.token` and decoded. The `authUser` variable is automatically available (via a concurrency-safe getter) with the decoded JWT payload.

**Input**: None required (token is provided automatically)

**Output**:
```json
{
  "userId": "auth0|507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://s.gravatar.com/avatar/...",
  "emailVerified": true
}
```

#### `echo` (Protected)
Echo back a message with authenticated user information from the JWT token.

**Authentication**: Token is automatically extracted from `_meta.authorization.token` and decoded. The `authUser` variable is automatically available (via a concurrency-safe getter) with the decoded JWT payload.

**Input**:
```json
{
  "message": "Hello, World!"
}
```

**Output**:
```json
{
  "message": "Hello, World!",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "userId": "auth0|507f1f77bcf86cd799439011",
  "userEmail": "user@example.com"
}
```

## Authentication Flow

1. **Obtain tokens from Auth0**:
   - Use Auth0's authentication flow (e.g., Authorization Code Flow)
   - Obtain `access_token`, `id_token`, and `refresh_token`

2. **Use protected tools**:
   - Pass the `id_token` via `_meta.authorization.token` in your MCP request
   - The `@Authenticated` decorator will automatically extract and verify the token
   - No need to include the token in the tool's input parameters

3. **Refresh expired tokens**:
   - When tokens expire, use the `refreshToken` tool with your `refresh_token`
   - Obtain new tokens and continue using protected tools

## Project Structure

```
auth0-example/
├── mcp/
│   ├── auth/
│   │   └── index.ts          # Authentication service (token refresh, auth info)
│   ├── demo/
│   │   └── index.ts          # Demo service with protected endpoints
│   └── config.ts             # Shared Auth0 configuration
├── main.ts                   # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## How It Works

### Service Discovery
The MCP server automatically discovers and registers all services exported from files in the `./mcp` directory. Each service class with `@Tool` decorated methods becomes available as MCP tools.

### Authentication
- The `@Authenticated` decorator protects tools that require authentication
- Auth0 JWT tokens are verified using JWKS (JSON Web Key Set)
- Token verification includes signature validation, expiration checks, and issuer/audience verification
- The `authUser` variable is automatically available in protected methods with the decoded JWT payload
- **Concurrency Safe**: `authUser` is implemented as a getter that reads from AsyncLocalStorage, ensuring each request has its own isolated context
- Access user information directly via `authUser.sub`, `authUser.email`, etc.
- Safe for high-concurrency scenarios with thousands of concurrent requests

### Configuration
The `config.ts` file initializes the Auth0 authentication provider with your credentials. Services import this shared configuration to access authentication functionality.

## Testing with MCP Inspector

You can test this server using the MCP Inspector:

1. Start the server: `npm run dev`
2. Connect MCP Inspector to `http://localhost:3000/mcp`
3. Try the available tools with appropriate tokens

## Security Notes

- Never commit your `.env` file or expose your Auth0 credentials
- Always use HTTPS in production
- Implement proper token storage and refresh logic in your client application
- Consider implementing rate limiting and other security measures for production use

## Learn More

- [Auth0 Documentation](https://auth0.com/docs)
- [LeanMCP SDK Documentation](../../README.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
