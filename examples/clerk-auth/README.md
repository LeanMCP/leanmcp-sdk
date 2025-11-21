# Clerk MCP Server Example

This example demonstrates how to build an MCP server with Clerk authentication using the LeanMCP SDK.

## Features

- **Clerk Authentication**: Secure your MCP tools with Clerk
- **Token Management**: Refresh tokens and manage user sessions
- **Protected Endpoints**: Demonstrate authenticated tool access
- **Zero-Config Service Discovery**: Services are automatically discovered from the `./mcp` directory

## Prerequisites

- Node.js 18+ installed
- A Clerk account and application configured
- Clerk Frontend API and Secret Key

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Clerk**:
   - Create a Clerk application at [clerk.com](https://clerk.com)
   - Enable JWT templates in your Clerk dashboard
   - Note your Frontend API (e.g., `your-app.clerk.accounts.dev`)
   - Get your Secret Key from the API Keys section

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Clerk credentials:
   ```env
   CLERK_FRONTEND_API=your-app.clerk.accounts.dev
   CLERK_SECRET_KEY=sk_test_your-secret-key
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
  "refresh_token": "new-refresh-token"
}
```

#### `getAuthInfo`
Get information about the authentication configuration.

**Output**:
```json
{
  "provider": "clerk",
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
  "userId": "user_2abc123xyz",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "imageUrl": "https://img.clerk.com/..."
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
  "userId": "user_2abc123xyz",
  "userEmail": "user@example.com"
}
```

## Authentication Flow

1. **Obtain tokens from Clerk**:
   - Use Clerk's authentication flow (e.g., Sign In, Sign Up)
   - Obtain `access_token`, `id_token`, and `refresh_token` from Clerk session

2. **Use protected tools**:
   - Pass the `id_token` via `_meta.authorization.token` in your MCP request
   - The `@Authenticated` decorator will automatically extract and verify the token
   - No need to include the token in the tool's input parameters

3. **Refresh expired tokens**:
   - When tokens expire, use the `refreshToken` tool with your `refresh_token`
   - Obtain new tokens and continue using protected tools

## Project Structure

```
clerk-auth/
├── mcp/
│   ├── auth/
│   │   └── index.ts          # Authentication service (token refresh, auth info)
│   ├── demo/
│   │   └── index.ts          # Demo service with protected endpoints
│   └── config.ts             # Shared Clerk configuration
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
- Clerk JWT tokens are verified using JWKS (JSON Web Key Set)
- Token verification includes signature validation and issuer verification
- The `authUser` variable is automatically available in protected methods with the decoded JWT payload
- **Concurrency Safe**: `authUser` is implemented as a getter that reads from AsyncLocalStorage, ensuring each request has its own isolated context
- Access user information directly via `authUser.userId`, `authUser.email`, etc.
- Safe for high-concurrency scenarios with thousands of concurrent requests

### Configuration
The `config.ts` file initializes the Clerk authentication provider with your credentials. Services import this shared configuration to access authentication functionality.

## Testing with MCP Inspector

You can test this server using the MCP Inspector:

1. Start the server: `npm run dev`
2. Connect MCP Inspector to `http://localhost:3000/mcp`
3. Try the available tools with appropriate tokens

## Clerk-Specific Features

### JWT Templates
Clerk uses JWT templates to customize token claims. Make sure your JWT template includes:
- `sub` (subject/user ID)
- `email`
- `email_verified`
- `given_name` (first name)
- `family_name` (last name)

### Refresh Tokens
To enable refresh tokens in Clerk:
1. Go to your Clerk Dashboard
2. Navigate to JWT Templates
3. Enable "Refresh tokens" in your template settings

## Security Notes

- Never commit your `.env` file or expose your Clerk credentials
- Always use HTTPS in production
- Implement proper token storage and refresh logic in your client application
- Consider implementing rate limiting and other security measures for production use
- Clerk Secret Keys should be kept secure and never exposed to client-side code

## Learn More

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [LeanMCP SDK Documentation](../../README.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
