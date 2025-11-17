# @leanmcp/auth

Authentication module for LeanMCP providing token-based authentication decorators and multi-provider support.

## Features

- **@Authenticated decorator** - Protect MCP tools, prompts, and resources with token authentication
- **Multi-provider support** - AWS Cognito (more providers coming soon)
- **Method or class-level protection** - Apply to individual methods or entire services
- **Automatic token validation** - Validates tokens before method execution
- **Custom error handling** - Detailed error codes for different auth failures
- **Type-safe** - Full TypeScript support with type inference

## Installation

```bash
npm install @leanmcp/auth @leanmcp/core
```

### Provider Dependencies

For AWS Cognito:
```bash
npm install @aws-sdk/client-cognito-identity-provider axios jsonwebtoken jwk-to-pem
```

## Quick Start

### 1. Initialize Auth Provider

```typescript
import { AuthProvider } from "@leanmcp/auth";

// Initialize with AWS Cognito
const authProvider = new AuthProvider('cognito', {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXXXXXXXX',
  clientId: 'your-client-id'
});

await authProvider.init();
```

### 2. Protect Individual Methods

```typescript
import { Tool } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";

export class SentimentService {
  // This method requires authentication
  @Tool({ description: 'Analyze sentiment (requires auth)' })
  @Authenticated(authProvider)
  async analyzeSentiment(input: { text: string }) {
    // Token is automatically validated from _meta.authorization.token
    // Only business arguments are passed to the method
    return { sentiment: 'positive', score: 0.8 };
  }

  // This method is public
  @Tool({ description: 'Get sentiment categories (public)' })
  async getCategories() {
    return { categories: ['positive', 'negative', 'neutral'] };
  }
}
```

### 3. Protect Entire Service

```typescript
import { Authenticated } from "@leanmcp/auth";

// All methods in this class require authentication
@Authenticated(authProvider)
export class SecureService {
  @Tool({ description: 'Protected tool 1' })
  async tool1(input: { data: string }) {
    // All methods require authentication via _meta
  }

  @Tool({ description: 'Protected tool 2' })
  async tool2(input: { data: string }) {
    // All methods require authentication via _meta
  }
}
```

## Usage

### Client Side - Calling Protected Methods

Authentication tokens are passed via the `_meta` field following MCP protocol standards:

```typescript
// With token (succeeds)
await mcpClient.callTool({
  name: "analyzeSentiment",
  arguments: {
    text: "Hello world"
  },
  _meta: {
    authorization: {
      type: "bearer",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
});

// Without token (fails with MISSING_TOKEN error)
await mcpClient.callTool({
  name: "analyzeSentiment",
  arguments: {
    text: "Hello world"
  }
});
```

### Raw MCP Request Format

```json
{
  "method": "tools/call",
  "params": {
    "name": "analyzeSentiment",
    "arguments": {
      "text": "Hello world"
    },
    "_meta": {
      "authorization": {
        "type": "bearer",
        "token": "your-jwt-token"
      }
    }
  }
}
```

### Error Handling

```typescript
import { AuthenticationError } from "@leanmcp/auth";

try {
  await service.protectedMethod({ text: "test" });
} catch (error) {
  if (error instanceof AuthenticationError) {
    switch (error.code) {
      case 'MISSING_TOKEN':
        console.log('No token provided in request');
        break;
      case 'INVALID_TOKEN':
        console.log('Token is invalid or expired');
        break;
      case 'VERIFICATION_FAILED':
        console.log('Token verification failed:', error.message);
        break;
    }
  }
}
```

## Error Codes

| Code | When | Message |
|------|------|---------|
| `MISSING_TOKEN` | No token in `_meta` | "Authentication required. Please provide a valid token in _meta.authorization.token" |
| `INVALID_TOKEN` | Token invalid/expired | "Invalid or expired token. Please authenticate again." |
| `VERIFICATION_FAILED` | Verification error | "Token verification failed: [details]" |

## Supported Auth Providers

### AWS Cognito

```typescript
const authProvider = new AuthProvider('cognito', {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXXXXXXXX',
  clientId: 'your-client-id'
});
await authProvider.init();
```

**Token Requirements:**
- JWT token from AWS Cognito User Pool
- Token must be valid and not expired
- Token must be issued by the configured User Pool

### More Providers Coming Soon

- Clerk
- Auth0
- Firebase Auth
- Custom JWT providers

## API Reference

### AuthProvider

```typescript
class AuthProvider {
  constructor(provider: string, config: any);
  async init(config?: any): Promise<void>;
  async verifyToken(token: string): Promise<boolean>;
  async refreshToken(refreshToken: string, username?: string): Promise<any>;
  async getUser(token: string): Promise<any>;
  getProviderType(): string;
}
```

### @Authenticated Decorator

```typescript
function Authenticated(authProvider: AuthProvider): ClassDecorator | MethodDecorator;
```

Can be applied to:
- **Classes** - Protects all methods in the class
- **Methods** - Protects individual methods

### AuthenticationError

```typescript
class AuthenticationError extends Error {
  code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'VERIFICATION_FAILED';
  constructor(message: string, code: string);
}
```

### Helper Functions

```typescript
// Check if method/class requires authentication
function isAuthenticationRequired(target: any, propertyKey?: string): boolean;

// Get auth provider for method/class
function getAuthProvider(target: any, propertyKey?: string): AuthProvider | undefined;
```

## Environment Variables

For AWS Cognito:
```bash
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
```

## Complete Example

See [examples/slack-with-auth](../../examples/slack-with-auth) for a complete working example with AWS Cognito.

```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { AuthProvider, Authenticated } from "@leanmcp/auth";

// Initialize auth
const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION,
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID
});
await authProvider.init();

// Create service with protected methods
@Authenticated(authProvider)
class MyService {
  @Tool()
  async protectedTool(input: { data: string }) {
    return { result: "Protected data" };
  }
}

// Start server
const serverFactory = () => {
  const server = new MCPServer({ name: "auth-server", version: "1.0.0" });
  server.registerService(new MyService());
  return server.getServer();
};

await createHTTPServer(serverFactory, { port: 3000 });
```

## How It Works

1. **Request arrives** with `_meta.authorization.token`
2. **Decorator intercepts** the method call before execution
3. **Token is extracted** from `_meta.authorization.token`
4. **Token is validated** using the configured auth provider
5. **Method executes** with clean business arguments (no token)
6. **Response returns** to client

**Key Benefits:**
- **Clean separation** - Authentication metadata separate from business data
- **MCP compliant** - Follows standard `_meta` pattern
- **Type-safe** - Input classes don't need token fields
- **Reusable** - Same input classes work for authenticated and public methods

## Best Practices

1. **Always use HTTPS in production** - Tokens should never be sent over HTTP
2. **Store tokens securely** - Use secure storage mechanisms (keychain, encrypted storage)
3. **Implement token refresh** - Use refresh tokens to get new access tokens
4. **Add rate limiting** - Protect against brute force attacks
5. **Log authentication failures** - Monitor for suspicious activity
6. **Use environment variables** - Never hardcode credentials
7. **Use _meta for auth** - Don't include tokens in business arguments

## License

MIT

## Related Packages

- [@leanmcp/core](../core) - Core MCP server functionality
- [@leanmcp/cli](../cli) - CLI tool for creating new projects
- [@leanmcp/utils](../utils) - Utility functions

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
