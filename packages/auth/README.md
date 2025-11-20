# @leanmcp/auth

Authentication module for LeanMCP providing token-based authentication decorators and multi-provider support.

## Features

- **@Authenticated decorator** - Protect MCP tools, prompts, and resources with token authentication
- **Multi-provider support** - AWS Cognito, Clerk, Auth0
- **Method or class-level protection** - Apply to individual methods or entire services
- **Automatic token validation** - Validates tokens before method execution
- **Custom error handling** - Detailed error codes for different auth failures
- **Type-safe** - Full TypeScript support with type inference
- **OAuth & Session modes** - Support for both session-based and OAuth refresh token flows

## Installation

```bash
npm install @leanmcp/auth @leanmcp/core
```

### Provider Dependencies

For AWS Cognito:
```bash
npm install @aws-sdk/client-cognito-identity-provider axios jsonwebtoken jwk-to-pem
```

For Clerk:
```bash
npm install axios jsonwebtoken jwk-to-pem
```

For Auth0:
```bash
npm install axios jsonwebtoken jwk-to-pem
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

### Provider Comparison

| Feature | AWS Cognito | Clerk | Auth0 |
|---------|-------------|-------|-------|
| **JWT Verification** | ✅ JWKS | ✅ JWKS | ✅ JWKS |
| **Refresh Tokens** | ✅ Yes | ✅ Yes (OAuth mode) | ✅ Yes |
| **Session Mode** | ❌ No | ✅ Yes (default) | ❌ No |
| **OAuth Mode** | ✅ Yes | ✅ Yes | ✅ Yes |
| **User Data** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Setup Complexity** | Low | Low | Low |

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

**Environment Variables:**
```bash
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
```

### Clerk

Clerk supports both **Session Mode** (default) and **OAuth Mode** (with refresh tokens).

#### Session Mode (Default)

```typescript
const authProvider = new AuthProvider('clerk', {
  frontendApi: 'your-frontend-api.clerk.accounts.dev',
  secretKey: 'sk_test_...'
});
await authProvider.init();
```

**Configuration:**
- `frontendApi` - Your Clerk Frontend API domain
- `secretKey` - Your Clerk Secret Key

**Environment Variables:**
```bash
CLERK_FRONTEND_API=your-frontend-api.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...
```

#### OAuth Mode (Refresh Tokens)

```typescript
const authProvider = new AuthProvider('clerk', {
  frontendApi: 'your-frontend-api.clerk.accounts.dev',
  secretKey: 'sk_test_...',
  clientId: 'your-oauth-client-id',
  clientSecret: 'your-oauth-client-secret',
  redirectUri: 'https://yourapp.com/callback'
});
await authProvider.init();

// Refresh tokens when needed
const newTokens = await authProvider.refreshToken(refreshToken);
// Returns: { access_token, id_token, refresh_token }
```

**OAuth Configuration:**
- `clientId` - OAuth Client ID from Clerk
- `clientSecret` - OAuth Client Secret from Clerk
- `redirectUri` - OAuth redirect URI

**Token Requirements:**
- JWT token from Clerk (ID token or session token)
- Token must be valid and not expired
- Token must be issued by your Clerk instance

**User Data:**
```typescript
const user = await authProvider.getUser(idToken);
// Returns: { sub, email, email_verified, first_name, last_name, attributes }
```

### Auth0

```typescript
const authProvider = new AuthProvider('auth0', {
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret', // Optional for public clients
  audience: 'https://your-api-identifier',
  scopes: 'openid profile email offline_access' // Optional, defaults shown
});
await authProvider.init();

// Refresh tokens when needed
const newTokens = await authProvider.refreshToken(refreshToken);
// Returns: { access_token, id_token, refresh_token, expires_in }
```

**Configuration:**
- `domain` - Your Auth0 tenant domain (e.g., `your-tenant.auth0.com`)
- `clientId` - Your Auth0 Application Client ID
- `clientSecret` - Your Auth0 Application Client Secret (optional for public clients)
- `audience` - Your API identifier (required for API access)
- `scopes` - OAuth scopes (default: `openid profile email offline_access`)

**Environment Variables:**
```bash
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://your-api-identifier
```

**Token Requirements:**
- JWT token from Auth0 (access token or ID token)
- Token must be valid and not expired
- Token must be issued by your Auth0 tenant
- Token must have the correct audience

**User Data:**
```typescript
const user = await authProvider.getUser(idToken);
// Returns: { sub, email, email_verified, name, attributes }
```

**Error Handling:**
Auth0 provider includes detailed error messages:
- `Token has expired` - Token is expired
- `Invalid token signature` - Token signature verification failed
- `Malformed token` - Token format is invalid
- `Invalid token issuer` - Token issuer doesn't match

### More Providers Coming Soon

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

### AWS Cognito
```bash
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
```

### Clerk (Session Mode)
```bash
CLERK_FRONTEND_API=your-frontend-api.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...
```

### Auth0
```bash
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://your-api-identifier
```

## Complete Examples

### AWS Cognito Example

See [examples/slack-with-auth](../../examples/slack-with-auth) for a complete working example.

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

### Clerk Example

```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { AuthProvider, Authenticated } from "@leanmcp/auth";

// Initialize Clerk in Session Mode
const authProvider = new AuthProvider('clerk', {
  frontendApi: process.env.CLERK_FRONTEND_API,
  secretKey: process.env.CLERK_SECRET_KEY
});
await authProvider.init();

// Or initialize in OAuth Mode (with refresh tokens)
const authProviderOAuth = new AuthProvider('clerk', {
  frontendApi: process.env.CLERK_FRONTEND_API,
  secretKey: process.env.CLERK_SECRET_KEY,
  clientId: process.env.CLERK_CLIENT_ID,
  clientSecret: process.env.CLERK_CLIENT_SECRET,
  redirectUri: process.env.CLERK_REDIRECT_URI
});
await authProviderOAuth.init();

@Authenticated(authProvider)
class UserService {
  @Tool({ description: 'Get user profile' })
  async getProfile(input: { userId: string }) {
    // Token is automatically validated
    return { userId: input.userId, name: "John Doe" };
  }
}

const serverFactory = () => {
  const server = new MCPServer({ name: "clerk-server", version: "1.0.0" });
  server.registerService(new UserService());
  return server.getServer();
};

await createHTTPServer(serverFactory, { port: 3000 });
```

### Auth0 Example

```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { AuthProvider, Authenticated } from "@leanmcp/auth";

// Initialize Auth0
const authProvider = new AuthProvider('auth0', {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  audience: process.env.AUTH0_AUDIENCE,
  scopes: 'openid profile email offline_access'
});
await authProvider.init();

@Authenticated(authProvider)
class SecureAPIService {
  @Tool({ description: 'Get sensitive data' })
  async getSensitiveData(input: { dataId: string }) {
    // Token is automatically validated
    return { dataId: input.dataId, data: "Sensitive information" };
  }
  
  @Tool({ description: 'Update user settings' })
  async updateSettings(input: { settings: Record<string, any> }) {
    return { success: true, settings: input.settings };
  }
}

const serverFactory = () => {
  const server = new MCPServer({ name: "auth0-server", version: "1.0.0" });
  server.registerService(new SecureAPIService());
  return server.getServer();
};

await createHTTPServer(serverFactory, { port: 3000 });
```

### Multi-Provider Example

```typescript
import { AuthProvider, Authenticated } from "@leanmcp/auth";

// Initialize multiple providers
const clerkAuth = new AuthProvider('clerk', {
  frontendApi: process.env.CLERK_FRONTEND_API,
  secretKey: process.env.CLERK_SECRET_KEY
});
await clerkAuth.init();

const auth0Auth = new AuthProvider('auth0', {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  audience: process.env.AUTH0_AUDIENCE
});
await auth0Auth.init();

// Use different providers for different services
@Authenticated(clerkAuth)
class UserService {
  @Tool()
  async getUserData(input: { userId: string }) {
    return { userId: input.userId };
  }
}

@Authenticated(auth0Auth)
class AdminService {
  @Tool()
  async getAdminData(input: { adminId: string }) {
    return { adminId: input.adminId };
  }
}
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
8. **Choose the right mode** - Use Session mode for simpler setups, OAuth mode for refresh tokens
9. **Test token expiration** - Ensure your app handles expired tokens gracefully
10. **Monitor JWKS cache** - Providers cache JWKS keys for performance

## Quick Reference

### Initialization Patterns

```typescript
// AWS Cognito
const cognito = new AuthProvider('cognito', {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXX',
  clientId: 'xxx'
});

// Clerk (Session Mode)
const clerk = new AuthProvider('clerk', {
  frontendApi: 'xxx.clerk.accounts.dev',
  secretKey: 'sk_test_xxx'
});

// Clerk (OAuth Mode)
const clerkOAuth = new AuthProvider('clerk', {
  frontendApi: 'xxx.clerk.accounts.dev',
  secretKey: 'sk_test_xxx',
  clientId: 'xxx',
  clientSecret: 'xxx',
  redirectUri: 'https://app.com/callback'
});

// Auth0
const auth0 = new AuthProvider('auth0', {
  domain: 'tenant.auth0.com',
  clientId: 'xxx',
  clientSecret: 'xxx',
  audience: 'https://api-identifier'
});
```

### Common Operations

```typescript
// Initialize
await authProvider.init();

// Verify token
const isValid = await authProvider.verifyToken(token);

// Refresh token (OAuth/Auth0 only)
const newTokens = await authProvider.refreshToken(refreshToken);

// Get user data
const user = await authProvider.getUser(idToken);

// Get provider type
const type = authProvider.getProviderType(); // 'cognito' | 'clerk' | 'auth0'
```

### Decorator Usage

```typescript
// Protect single method
@Authenticated(authProvider)
async myMethod(input: { data: string }) { }

// Protect entire class
@Authenticated(authProvider)
class MyService {
  @Tool() async method1() { }
  @Tool() async method2() { }
}

// Check if authentication required
const required = isAuthenticationRequired(target, 'methodName');

// Get auth provider for method
const provider = getAuthProvider(target, 'methodName');
```

## License

MIT

## Related Packages

- [@leanmcp/core](../core) - Core MCP server functionality
- [@leanmcp/cli](../cli) - CLI tool for creating new projects
- [@leanmcp/utils](../utils) - Utility functions

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
